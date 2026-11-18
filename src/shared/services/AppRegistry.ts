/**
 * AppRegistry - Unified App Registry Service
 * 
 * Manages both browser and server apps through a unified interface.
 * Loads app definitions from the SQLite database and maintains runtime state
 * for both app types.
 * 
 * This registry provides a single interface for:
 * - Discovering available apps (browser + server)
 * - Querying app status (running/not running)
 * - Starting and stopping apps
 * - Managing app lifecycle
 */

import type { Component } from 'vue';
import { tryGetPlatformAppsCatalog } from './platform-apps-catalog';
import { loadAppRootComponent } from './ComponentLoader';
import { getDefaultServerAppComponent } from '../components/default-server-app-ui';
import { IApp, AppMetadata, RuntimeApp } from '../types/app/app.d';
import { ServerAppRegistry } from './ServerAppRegistry';

/**
 * Creates a proper AppMetadata object with required properties.
 * @param metadata Partial metadata object from configuration (may be missing properties)
 * @returns Fully populated AppMetadata object
 */
function createAppMetadata(metadata?: AppMetadata | Record<string, unknown>): AppMetadata {
  const meta = metadata && typeof metadata === 'object' ? metadata : undefined;
  const category =
    meta && typeof (meta as AppMetadata).category === 'string'
      ? (meta as AppMetadata).category
      : 'general';
  const author =
    meta && typeof (meta as AppMetadata).author === 'string'
      ? (meta as AppMetadata).author
      : 'Unknown';
  const version =
    meta && typeof (meta as AppMetadata).version === 'string'
      ? (meta as AppMetadata).version
      : '1.0.0';
  const tags =
    meta && Array.isArray((meta as AppMetadata).tags)
      ? (meta as AppMetadata).tags
      : ['app'];
  return { category, author, version, tags };
}

class AppRegistryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AppRegistryError';
  }
}

export class AppRegistry {
  static _instance: AppRegistry | null = null;
  private apps: Map<string, RuntimeApp>;
  private running: Set<string>;
  private serverRegistry: ServerAppRegistry;
  private loaded: boolean = false;

  constructor() {
    this.apps = new Map();
    this.running = new Set();
    this.serverRegistry = ServerAppRegistry.getInstance();
    this.loaded = false;
  }

  /**
   * Get the singleton instance of AppRegistry
   * @throws Error if instance has not been initialized
   */
  public static getInstance(): AppRegistry {
    if (!AppRegistry._instance) {
      AppRegistry._instance = new AppRegistry()
    }
    return AppRegistry._instance
  }

  /**
   * Initialize the AppRegistry and load apps from the SQLite database
   * Should be called during application startup
   */
  public init(): void {
    if (AppRegistry._instance?.loaded) {
      console.log('[AppRegistry] Apps already loaded.');
      return;
    }

    try {
      const catalog = tryGetPlatformAppsCatalog();
      if (!catalog) {
        console.warn(
          '[AppRegistry] PlatformAppsCatalog not registered; skipping DB load (client should use hydrateFromSocket).',
        );
        if (AppRegistry._instance) {
          AppRegistry._instance.loaded = true;
        }
        return;
      }

      const apps = catalog.getAllApps();

      if (apps.length === 0) {
        console.warn('[AppRegistry] No apps loaded from database.');
        console.warn('[AppRegistry] Apps may need manual registration.');
        if (AppRegistry._instance) {
          AppRegistry._instance.loaded = true;
        }
        return;
      }

      // Process each app definition - unified registration for browser and/or server apps
      for (const appDef of apps) {
        if (!appDef.isEnabled) {
          continue;
        }

        try {
          // Unified app registration handles both browser and server configs
          this._registerAppDef(appDef);
        } catch (error: unknown) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          console.error(`[AppRegistry]: Failed to register app:`, errorMsg);
        }
      }

      if (AppRegistry._instance) {
        AppRegistry._instance.loaded = true;
        console.log(`[AppRegistry] Loaded ${AppRegistry._instance.apps.size} apps.`);
      }
    } catch (error: unknown) {
      console.error('[AppRegistry]: Failed to load apps from database:', error);
    }
  }

  /**
   * Register an app definition that may contain browser and/or server configurations
   * If both are present, a single RuntimeApp is created with both componentPath and server configs
   * This allows apps with hybrid configurations to be properly represented
   */
  private _registerAppDef(appDef: IApp): void {
    // For hybrid apps, register in both ServerAppRegistry and main apps Map
    // For server apps, register only in ServerAppRegistry
    // For browser apps, register only in main apps Map
    if (appDef.type === 'hybrid' && appDef.server?.entry) {
      const serverConfig = {
        entry: appDef.server.entry,
        port: appDef.server.port || 4000,
      };
      this.serverRegistry.register(appDef.id, serverConfig, createAppMetadata(appDef.metadata));
    } else if (appDef.type === 'server' && appDef.server?.entry) {
      const serverConfig = {
        entry: appDef.server.entry,
        port: appDef.server.port || 4000,
      };
      this.serverRegistry.register(appDef.id, serverConfig, createAppMetadata(appDef.metadata));
    }

    try {
      const app: RuntimeApp = {
        id: appDef.id,
        name: appDef.name,
        description: appDef.description,
        faIcon: appDef.faIcon || (appDef.server ? 'fa-server' : 'fa-question-circle'),
        order: appDef.order || 999,
        componentPath: appDef.componentPath,
        server: appDef.server,
        metadata: createAppMetadata(appDef.metadata),
        isEnabled: appDef.isEnabled !== false,
        isServerSideEnabled: appDef.type === 'hybrid',
        instance: undefined,
        dependencies: appDef.dependencies || [],
        optionalDependencies: appDef.optionalDependencies || [],
        version: appDef.version || '1.0.0',
        changelog: appDef.changelog || [],
        requiresPort: appDef.server?.port,
        latestVersion: undefined,
        isUpdateAvailable: false,
        isSystem: appDef.isSystem === true,
        type: appDef.type,
        reload: () => { },
        emitReload: () => { },
      };

      // register() is async but has no side effects - just calls Map.set
      this.register(app);
      console.log(`[AppRegistry] Registered: ${appDef.id} (${appDef.type} app)`);
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      throw new AppRegistryError(`Failed to load component for ${appDef.type} app '${appDef.id}': ${errorMsg}`);
    }
  }

  /**
   * Register an app instance
   * @param app App instance to register
   * @throws AppRegistryError if app is not valid
   */
  public async register(app: RuntimeApp): Promise<void> {
    if (!app.id || !app.name) {
      throw new AppRegistryError('Invalid app: missing id or name');
    }

    this.apps.set(app.id, app);

    if (this.running.has(app.id)) {
      this.running.add(app.id);
    }

    console.log(
      `[AppRegistry] Registered app: ${app.id} ${app.server ? '(hybrid)' : (app.component ? '(browser)' : '(server)')} `
    );
  }

  /**
   * Unregister an app
   * @param id App ID to unregister
   */
  public async unregister(id: string): Promise<void> {
    const app = this.apps.get(id);
    if (!app) {
      console.warn(`[AppRegistry]: App '${id}' not found.`);
      return;
    }

    this.apps.delete(id);
    this.running.delete(id);

    if (app.isServerSideEnabled && app.server) {
      this.serverRegistry.unregister(id);
    }

    console.log(`[AppRegistry] Unregistered app: ${id}`);
  }

  /**
   * Get all registered apps
   * @returns Array of app objects sorted by order
   */
  public async getAll(): Promise<RuntimeApp[]> {
    return Array.from(this.apps.values())
      .sort((a, b) => (a.order || 999) - (b.order || 999));
  }

  /**
   * Get an app by ID
   * @param id App ID to look up
   * @returns App object if found, undefined otherwise
   */
  public async getById(id: string): Promise<RuntimeApp | undefined> {
    const app = this.apps.get(id);
    if (!app) {
      console.warn(`[AppRegistry]: App '${id}' not found.`);
    }
    return app;
  }

  /**
   * Check if an app is running
   * @param appId App ID to check
   * @returns true if app is running
   */
  public async isRunning(appId: string): Promise<boolean> {
    if (this.running.has(appId)) {
      return true;
    }

    // For server apps, also check ServerAppRegistry
    const app = this.apps.get(appId);
    if (app && app.isServerSideEnabled) {
      const serverApp = this.serverRegistry.get(appId);
      if (serverApp) {
        // Server app is registered, assume running unless we track process state
        return true;
      }
    }

    return false;
  }

  /**
   * Get list of running apps
   * @returns Array of running app IDs
   */
  public async getRunningApps(): Promise<string[]> {
    return Array.from(this.running);
  }

  /**
   * Start a browser app by rendering it
   * @param appId App ID to start
   * @returns Success indicator
   */
  public async startBrowserApp(appId: string): Promise<boolean> {
    const app = this.apps.get(appId);
    if (!app || !app.component) {
      console.warn(`[AppRegistry]: App '${appId}' not found or not a browser app.`);
      return false;
    }

    // Browser app rendering would happen here
    // This would typically render the app in the UI
    console.log(`[AppRegistry] Starting browser app: ${appId}`);
    return true;
  }

  /**
   * Start a server app
   * @param appId App ID to start
   * @returns Success indicator
   */
  public async startServerApp(appId: string): Promise<boolean> {
    const app = this.apps.get(appId);
    if (!app || !app.isServerSideEnabled || !app.server) {
      console.warn(`[AppRegistry]: App '${appId}' not found or not a server app.`);
      return false;
    }

    const config = app.server;

    // Defer to AppManager for actual server process spawning
    console.log(
      `[AppRegistry] Starting server app: ${appId} at ${config.port}`
    );
    return true;
  }

  /**
   * Start an app
   * @param appId App ID to start
   * @returns Success indicator
   */
  public async start(appId: string): Promise<boolean> {
    const app = this.apps.get(appId);

    if (!app) {
      console.warn(`[AppRegistry]: App '${appId}' not found.`);
      return false;
    }

    if (await this.isRunning(appId)) {
      console.log(
        `[AppRegistry]: App '${appId}' is already running. Use stop() first to restart.`
      );
      return true;
    }

    if (app.isServerSideEnabled && app.server) {
      return await this.startServerApp(appId);
    } else {
      return await this.startBrowserApp(appId);
    }
  }

  /**
   * Stop an app
   * @param appId App ID to stop
   */
  public async stop(appId: string): Promise<void> {
    const app = this.apps.get(appId);

    if (!app) {
      console.warn(`[AppRegistry]: App '${appId}' not found.`);
      return;
    }

    if (app.isServerSideEnabled) {
      console.log(`[AppRegistry] Stopping server app: ${appId}`);
      // Defer to AppManager for actual process termination
    } else {
      console.log(`[AppRegistry] Stopping browser app: ${appId}`);
      // Defer to UI rendering logic for browser app unmounting
    }

    this.running.delete(appId);
  }

  /**
   * Check if apps have been loaded
   * @returns true if apps have been loaded
   */
  public isLoadingComplete(): boolean {
    return this.loaded;
  }

  /**
   * Get the number of registered apps
   * @returns Count of registered apps
   */
  public size(): number {
    return this.apps.size;
  }

  /**
   * Get the number of running apps
   * @returns Count of running apps
   */
  public getRunningCount(): number {
    return this.running.size;
  }

  /**
   * Hydrate the registry with apps received from the server via socket.
   * This is called on the UI side after the server sends the apps list.
   * @param apps Array of IApp objects received via socket (without runtime-only fields)
   */
  public async hydrateFromSocket(apps: Omit<RuntimeApp, 'instance' | 'reload' | 'emitReload' | 'requiresPort' | 'latestVersion' | 'isUpdateAvailable'>[]): Promise<void> {
    console.log(`[AppRegistry] Hydrating with ${apps.length} apps from socket.`);

    // Clear existing apps to force reload
    this.apps.clear();
    this.running.clear();

    for (const appData of apps) {
      let componentClass: Component | undefined;

      if (appData.componentPath) {
        componentClass = await loadAppRootComponent(appData.componentPath);
        if (!componentClass) {
          console.error(`[AppRegistry] Component not found: ${appData.componentPath}`);
        }
      }

      if (appData.type === 'server' && !componentClass) {
        componentClass = getDefaultServerAppComponent();
      }

      const runtimeApp: RuntimeApp = {
        ...appData,
        component: componentClass,
        instance: undefined,
        reload: undefined,
        emitReload: undefined,
        metadata: createAppMetadata(appData.metadata),
      };

      this.apps.set(runtimeApp.id, runtimeApp);
      if (this.running.has(appData.id)) {
        this.running.add(appData.id);
      }
    }

    console.log(`[AppRegistry] Hydrated with ${this.apps.size} apps.`);
    this.loaded = true;
    if (typeof document !== 'undefined') {
      document.documentElement.dataset.labAppsHydrated = '1';
    }
  }
}

/**
 * Get the AppRegistry instance.
 * For production use, call AppRegistry.init() first during application startup.
 */
let moduleRegistry: AppRegistry | null = null;

function _getOrCreateRegistry(): AppRegistry | null {
  if (!moduleRegistry) {
    moduleRegistry = new AppRegistry();
  }
  return moduleRegistry;
}

export function getAppRegistry(): AppRegistry | null {
  if (AppRegistry._instance) {
    return AppRegistry._instance;
  }
  return _getOrCreateRegistry();
}

/**
 * Get the initialized AppRegistry instance.
 * Throws an error if AppRegistry has not been initialized via init().
 */
export function getInitializedAppRegistry(): AppRegistry {
  if (!AppRegistry._instance) {
    throw new Error('AppRegistry not initialized (via init()). Call AppRegistry.init() first.');
  }
  return AppRegistry._instance;
}
