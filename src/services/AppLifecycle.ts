import { ILifecycleHooks, IServerConfig, RuntimeApp, AppLaunchResult } from '../shared/types';
import { AppRegistry } from '../shared/services/AppRegistry';
import { AppGateway } from './AppGateway';
import { h, createApp } from 'vue';
import { getDefaultServerAppComponent } from '../shared/components/default-server-app-ui';
import PrimeVue from 'primevue/config';
import ToastService from 'primevue/toastservice';
import { createPinia } from 'pinia';
import '@/shared/theme/lab-app-theme';
import '@/assets/styles/platform-catalog-app.css';
import '@/shared/game-platform/game-lobby.css';
import { getActiveLabTheme } from '@/shared/theme/lab-theme-state';
import { getLabPrimeVuePluginOptions } from '@/shared/theme/prime-preset';
import { buildLabAppMountProps } from '@/shared/services/app-server-url-resolution';
import { loadAppRootComponent } from '@/shared/services/ComponentLoader';
import {
  getDashboardLabWorkspaceContext,
  labWorkspaceContextApiKey,
} from '@/shared/composables/useLabWorkspaceContext';

export interface AppLifecycleConfig {
  id: string;
  userId: number;
  showLoadingModal?: (msg: string) => void,
  hideLoadingModal?: () => void,
  hooks?: ILifecycleHooks;
  renderContainerId?: string,
  dependencies?: RuntimeApp[]
}

/**
 * Render app into a specific container (for tabs) or default container
 *
 * For tabs: containerId points to the TabPanel element which provides scoped content area
 * For default: renders into #render-container as before
 */
export class AppLifecycle {
  private registry: AppRegistry;
  private config: AppLifecycleConfig;
  private appInstance: { unmount(): void } | null = null;

  // Map for tab container references
  private tabContainers = new Map<string, { container: HTMLElement; instance: unknown }>();

  constructor(config: AppLifecycleConfig) {
    this.registry = AppRegistry.getInstance();
    this.config = config;

    // Initialize lifecycle
    this.initialize().catch(console.error);
  }

  private async initialize(): Promise<void> {
    if (this.config.hooks?.onSetup) {
      await this.config.hooks.onSetup();
    }
  }

  async validateAppState(): Promise<void> {
    const isRunning = await this.registry.isRunning(this.config.id);
    if (isRunning) {
      throw new Error(`app with ID '${this.config.id}' is already running.`);
    }
  }

  async launch(): Promise<void> {
    try {
      await this.validateAppState();
      const app = await this.registry.getById(this.config.id)!;
      let dependencySuccess = true
      console.log(`[DEBUG] Attempting to launch app with ID: ${this.config.id}`);
      console.log(`[DEBUG] Registry contains app: ${app !== undefined}`);
      if (!app) {
        console.error(`app with ID '${this.config.id}' not found in registry.`);
        throw new Error(`app with ID '${this.config.id}' not found in registry.`);
      }

      if (!app.isEnabled || (app.type != 'browser' && (app.server && !app.isServerSideEnabled))) {
        console.error(`app with ID '${this.config.id}' is not enabled for launch.`);
        throw new Error(`app with ID '${this.config.id}' is not enabled for launch.`);
      }

      // Ensure dependencies are running first (server process + optional status UI for server deps)
      if (app.type === 'browser' || app.type === 'hybrid' || app.type === 'server') {
        const dependencyLaunchResults = await this.ensureAllDependenciesRunning();
        if (dependencyLaunchResults.filter(_ => !_.success).length > 0) {
          dependencySuccess = false
        }
      }

      if (!dependencySuccess) {
        console.error(`One or more dependencies for app with ID '${this.config.id}' failed`);
      } else {
        let isValue = true

        // Start server process if server entry is defined
        if (app.server && app.server.entry) {
          if (this.config.showLoadingModal) this.config.showLoadingModal(`Launching the "${app.name}" app`)
          isValue = await this.startServerProcess(app.server);
          if (!isValue) console.error(`app with ID '${this.config.id}' server launch failed.`);
          if (this.config.hideLoadingModal) this.config.hideLoadingModal()
        }
        if (isValue && (app.type == 'browser' || app.type == 'hybrid' || app.type == 'server')) {
          await this.render();
        }
      }
    } catch (error) {
      console.error(`Failed to launch app with ID '${this.config.id}':`, error);
      throw error;
    }
  }

  private async startServerProcess(server: IServerConfig): Promise<boolean> {
    try {
      console.log(`[DEBUG] Launching server process for app with entry: ${server.entry}`);
      const gateway = AppGateway.getInstance();
      return await gateway.launch(this.config.id, server);
    } catch (error) {
      console.error('[ERROR] Failed to start server process:', error);
      return false
    }
  }

  async teardown(forceServerShutdown: boolean): Promise<void> {
    try {
      const app = await this.registry.getById(this.config.id);
      if (!app) {
        console.error(`app with ID '${this.config.id}' not found in registry.`);
        throw new Error(`app with ID '${this.config.id}' not found in registry.`);
      }
      if (this.config.hooks?.onTeardown) {
        await this.config.hooks.onTeardown();
      }

      // Stop server process if it exists (disabled by default — servers are shared across users)
      if (forceServerShutdown && app.isServerSideEnabled && app.server) {
        try {
          const tearDownResult = await AppGateway.getInstance().teardown(app.id, app.server?.port);
          if (tearDownResult) console.log(tearDownResult);
        } catch (error) {
          console.log(JSON.stringify(error));
        }
      }

      if (this.appInstance) {
        this.appInstance.unmount();
        this.appInstance = null;
      }

      // Remove only the mounted app root — keep tab-container-* in the DOM for relaunch
      const appMountEl = document.getElementById(`app-${this.config.id}`);
      if (appMountEl) {
        appMountEl.remove();
        console.log(`[AppLifecycle] Unmounted app UI for ID: ${this.config.id}`);
      }
    } catch (error) {
      console.error(`Failed to tear down app with ID '${this.config.id}':`, error);
      throw error;
    }
  }

  async isRunning(): Promise<boolean> {
    const app = await this.registry.getById(this.config.id);
    return app !== undefined;
  }

  async render(): Promise<void> {
    const _app = await this.registry.getById(this.config.id);
    if (!_app) {
      console.error(`[AppLifecycle] app with ID '${this.config.id}' not found in registry.`);
      throw new Error(`[AppLifecycle] app with ID '${this.config.id}' not found in registry.`);
    }
    let component =
      _app.component ?? (_app.type === 'server' ? getDefaultServerAppComponent() : undefined);
    if (!component && _app.componentPath) {
      const loaded = await loadAppRootComponent(_app.componentPath);
      if (loaded) {
        _app.component = loaded;
        component = loaded;
      }
    }
    if (!component) {
      console.error(`[AppLifecycle] app '${_app.id}' has no component.`);
      throw new Error(`[AppLifecycle] app '${_app.id}' has no component.`);
    }

    const renderContainerId = this.config.renderContainerId ?? 'render-container';
    const container = document.getElementById(renderContainerId);
    if (!container) {
      console.error(`[AppLifecycle] Container with ID '${renderContainerId}' not found.`);
      throw new Error(`[AppLifecycle] Container with ID '${renderContainerId}' not found.`);
    }

    const chromeId = `app-${this.config.id}`;
    const existingMount = document.getElementById(chromeId);
    if (existingMount && this.appInstance && container.contains(existingMount)) {
      console.log(`[AppLifecycle] App ${this.config.id} already mounted; skipping duplicate render`);
      return;
    }

    // Clean up previous instance before mounting new one
    if (this.appInstance) {
      try {
        this.appInstance.unmount();
      } catch {
        // Ignore unmount errors for cleanup
      }
      this.appInstance = null;
    }

    const mountProps = buildLabAppMountProps(_app, {
      viteApiBaseUrl: import.meta.env.VITE_API_BASE_URL,
      baseUrl: import.meta.env.VITE_API_BASE_URL,
    });

    const pinia = createPinia();
    const appInstance = createApp({
      render: () => h(component, mountProps),
    });

    // Store the app instance for later unmounting
    this.appInstance = appInstance;
    // Register plugins - Pinia must be registered before any store usage

    appInstance.use(PrimeVue, getLabPrimeVuePluginOptions(getActiveLabTheme()));
    console.log('[DEBUG] PrimeVue plugin applied to app instance');

    appInstance.use(ToastService);
    console.log('[DEBUG] ToastService plugin applied to app instance');

    appInstance.use(pinia);
    console.log('[DEBUG] pinia plugin applied to app instance');

    const workspaceApi = getDashboardLabWorkspaceContext();
    if (workspaceApi) {
      appInstance.provide(labWorkspaceContextApiKey, workspaceApi);
    }

    let mountTarget = existingMount;
    if (!mountTarget || !container.contains(mountTarget)) {
      mountTarget = document.createElement('div');
      mountTarget.id = chromeId;
      mountTarget.className =
        'lab-app-chrome w-full h-full min-h-0 min-w-0 flex flex-col flex-1';
      container.appendChild(mountTarget);
    }

    console.log('[DEBUG] Mounting app component to lab-app-chrome');
    appInstance.mount(mountTarget);
    console.log('[DEBUG] app component mounted successfully');
  }

  /**
   * Mount app UI only (no validate, server spawn, or nested dependency launch).
   * Used when a host app already started dependency server processes.
   */
  async mountUiOnly(): Promise<void> {
    await this.render();
  }

  private async ensureAllDependenciesRunning(): Promise<AppLaunchResult[]> {
    const dependencies = this.config.dependencies ?? [];
    const results: AppLaunchResult[] = [];

    for (const dep of dependencies) {
      try {
        const depApp = await this.registry.getById(dep.id);
        if (!depApp) {
          console.error(`[AppLifecycle] Dependency app '${dep.id}' not found in registry.`);
          results.push({ appId: dep.id, success: false, error: `Dependency app '${dep.id}' not found` });
          continue;
        }

        if (!depApp.isEnabled) {
          console.error(`[AppLifecycle] Dependency app '${dep.id}' is not enabled.`);
          results.push({ appId: dep.id, success: false, error: `Dependency app '${dep.id}' is not enabled` });
          continue;
        }

        // Launch dependency if it's a server-side app
        if (depApp.type === 'server' || depApp.type === 'hybrid') {
          const depServer = depApp.server;
          if (depServer && depServer.entry) {
            const depGateway = AppGateway.getInstance();
            const launchResult = await depGateway.launch(dep.id, depServer);
            results.push({ appId: dep.id, success: launchResult });
          } else {
            console.log(`[AppLifecycle] Dependency app '${dep.id}' has no server entry; skipping launch`);
            results.push({ appId: dep.id, success: true });
          }
        } else {
          // Browser apps don't need to be launched here
          console.log(`[AppLifecycle] Skipping dependency launch for browser app '${dep.id}'`);
          results.push({ appId: dep.id, success: true });
        }
      } catch (error) {
        console.error(`[AppLifecycle] Failed to launch dependency '${dep.id}':`, error);
        results.push({ appId: dep.id, success: false, error: String(error) });
      }
    }

    return results;
  }
}
