import { ChildProcess } from 'child_process';
import { DependencyGraph } from '../shared/services/DependencyGraph';
import { UserService } from './db/Auth/auth-service';
import { appsService } from './db/Apps/apps-service';
import { AppLaunchResult, IApp } from '../shared/types/app/app.d';
import path from 'path';
import {
  isProtectedAppServerPort,
  getListeningPidsOnPort as getListeningPidsOnPortUtil,
  killListenersOnPort,
  killProcessTree as killProcessTreeUtil,
  waitUntilAppServerPortFree,
  isAppServerPortInUse,
} from './utils/app-server-port-utils';
import { resolveLabAppServiceToken } from '@/shared/server/lab-app-service-token';
import {
  resolveLabAppServerWarmupScope,
  resolveWarmupAppIds,
  shouldWarmUpAppServer,
} from '@/shared/config/lab-app-server-warmup';

export type LabAppServerWarmupAttemptStatus = 'launched' | 'already_healthy' | 'failed';

export interface LabAppServerWarmupAttempt {
  appId: string;
  status: LabAppServerWarmupAttemptStatus;
  error?: string;
}

export interface LabAppServerWarmupSummary {
  launched: number;
  skippedHealthy: number;
  failed: number;
  attempts: LabAppServerWarmupAttempt[];
}

/**
 * Logger interface for logging methods.
 */
interface Logger {
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
}

/**
 * Process info interface for tracking running process resources
 */
interface ProcessInfo {
  process: ChildProcess | null;
  pid: number | null;  // Store PID for force kill
  cpuTime: number;
  memoryUsage: number;
  port: number | null;
}

/**
 * Dynamic import for child_process (Node.js only)
 */
let childProcessModule: Promise<typeof import('child_process')>;

if (typeof window === 'undefined') {
  childProcessModule = import('child_process');
} else {
  childProcessModule = Promise.resolve({} as unknown as typeof import('child_process'));
}

/**
 * AppManager - Manages the lifecycle of browser and server apps
 *
 * Provides unified interface for:
 * - Spawning and monitoring server apps
 * - Resource limits and cleanup
 * - Graceful shutdown
 * - Authorization via access control
 */


export class AppManager {
  /**
   * App servers are one process per registered port, shared by all users.
   * Teardown closes a user's UI only; launch reuses via `/health` adoption — never kills peers.
   * Set `APP_SERVER_ALLOW_KILL=1` only for local dev orphan cleanup (launch + API teardown).
   */
  private static allowKillAppServerListeners(): boolean {
    return process.env.APP_SERVER_ALLOW_KILL === '1';
  }

  private static sharedAppServerProcesses(): boolean {
    return !AppManager.allowKillAppServerListeners();
  }

  private runningApps: Map<string, ProcessInfo>;
  private logger: Logger;
  private readonly pidForPort: Map<number, number>; // port -> pid cache
  private dependencyGraph: DependencyGraph | null = null;
  private startupOrder: string[] = [];
  /** Coalesce concurrent launch requests for the same app (avoids double spawn / kill mid-request). */
  private launchInFlight: Map<string, Promise<boolean>> = new Map();

  /**
   * Concurrency counter for tracking active requests
   */
  private concurrencyCount: number = 0;

  constructor(logger?: Logger) {
    this.runningApps = new Map();
    this.logger = logger || console;
    this.pidForPort = new Map();
  }

  /**
   * Increment concurrency counter
   */
  incrementConcurrency(): void {
    this.concurrencyCount++;
  }

  /**
   * Decrement concurrency counter
   */
  decrementConcurrency(): void {
    this.concurrencyCount--;
  }

  /**
   * Get current concurrency count
   */
  getConcurrencyCount(): number {
    return this.concurrencyCount;
  }

  /** Platform (AppManager) log — always use [AppManager] prefix. */
  private logPlatform(level: 'info' | 'warn' | 'error', message: string): void {
    const prefixed = message.startsWith('[AppManager') ? message : `[AppManager] ${message}`;
    this.logger[level](prefixed);
  }

  /**
   * Relay a line from a spawned app server process (stdout/stderr).
   * Distinct from AppManager platform logs so terminals are easy to scan.
   */
  private logAppServerLine(
    appId: string,
    port: number,
    stream: 'stdout' | 'stderr',
    line: string
  ): void {
    const prefix = `[AppServer:${appId}:${port}:${stream}]`;
    const body = line.trimEnd();
    if (body.length === 0) return;
    if (stream === 'stderr') {
      this.logger.warn(`${prefix} ${body}`);
    } else {
      this.logger.info(`${prefix} ${body}`);
    }
  }

  /** Buffer partial lines from chunked process output, then emit with logAppServerLine. */
  private createAppServerStreamLogger(
    appId: string,
    port: number
  ): {
    onChunk: (stream: 'stdout' | 'stderr', data: Buffer) => string;
    flush: () => void;
  } {
    const partial: Record<'stdout' | 'stderr', string> = { stdout: '', stderr: '' };

    const onChunk = (stream: 'stdout' | 'stderr', data: Buffer): string => {
      partial[stream] += data.toString();
      const parts = partial[stream].split(/\r?\n/);
      partial[stream] = parts.pop() ?? '';
      let combined = '';
      for (const line of parts) {
        this.logAppServerLine(appId, port, stream, line);
        combined += line;
      }
      return combined;
    };

    const flush = (): void => {
      for (const stream of ['stdout', 'stderr'] as const) {
        if (partial[stream].length > 0) {
          this.logAppServerLine(appId, port, stream, partial[stream]);
          partial[stream] = '';
        }
      }
    };

    return { onChunk, flush };
  }

  /**
   * Initialize the app manager by loading apps from SQLite and building dependency graph
   */
  async initialize(): Promise<void> {
    // Load apps from SQLite database
    const apps: IApp[] = appsService.getAllApps();

    this.logPlatform('info', `Initializing dependency graph with ${apps.length} apps from SQLite`);
    this.dependencyGraph = new DependencyGraph(apps);

    // Check for circular dependencies
    if (this.dependencyGraph.hasCycle()) {
      this.logPlatform('error', 'Circular dependencies detected!');
      throw new Error('Invalid app configuration: circular dependencies');
    }

    // Get startup order
    this.startupOrder = this.dependencyGraph.getStartupOrder();
    this.logPlatform('info', `Startup order computed: ${this.startupOrder.join(', ')}`);
  }

  /**
   * Launch a server app with process management
   * @param appId Unique app identifier
   * @param entry Path to the app entry file
   * @param port Port for the server
   * @param userId Optional user ID for authorization check (Phase 3)
   * @returns true if successfully launched
   */
  async launchServerApp(appId: string, entry: string, port: number, userId: number | number): Promise<boolean> {
    const inFlight = this.launchInFlight.get(appId);
    if (inFlight) {
      this.logPlatform('info', `launchServerApp — awaiting in-flight launch app=${appId} port=${port}`);
      return inFlight;
    }

    const launchTask = this.launchServerAppOnce(appId, entry, port, userId);
    this.launchInFlight.set(appId, launchTask);
    try {
      return await launchTask;
    } finally {
      this.launchInFlight.delete(appId);
    }
  }

  /**
   * Single launch attempt (do not call directly — use launchServerApp).
   */
  private async launchServerAppOnce(appId: string, entry: string, port: number, userId: number | number): Promise<boolean> {
    this.logPlatform('info', `launchServerApp — request app=${appId} entry=${entry} port=${port}`);

    // NEW: Check and ensure dependencies are running first (ONLY for server apps)
    // Hybrid apps are launched by the UI via AppLifecycle, so skip dependency check here
    // Query for the app to get its type
    const app = appsService.getAppById(appId);

    if (!app) return false;

    if (!app.isEnabled) {
      this.logPlatform('warn', `launchServerApp — app disabled app=${appId}`);
      return false;
    }

    // NEW: Ensure all dependencies are running before launching
    if (app && app.type === 'server') {
      const dependencyLaunchResults = await this.ensureAllDependenciesRunning(appId, userId);

      if (dependencyLaunchResults.filter(_ => !_.success).length > 0) {
        this.logger.error(`One or more dependencies for app with ID '${app.id}' failed`);
        return false
      }
    }

    // Phase 3: Check authorization if userId provided
    let authError: Error | null = null;
    if (userId) {
      const user = UserService.getInstance().getUserById(userId)

      // Check if user has canLaunchApps permission
      const userHasAppLaunchPermissionPermission = user && user.permissions && user.permissions.app && user.permissions.app.find(_ => _.appId == appId && _.canLaunch);
      const userHasGlobalLaunchPermissionPermission = user && user.permissions && user.permissions.global && user.permissions.global.canLaunchApps;

      if (!userHasAppLaunchPermissionPermission && !userHasGlobalLaunchPermissionPermission) {
        this.logger.error(`[AppManager] User ${userId} does not have permission to launch app ${appId}`);
        authError = new Error(`User ${userId} lacks canLaunchApps permission`);
      }
    }

    if (authError) {
      this.logger.error(`${authError.message}`);
      return false;
    }

    this.incrementConcurrency();
    let success = false;
    try {
      let _isServerAppRunning = false;
      if (this.runningApps.has(appId)) {
        _isServerAppRunning = true;
      }

      let curPortInUse = await this.isPortInUse(port);

      if (_isServerAppRunning && curPortInUse) success = true

      if (!success) {

        if (curPortInUse && !_isServerAppRunning) {
          const adopted = await this.adoptHealthyServerOnPort(appId, app, port);
          if (adopted) {
            success = true;
          } else if (AppManager.sharedAppServerProcesses()) {
            this.logPlatform(
              'warn',
              `launchServerApp — port ${port} in use and not adoptable (/health failed); shared-server policy will not kill listeners app=${appId}`
            );
          } else {
            const killResult = await this.waitForProcessExit(port, 5000);

            if (killResult) {
              _isServerAppRunning = false;
              curPortInUse = false;
              this.logPlatform(
                'info',
                `launchServerApp — cleared unhealthy/orphan listener on port ${port} before spawn app=${appId}`
              );
            } else {
              this.logPlatform(
                'warn',
                `launchServerApp — port ${port} in use and could not be cleared; spawn may fail app=${appId}`
              );
            }
          }
        }

        if (!success) {
          if (await this.isPortInUse(port)) {
            this.logPlatform(
              'warn',
              `launchServerApp — abort spawn; port ${port} still in use app=${appId}`
            );
            return false;
          }

        const resolvedEntry = path.join(process.cwd(), entry);
        const { spawn: serverSpawn } = await childProcessModule;
        this.logPlatform('info', `launchServerApp — spawning process app=${appId} port=${port}`);
        // Spawn the process with npx tsx
        const processApp = serverSpawn('npx', ['tsx', resolvedEntry], {
          stdio: ['inherit', 'pipe', 'pipe'], // inherit stdin, pipe others
          shell: process.platform === 'win32', // Only use shell on Windows
          env: {
            ...process.env,
            PORT: port.toString(),
            BASEURL: process.env.VITE_API_BASE_URL,
            LAB_APP_ID: appId,
            LAB_APP_SERVICE_TOKEN: resolveLabAppServiceToken(),
          },
          cwd: process.cwd()
        });

        const streamLogger = this.createAppServerStreamLogger(appId, port);

        // Track readiness using a promise (with timeout so /app/launch does not hang forever)
        const readinessFromLogs = new Promise<boolean>((resolve) => {
          const onStdData = (stream: 'stdout' | 'stderr', data: Buffer) => {
            streamLogger.onChunk(stream, data);
            if (data.toString().includes('Server running')) {
              resolve(true);
            }
          };

          processApp.stdout.on('data', (d: Buffer) => {
            onStdData('stdout', d);
          });

          processApp.stderr.on('data', (d: Buffer) => {
            onStdData('stderr', d);
          });
        });

        const readinessTimeout = new Promise<boolean>((resolve) => {
          setTimeout(() => resolve(false), 45000);
        });

        const readinessPromise = Promise.race([readinessFromLogs, readinessTimeout]);

        // Handle process errors
        processApp.on('error', (error: Error) => {
          this.logPlatform('error', `launchServerApp — failed to launch app=${appId}: ${error.message}`);
          this.runningApps.delete(appId);
          this.pidForPort.delete(port);
        });

        // Handle process close
        processApp.on('close', (code: number) => {
          streamLogger.flush();
          this.logPlatform('info', `launchServerApp — app=${appId} exited code=${code}`);
          this.runningApps.delete(appId);
          this.pidForPort.delete(port);
        });

        // Wait for the process to be ready
        const serverReady = await readinessPromise;
        if (serverReady) {
          const processInfo: ProcessInfo = {
            process: processApp,
            pid: process.pid || null,
            cpuTime: 0,
            memoryUsage: 0,
            port,
          };
          this.runningApps.set(appId, processInfo);
          this.pidForPort.set(port, process.pid || 0);
          success = true
        } else {
          success = false
        }
        }
      }
    } catch (error: unknown) {
      this.logPlatform(
        'error',
        `launchServerApp — failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      success = false;
    } finally {
      return success;
    }
  }


  async teardownServerApp(appId: string, port: number, userId: number | number): Promise<void> {
    if (this.isProtectedPort(port)) {
      this.logPlatform('error', `teardownServerApp — blocked protected port ${port}`);
      return;
    }

    if (AppManager.sharedAppServerProcesses()) {
      this.logPlatform(
        'info',
        `teardownServerApp — no-op (shared app server); app=${appId} port=${port} left running for other users`
      );
      return;
    }

    let authError: Error | null = null;
    if (userId) {
      const user = UserService.getInstance().getUserById(userId)

      // Check if user has canTeardownApps permission
      const userHasAppTeardownPermission = user && user.permissions && user.permissions.app && user.permissions.app.find(_ => _.appId == appId && _.canTeardown);
      const userHasGlobalTeardownPermission = user && user.permissions && user.permissions.global && user.permissions.global.canTeardownApps;

      if (!userHasAppTeardownPermission && !userHasGlobalTeardownPermission) {
        this.logger.error(`[AppManager] User ${userId} does not have permission to teardown app ${appId}`);
        authError = new Error(`User ${userId} lacks canTeardownApps permission`);
      }
    }

    if (authError) {
      //this.releaseLock();
      this.logger.error(`${authError.message}`);
      return;
    }

    await this.stopAppServerListener(appId, port, 'teardownServerApp');
  }

  /**
   * Stop the app server process when deleting an app (skips teardown permission; used by App Management MCP).
   */
  async stopAppServerForDeletion(appId: string, port: number): Promise<void> {
    if (AppManager.sharedAppServerProcesses()) {
      return;
    }
    await this.stopAppServerListener(appId, port, 'stopAppServerForDeletion');
  }

  private async stopAppServerListener(
    appId: string,
    port: number,
    logLabel: 'teardownServerApp' | 'stopAppServerForDeletion',
  ): Promise<void> {
    if (this.isProtectedPort(port)) {
      this.logPlatform('error', `${logLabel} — blocked protected port ${port}`);
      return;
    }

    try {
      this.logger.info(`[AppManager.${logLabel}] Received stop request for app: ${appId}`);

      const isTrackedRunning = this.runningApps.has(appId);

      let isActuallyRunning = false;
      if (!isTrackedRunning) {
        this.logger.info(`[AppManager.${logLabel}] App ${appId} not tracked, checking if port ${port} is in use`);
        const portInUse = await this.isPortInUse(port);
        if (portInUse) {
          isActuallyRunning = true;
          this.logger.info(`[AppManager.${logLabel}] Port ${port} is in use, orphaned process detected`);
        } else {
          this.logger.info(`[AppManager.${logLabel}] Port ${port} not in use, app was already stopped`);
          return;
        }
      } else {
        this.logger.info(`[AppManager.${logLabel}] App ${appId} is tracked as running`);
        isActuallyRunning = true;
      }

      if (isActuallyRunning) {
        this.logPlatform('info', `${logLabel} — proceeding app=${appId} port=${port}`);
        await this.stopTrackedChildProcess(appId);

        let freed = await this.waitUntilPortFree(port, 4000);
        if (!freed) {
          await this.killPort(port);
          freed = await this.waitUntilPortFree(port, 4000);
        }

        if (freed) {
          this.logPlatform('info', `${logLabel} — success app=${appId} port=${port}`);
          if (isTrackedRunning) {
            this.runningApps.delete(appId);
          }
          this.pidForPort.delete(port);
        } else {
          this.logPlatform('warn', `${logLabel} — port ${port} still in use app=${appId}`);
        }
      }
    } catch (error) {
      this.logPlatform('error', `${logLabel} — app=${appId}: ${error instanceof Error ? error.message : error}`);
    }
  }

  /**
   * Recursively launch and wait for all dependencies to be healthy
   */
  private async ensureAllDependenciesRunning(appId: string, userId: number): Promise<AppLaunchResult[]> {
    if (!this.dependencyGraph) return [];
    const { orderDependenciesForLaunch } = await import('@/shared/config/platform-app-dependency-order');
    const deps = orderDependenciesForLaunch(this.dependencyGraph.getAppDependencies(appId));
    if (deps.length === 0) return [];

    const results: AppLaunchResult[] = [];
    for (const depId of deps) {
      const app = appsService.getAppById(depId);
      if (!app) {
        results.push({ appId: depId, success: false, error: 'Unable to resolve dependency appId' });
        continue;
      }
      try {
        const healthCheck = await this.isDependencyHealthy(app);
        if (!healthCheck) {
          if (app.type === 'server' || app.type === 'hybrid') {
            const launchResult = await this.launchServerApp(
              app.id,
              app.server?.entry || '',
              app.server?.port || 0,
              userId,
            );
            results.push({
              appId: app.id,
              success: launchResult ? true : await this.waitForServerHealthy(app),
            });
          } else {
            results.push({ appId: app.id, success: false, error: 'Unable to launch browser-only dependency' });
          }
        } else {
          results.push({ appId: app.id, success: true });
        }
      } catch (error: unknown) {
        results.push({
          appId: app.id,
          success: false,
          error: error instanceof Error ? error.message : 'Dependency launch failed',
        });
      }
    }
    return results;
  }

  /**
   * Check if a dependency is running and healthy
   */
  private async isDependencyHealthy(app: IApp): Promise<boolean> {
    if (!app || !app.server?.port) return false;

    return await this.verifyServerHealth(app);
  }

  /**
 * Verify server health by making HTTP request to the server
 * @param appId - App identifier for logging
 * @param port - Server port
 * @returns Promise resolving to true if server is healthy
 */
  private async verifyServerHealth(app: IApp): Promise<boolean> {

    try {
      const response = await fetch(`${process.env.VITE_API_BASE_URL}:${app.server?.port}/health`);
      return response.ok;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logPlatform('warn', `verifyServerHealth — app=${app.id} port=${app.server?.port}: ${message}`);
      return false;
    }
  }

  /**
   * Port is listening but AppManager lost track (e.g. dashboard reload). Reuse if /health passes.
   */
  private async adoptHealthyServerOnPort(appId: string, app: IApp, port: number): Promise<boolean> {
    const healthy = await this.verifyServerHealth(app);
    if (!healthy) {
      return false;
    }

    const pid = await this.getPidForPortExternal(port);
    this.runningApps.set(appId, {
      process: null,
      pid,
      cpuTime: 0,
      memoryUsage: 0,
      port,
    });
    if (pid) {
      this.pidForPort.set(port, pid);
    }

    this.logPlatform(
      'info',
      `launchServerApp — adopted existing healthy server app=${appId} port=${port} pid=${pid ?? 'unknown'}`
    );
    return true;
  }

  /**
   * Wait for a dependency to become healthy (with timeout)
   */
  private async waitForServerHealthy(app: IApp): Promise<boolean> {
    const maxAttempts = 30;
    const attemptDelay = 1000; // 1 second between attempts

    for (let i = 0; i < maxAttempts; i++) {
      await new Promise(resolve => setTimeout(resolve, attemptDelay));
      const nextHealthCheck = await this.isDependencyHealthy(app)
      this.logPlatform('info', `waitForServerHealthy — check ${i + 1}/${maxAttempts} app=${app.id} port=${app.server?.port} ${nextHealthCheck ? 'ok' : 'failed'}`);
      if (nextHealthCheck) {
        this.logPlatform('info', `Dependency healthy app=${app.id}`);
        return true
      }
    }

    return false
  }

  /**
   * Get port for an app ID
   */
  private getPortForAppId(appId: string): number | null {
    // Query the apps table or use a map to track ports
    const app = appsService.getAppById(appId);
    return app?.server?.port || null;
  }

  private isProtectedPort(port: number): boolean {
    return isProtectedAppServerPort(port);
  }

  private portUtilLog(level: 'info' | 'warn' | 'error', message: string): void {
    this.logPlatform(level, message);
  }

  private async getListeningPidsOnPort(port: number): Promise<number[]> {
    return getListeningPidsOnPortUtil(port, (level, msg) => this.portUtilLog(level, msg));
  }

  /** Gracefully stop a child we spawned before killing by port. */
  private async stopTrackedChildProcess(appId: string): Promise<void> {
    const info = this.runningApps.get(appId);
    const child = info?.process;
    if (!child || child.killed) {
      return;
    }

    try {
      child.kill('SIGTERM');
    } catch (error: unknown) {
      this.logPlatform(
        'warn',
        `stopTrackedChildProcess — SIGTERM app=${appId} pid=${child.pid}: ${error instanceof Error ? error.message : error}`
      );
    }

    await new Promise((resolve) => setTimeout(resolve, 1500));
  }

  private async killProcessTree(pid: number): Promise<boolean> {
    return killProcessTreeUtil(pid, (level, msg) => this.portUtilLog(level, msg));
  }

  /**
   * Poll until no TCP listener remains on the port (does not kill).
   */
  private async waitUntilPortFree(port: number, timeoutMs: number): Promise<boolean> {
    const freed = await waitUntilAppServerPortFree(port, timeoutMs);
    if (freed) {
      this.pidForPort.delete(port);
    }
    return freed;
  }

  /**
   * Kill listeners on a port and wait until the port is free (or timeout).
   */
  private async waitForProcessExit(port: number, timeoutMs: number): Promise<boolean> {
    if (this.isProtectedPort(port)) {
      this.logPlatform('error', `waitForProcessExit — blocked protected port ${port}`);
      return false;
    }

    await this.killPort(port);
    const freed = await this.waitUntilPortFree(port, timeoutMs);
    if (!freed) {
      this.logPlatform('warn', `waitForProcessExit — port ${port} still in use after ${timeoutMs}ms`);
    }
    return freed;
  }

  protected async isPortInUse(port: number): Promise<boolean> {
    return isAppServerPortInUse(port);
  }

  async killPort(port: number): Promise<boolean> {
    const { killedAny } = await killListenersOnPort(port, (level, msg) => this.portUtilLog(level, msg));
    this.pidForPort.delete(port);
    return killedAny;
  }

  async getPidForPortExternal(port: number): Promise<number | null> {
    const cachedPid = this.pidForPort.get(port);
    if (cachedPid) {
      return cachedPid;
    }

    const pids = await this.getListeningPidsOnPort(port);
    const pid = pids[0] ?? null;
    if (pid) {
      this.pidForPort.set(port, pid);
    }
    return pid;
  }

  /** @deprecated Use killProcessTree — kept for any external callers */
  async killPid(pid: number): Promise<boolean> {
    return this.killProcessTree(pid);
  }

  getRunningAppInfo(appId: string): ProcessInfo | undefined {
    return this.runningApps.get(appId);
  }

  getRunningAppIds(): string[] {
    return Array.from(this.runningApps.keys());
  }

  getRunningAppCount(): number {
    return this.runningApps.size;
  }

  getStartupOrder(): string[] {
    return this.startupOrder;
  }

  hasCircularDependencies(): boolean {
    if (!this.dependencyGraph) return false;
    return this.dependencyGraph.hasCycle();
  }

  getDependencyGraph(): DependencyGraph | null {
    return this.dependencyGraph;
  }

  /** True when the app's server responds on `/health` (includes adopted listeners). */
  async isAppServerHealthyById(appId: string): Promise<boolean> {
    const app = appsService.getAppById(appId);
    if (!app?.server?.port) {
      return false;
    }
    return this.verifyServerHealth(app);
  }

  /**
   * Platform warm-up: start the platform product apps and their dependency closure so
   * connectors and integrations are reachable without a user opening each app in the UI.
   * Uses userId 0 (skips per-user launch permission checks).
   *
   * Scope is controlled by `LAB_APP_SERVER_WARMUP_SCOPE`:
   * - `platform` (default) — protected platform apps + transitive deps; catalog apps start on demand
   * - `all` — every enabled hybrid/server app (legacy behaviour)
   *
   * Catalog app servers are still started on demand by `launchServerApp` when a user opens
   * the app, or by `resolve_launch_deps` when a host app needs an integration provider.
   */
  async warmUpEnabledAppServers(): Promise<LabAppServerWarmupSummary> {
    const summary: LabAppServerWarmupSummary = {
      launched: 0,
      skippedHealthy: 0,
      failed: 0,
      attempts: [],
    };

    if (!this.dependencyGraph) {
      this.logPlatform('warn', 'warmUp — dependency graph not initialized; skipping');
      return summary;
    }

    const scope = resolveLabAppServerWarmupScope();
    const warmupAppIds = resolveWarmupAppIds(appsService.getAllApps(), scope);

    this.logPlatform(
      'info',
      `warmUp — starting scope=${scope} (${warmupAppIds.size}/${this.startupOrder.length} apps in dependency order)`,
    );

    for (const appId of this.startupOrder) {
      if (!warmupAppIds.has(appId)) {
        continue;
      }
      const app = appsService.getAppById(appId);
      if (!app || !shouldWarmUpAppServer(app)) {
        continue;
      }

      try {
        if (await this.verifyServerHealth(app)) {
          summary.skippedHealthy += 1;
          summary.attempts.push({ appId, status: 'already_healthy' });
          this.logPlatform('info', `warmUp — skip ${appId} (healthy on port ${app.server?.port})`);
          continue;
        }

        const ok = await this.launchServerApp(
          app.id,
          app.server?.entry ?? '',
          app.server?.port ?? 0,
          0,
        );
        const healthy = ok || (await this.waitForServerHealthy(app));
        if (healthy) {
          summary.launched += 1;
          summary.attempts.push({ appId, status: 'launched' });
          this.logPlatform('info', `warmUp — ready app=${appId} port=${app.server?.port}`);
        } else {
          summary.failed += 1;
          summary.attempts.push({ appId, status: 'failed', error: 'launch or health check failed' });
          this.logPlatform('warn', `warmUp — failed app=${appId} port=${app.server?.port}`);
        }
      } catch (error: unknown) {
        summary.failed += 1;
        const message = error instanceof Error ? error.message : String(error);
        summary.attempts.push({ appId, status: 'failed', error: message });
        this.logPlatform('warn', `warmUp — error app=${appId}: ${message}`);
      }
    }

    this.logPlatform(
      'info',
      `warmUp — complete launched=${summary.launched} already_healthy=${summary.skippedHealthy} failed=${summary.failed}`,
    );
    return summary;
  }

  /** @deprecated Use warmUpEnabledAppServers */
  async launchAll(): Promise<void> {
    await this.warmUpEnabledAppServers();
  }

  clearPortCache(): void {
    this.pidForPort.clear();
  }
}

