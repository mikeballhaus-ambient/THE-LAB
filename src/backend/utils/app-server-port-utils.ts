import { exec } from 'child_process';
import os from 'os';
import { promisify } from 'util';

const execAsync = promisify(exec);

/** Ports that must never be killed by app-server tooling (main THE-LAB backend). */
export const PROTECTED_APP_SERVER_PORTS = new Set([3000]);

export type PortUtilLog = (level: 'info' | 'warn' | 'error', message: string) => void;

export function isProtectedAppServerPort(port: number): boolean {
  return PROTECTED_APP_SERVER_PORTS.has(port);
}

/**
 * PIDs listening on a TCP port (LISTEN only; avoids matching :30111 when targeting 3011).
 */
export async function getListeningPidsOnPort(
  port: number,
  log?: PortUtilLog,
  options?: { allowProtected?: boolean },
): Promise<number[]> {
  if (!options?.allowProtected && isProtectedAppServerPort(port)) {
    return [];
  }

  const platform = os.platform();
  const pids = new Set<number>();
  const portToken = new RegExp(`:${port}\\s`);

  try {
    if (platform === 'win32') {
      const { stdout } = await execAsync(`netstat -ano | findstr LISTENING | findstr :${port}`);
      for (const line of stdout.trim().split('\n')) {
        if (!line.trim() || !portToken.test(line)) {
          continue;
        }
        const parts = line.trim().split(/\s+/);
        const pid = Number(parts[parts.length - 1]);
        if (!Number.isNaN(pid) && pid > 0) {
          pids.add(pid);
        }
      }
    } else {
      const { stdout } = await execAsync(`lsof -nP -iTCP:${port} -sTCP:LISTEN -t 2>/dev/null || true`);
      for (const line of stdout.trim().split('\n')) {
        const pid = Number(line.trim());
        if (!Number.isNaN(pid) && pid > 0) {
          pids.add(pid);
        }
      }
    }
  } catch (error: unknown) {
    const err = error as Error & { code?: string | number };
    if (platform === 'win32' && (err.code === 1 || err.code === '1')) {
      return [];
    }
    if (platform !== 'win32' && err.code === 1) {
      return [];
    }
    log?.('warn', `getListeningPidsOnPort port=${port}: ${err.message ?? error}`);
  }

  return [...pids];
}

export async function isAppServerPortInUse(port: number): Promise<boolean> {
  const pids = await getListeningPidsOnPort(port);
  return pids.length > 0;
}

/**
 * Kill process (Windows: full tree via taskkill — needed for npx/tsx app servers).
 */
export async function killProcessTree(pid: number, log?: PortUtilLog): Promise<boolean> {
  const platform = os.platform();

  try {
    if (platform === 'win32') {
      await execAsync(`taskkill /PID ${pid} /T /F`);
      return true;
    }

    process.kill(pid, 'SIGTERM');
    await new Promise((resolve) => setTimeout(resolve, 2000));
    try {
      process.kill(pid, 0);
      log?.('info', `killProcessTree — SIGKILL pid=${pid}`);
      process.kill(pid, 'SIGKILL');
    } catch {
      return true;
    }
    return true;
  } catch (error: unknown) {
    const err = error as Error & { code?: string | number };
    const msg = err.message ?? String(error);
    if (platform === 'win32' && (msg.includes('not found') || msg.includes('No tasks'))) {
      return true;
    }
    if (err.code === 'ESRCH') {
      return true;
    }
    log?.('error', `killProcessTree pid=${pid}: ${msg}`);
    return false;
  }
}

export async function killListenersOnPort(
  port: number,
  log?: PortUtilLog
): Promise<{ pids: number[]; killedAny: boolean }> {
  if (isProtectedAppServerPort(port)) {
    log?.('error', `killListenersOnPort — blocked protected port ${port}`);
    return { pids: [], killedAny: false };
  }

  const pids = await getListeningPidsOnPort(port, log);
  if (pids.length === 0) {
    log?.('info', `killListenersOnPort — no listeners on port ${port}`);
    return { pids: [], killedAny: false };
  }

  let killedAny = false;
  for (const pid of pids) {
    log?.('info', `killListenersOnPort — stopping pid=${pid} port=${port}`);
    if (await killProcessTree(pid, log)) {
      killedAny = true;
    }
  }

  return { pids, killedAny };
}

export async function waitUntilAppServerPortFree(port: number, timeoutMs: number): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (!(await isAppServerPortInUse(port))) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  return false;
}
