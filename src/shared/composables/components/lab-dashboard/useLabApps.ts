import { ref, computed, nextTick, watch, type Ref } from 'vue';
import type { ToastServiceMethods } from 'primevue/toastservice';
import type { User, RuntimeApp } from '@/shared/types';
import { AppRegistry } from '@/shared/services/AppRegistry';
import { AppLifecycle, type AppLifecycleConfig } from '@/services/AppLifecycle';
import { SessionManager } from '../../session/session-manager';
import {
  AppWorkspaceLayoutState,
  AppWorkspaceMode,
  DEFAULT_APP_WORKSPACE_LAYOUT,
  DEFAULT_APP_VIEW_LAYOUT_PERSISTENCE,
  cloneAppViewLayoutPersistence,
  type AppViewLayoutPersistence,
} from '@/shared/types/app-view-layout';
import {
  clampSplitRatio,
  isSplitWorkspaceMode,
  isWorkspaceFullyMinimized,
  layoutAfterAppLaunch,
  layoutForModeChange,
  layoutForSplitTabClick,
  normalizeAppViewLayoutPersistence,
  resolveActiveWorkspaceAppIds,
  resolveSplitEligibleAppIdsFromApps,
  resolveLayoutAfterCloseApp,
  resolveLayoutWithMinimizedApps,
  resolveNextActiveAfterMinimize,
  resolveRestoredAppId,
  sanitizeAppWorkspaceLayout,
} from '@/shared/composables/components/app-view-layout-utils';
import {
  collectDependencyAppsToTeardown,
  resolveNextActiveTabId,
} from './collect-dependency-apps-to-teardown';

export interface UseLabAppsOptions {
  user: Ref<User | null>;
  toast: ToastServiceMethods;
  /** Shared module flag — split panes must not target hidden dependency launches. */
  showDependencyApps?: Ref<boolean>;
}

/** Multi-app tabs, workspace layout, launch/teardown (rm-46 **4.2**). */
export function useLabApps(options: UseLabAppsOptions) {
  const { user, toast, showDependencyApps } = options;

  const runningApps = ref<RuntimeApp[]>([]);
  const activeTabId = ref<string | null>(null);
  const tabOrder = ref<string[]>([]);
  const tabLoadingStates = ref<Record<string, boolean>>({});
  const sortByOrder = ref<boolean>(true);
  /** Running apps hidden from the workspace panes (still teardown-able from the running rail). */
  const minimizedAppIds = ref<string[]>([]);

  const sessionManager = new SessionManager();
  const appWorkspaceLayout = ref<AppWorkspaceLayoutState>({ ...DEFAULT_APP_WORKSPACE_LAYOUT });
  const workspacePersistedRatios = ref<AppViewLayoutPersistence>({
    ...DEFAULT_APP_VIEW_LAYOUT_PERSISTENCE,
  });

  const isLoadingServer = ref<boolean>(false);
  const loadingModalMsg = ref<string>('');

  async function waitForMountContainer(containerId: string, attempts = 300): Promise<void> {
    for (let i = 0; i < attempts; i++) {
      if (document.getElementById(containerId)) {
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    throw new Error(`[useLabApps] Mount container not found: ${containerId}`);
  }

  const runningAppIds = computed(() => runningApps.value.map((a) => a.id));

  function splitEligibleAppIds(): string[] {
    return resolveSplitEligibleAppIdsFromApps(runningApps.value, {
      minimizedAppIds: minimizedAppIds.value,
      showDependencyApps: showDependencyApps?.value ?? true,
    });
  }

  function sanitizeWorkspaceLayout(layout: AppWorkspaceLayoutState): AppWorkspaceLayoutState {
    return sanitizeAppWorkspaceLayout(
      layout,
      runningAppIds.value,
      splitEligibleAppIds(),
      tabOrder.value,
    );
  }

  function applySanitizedWorkspaceLayout(): void {
    const next = sanitizeWorkspaceLayout(appWorkspaceLayout.value);
    const cur = appWorkspaceLayout.value;
    if (
      cur.mode === next.mode &&
      cur.primaryAppId === next.primaryAppId &&
      cur.secondaryAppId === next.secondaryAppId &&
      cur.pinnedAppId === next.pinnedAppId
    ) {
      return;
    }
    appWorkspaceLayout.value = next;
  }

  async function persistWorkspaceSplitRatios(): Promise<void> {
    try {
      await sessionManager.setAppViewLayoutRatios(
        cloneAppViewLayoutPersistence(workspacePersistedRatios.value),
      );
    } catch (error) {
      console.warn('[useLabApps] Failed to persist workspace split ratios:', error);
    }
  }

  async function hydrateAppWorkspaceLayout(): Promise<void> {
    const stored = await sessionManager.getAppViewLayoutRatios();
    workspacePersistedRatios.value = normalizeAppViewLayoutPersistence(stored);
    appWorkspaceLayout.value = sanitizeWorkspaceLayout(appWorkspaceLayout.value);
  }

  function setWorkspaceMode(mode: AppWorkspaceMode): void {
    appWorkspaceLayout.value = layoutForModeChange(
      mode,
      appWorkspaceLayout.value,
      activeTabId.value,
      runningAppIds.value,
      workspacePersistedRatios.value,
      splitEligibleAppIds(),
      tabOrder.value,
    );
  }

  if (showDependencyApps) {
    watch([showDependencyApps, minimizedAppIds, runningApps], () => {
      applySanitizedWorkspaceLayout();
    });
  }

  function updateWorkspaceSplitRatio(ratio: number): void {
    const clamped = clampSplitRatio(ratio);
    appWorkspaceLayout.value = {
      ...appWorkspaceLayout.value,
      splitRatio: clamped,
    };
    if (appWorkspaceLayout.value.mode === 'anchored') {
      workspacePersistedRatios.value.anchoredSplitRatio = clamped;
    } else if (appWorkspaceLayout.value.mode === 'split-horizontal') {
      workspacePersistedRatios.value.splitHorizontalRatio = clamped;
    }
    void persistWorkspaceSplitRatios();
  }

  const tabOrderApps = computed(() => {
    const apps: RuntimeApp[] = [...runningApps.value];
    if (sortByOrder.value) {
      return apps.sort((a, b) => (a.order || 0) - (b.order || 0));
    }
    return apps;
  });
  /** Running apps that still own a workspace pane (minimized apps are excluded). */
  const visibleRunningApps = computed(() => {
    const minimized = new Set(minimizedAppIds.value);
    return runningApps.value.filter((app) => !minimized.has(app.id));
  });

  const activeWorkspaceAppIds = computed(() =>
    resolveActiveWorkspaceAppIds(runningAppIds.value, minimizedAppIds.value),
  );

  const fullyMinimized = computed(() =>
    isWorkspaceFullyMinimized(runningAppIds.value, minimizedAppIds.value),
  );

  const minimizedApps = computed(() => {
    const minimized = new Set(minimizedAppIds.value);
    return runningApps.value.filter((app) => minimized.has(app.id));
  });

  const effectiveActiveTabId = computed(() => {
    if (activeTabId.value && activeWorkspaceAppIds.value.includes(activeTabId.value)) {
      return activeTabId.value;
    }
    const first = visibleRunningApps.value.find(
      (a) => a.type === 'browser' || a.type === 'hybrid' || a.type === 'server',
    );
    return first?.id ?? null;
  });

  /** Drop minimized ids that are no longer running. */
  function pruneMinimizedAppIds(): void {
    if (minimizedAppIds.value.length === 0) {
      return;
    }
    const running = new Set(runningAppIds.value);
    const next = minimizedAppIds.value.filter((id) => running.has(id));
    if (next.length !== minimizedAppIds.value.length) {
      minimizedAppIds.value = next;
    }
  }

  /** Keep the workspace layout consistent with the set of apps that are not minimized. */
  function syncLayoutForMinimized(): void {
    appWorkspaceLayout.value = resolveLayoutWithMinimizedApps(
      appWorkspaceLayout.value,
      activeWorkspaceAppIds.value,
    );
  }

  function minimizeApp(appId: string): void {
    if (!runningAppIds.value.includes(appId) || minimizedAppIds.value.includes(appId)) {
      return;
    }
    const nextActive = resolveNextActiveAfterMinimize(
      appId,
      tabOrderApps.value.map((app) => app.id),
      activeWorkspaceAppIds.value,
      minimizedAppIds.value,
    );
    minimizedAppIds.value = [...minimizedAppIds.value, appId];
    activeTabId.value = nextActive;
    syncLayoutForMinimized();
  }

  /** Minimize every open app so the catalog workspace is usable again. */
  function minimizeAllApps(): void {
    const toMinimize = activeWorkspaceAppIds.value.filter(
      (id) => !minimizedAppIds.value.includes(id),
    );
    if (toMinimize.length === 0) {
      return;
    }
    minimizedAppIds.value = [...minimizedAppIds.value, ...toMinimize];
    activeTabId.value = null;
    syncLayoutForMinimized();
  }

  function restoreApp(appId: string): void {
    if (!minimizedAppIds.value.includes(appId)) {
      return;
    }
    minimizedAppIds.value = minimizedAppIds.value.filter((id) => id !== appId);
    activeTabId.value = appId;
    syncLayoutForMinimized();
    if (!isSplitWorkspaceMode(appWorkspaceLayout.value.mode)) {
      appWorkspaceLayout.value = {
        ...appWorkspaceLayout.value,
        primaryAppId: appId,
      };
    }
  }

  /** Restore the most recently minimized app (keyboard/shortcut friendly). */
  function restoreNextApp(preferredAppId?: string | null): string | null {
    const target = resolveRestoredAppId(preferredAppId, minimizedAppIds.value);
    if (!target) {
      return null;
    }
    restoreApp(target);
    return target;
  }

  const showLoadingModal = (msg: string) => {
    isLoadingServer.value = true;
    loadingModalMsg.value = msg;
  };

  const hideLoadingModal = () => {
    isLoadingServer.value = false;
    loadingModalMsg.value = '';
  };

  const emitLaunchForTab = async (id: string, appName: string) => {
    if (!user.value) {
      return;
    }

    const registry = AppRegistry.getInstance();
    const app = await registry.getById(id);

    if (!app) {
      return;
    }

    const existingIndex = runningApps.value.findIndex((a) => a.id === id);
    if (existingIndex !== -1) {
      runningApps.value[existingIndex].isDependencyLaunch = false;
      restoreApp(id);
      updateActiveAppTab(id);
      return;
    }

    app.hasCloseButton = app.type === 'browser' || app.type === 'hybrid' || app.type === 'server';
    app.isDependencyLaunch = false;

    tabLoadingStates.value[id] = true;

    const dependencies: RuntimeApp[] = [];

    const { orderDependenciesForLaunch } = await import('@/shared/config/platform-app-dependency-order');
    const { fetchLaunchDependencyIds } = await import('@/shared/lab-integrations/fetch-launch-dependencies');
    const launchDeps =
      (await fetchLaunchDependencyIds(id)) ?? orderDependenciesForLaunch(app.dependencies ?? []);
    for (const depId of launchDeps) {
      const appDependency = await registry.getById(depId);
      if (!appDependency) {
        continue;
      }
      const appIsRunning = runningApps.value.some((a) => a.id === appDependency.id);
      if (!appIsRunning) {
        appDependency.hasCloseButton =
          appDependency.type === 'browser' ||
          appDependency.type === 'hybrid' ||
          appDependency.type === 'server';
        appDependency.isDependencyLaunch = true;
        dependencies.push(appDependency);
      }
    }

    for (const appDependency of dependencies) {
      runningApps.value.unshift(appDependency);
      tabOrder.value.push(appDependency.id);
    }
    runningApps.value.unshift(app);
    tabOrder.value.push(id);
    minimizedAppIds.value = minimizedAppIds.value.filter((minimizedId) => minimizedId !== id);
    activeTabId.value = id;

    try {
      const lifecycle = new AppLifecycle({
        id: id,
        userId: user.value?.userId || 0,
        hooks: {},
        renderContainerId: `tab-container-${id}`,
        dependencies: dependencies,
      } as AppLifecycleConfig);
      await nextTick();
      await nextTick();
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      });
      await waitForMountContainer(`tab-container-${id}`);
      for (const dep of dependencies) {
        await waitForMountContainer(`tab-container-${dep.id}`);
      }
      await lifecycle.launch();

      const { offerLabGameSidecarOnAppLaunch } = await import(
        '@/shared/composables/lab-sidecar/offer-lab-game-sidecar-on-launch'
      );
      await offerLabGameSidecarOnAppLaunch(id, toast);

      const userId = user.value?.userId || 0;
      for (const dep of dependencies) {
        if (dep.type !== 'browser' && dep.type !== 'hybrid' && dep.type !== 'server') {
          continue;
        }
        tabLoadingStates.value[dep.id] = true;
        try {
          const depLifecycle = new AppLifecycle({
            id: dep.id,
            userId,
            hooks: {},
            renderContainerId: `tab-container-${dep.id}`,
          } as AppLifecycleConfig);
          await depLifecycle.mountUiOnly();
        } catch (depError) {
          console.error(`[useLabApps] Failed to mount dependency UI ${dep.id}:`, depError);
        } finally {
          tabLoadingStates.value[dep.id] = false;
        }
      }
    } catch (error) {
      console.error(`[useLabApps] Failed to launch app ${id}:`, error);

      const index = runningApps.value.findIndex((a) => a.id === id);
      if (index !== -1) {
        runningApps.value.splice(index, 1);
      }

      toast.add({
        severity: 'error',
        summary: 'Launch Failed',
        detail: `Failed to launch ${appName}: ${(error as Error).message}`,
        life: 5000,
      });
    } finally {
      tabLoadingStates.value[id] = false;
      appWorkspaceLayout.value = layoutAfterAppLaunch(
        appWorkspaceLayout.value,
        id,
        runningAppIds.value,
        splitEligibleAppIds(),
        tabOrder.value,
      );
    }
  };

  const handleCloseTab = async (appId: string) => {
    const registry = AppRegistry.getInstance();
    const app = await registry.getById(appId);

    if (!app) {
      return;
    }

    if (!(app.type === 'browser' || app.type === 'hybrid' || app.type === 'server')) {
      toast.add({
        severity: 'warn',
        summary: 'Cannot Close',
        detail: 'This app cannot be closed from tabs.',
      });
      return;
    }

    await handleTeardownApp(appId, user.value?.userId || 0);
  };

  async function buildDependencyMapForRunning(closingAppId: string): Promise<Record<string, string[]>> {
    const registry = AppRegistry.getInstance();
    const map: Record<string, string[]> = {};
    const ids = new Set([
      closingAppId,
      ...runningApps.value.map((app) => app.id),
    ]);
    for (const id of ids) {
      const meta = await registry.getById(id);
      if (meta?.dependencies?.length) {
        map[id] = meta.dependencies;
      }
    }
    return map;
  }

  const removeFromTabOrder = (id: string): void => {
    tabLoadingStates.value[id] = false;
    const index = tabOrder.value.indexOf(id);
    if (index !== -1) {
      tabOrder.value.splice(index, 1);
    }
  };

  const handleTeardownApp = async (appId: string, userId: number, forceServerShutdown = false) => {
    const registry = AppRegistry.getInstance();
    const app = await registry.getById(appId);

    if (!app) {
      return;
    }

    if (
      !(app.type === 'browser' || app.type === 'hybrid' || app.type === 'server') ||
      !runningApps.value.some((a) => a.id === appId)
    ) {
      return;
    }

    const closingRuntime = runningApps.value.find((a) => a.id === appId);
    const dependencyMap = await buildDependencyMapForRunning(appId);
    const extraDependencyIds =
      closingRuntime?.isDependencyLaunch === true
        ? []
        : collectDependencyAppsToTeardown(appId, runningApps.value, dependencyMap);

    const teardownIds = [appId, ...extraDependencyIds];

    for (const id of teardownIds) {
      if (!runningApps.value.some((a) => a.id === id)) {
        continue;
      }
      removeFromTabOrder(id);
      const lifecycle = new AppLifecycle({
        id,
        userId,
        hooks: {},
        renderContainerId: `tab-container-${id}`,
      } as AppLifecycleConfig);
      await lifecycle.teardown(forceServerShutdown);
      runningApps.value = runningApps.value.filter((a) => a.id !== id);
    }

    pruneMinimizedAppIds();

    const nextActive = effectiveActiveTabId.value ?? resolveNextActiveTabId(runningApps.value);
    activeTabId.value = nextActive;
    appWorkspaceLayout.value = resolveLayoutAfterCloseApp(
      appWorkspaceLayout.value,
      appId,
      activeWorkspaceAppIds.value,
      nextActive,
    );

    console.log(`runningApps: ${runningApps.value.length}`);
  };

  const updateActiveAppTab = (appId: string) => {
    const previousActiveTabId = activeTabId.value;
    if (minimizedAppIds.value.includes(appId)) {
      minimizedAppIds.value = minimizedAppIds.value.filter((id) => id !== appId);
    }
    activeTabId.value = appId;
    if (isSplitWorkspaceMode(appWorkspaceLayout.value.mode)) {
      const layout = appWorkspaceLayout.value;
      if (layout.mode === 'anchored') {
        if (appId === layout.pinnedAppId) {
          return;
        }
        appWorkspaceLayout.value = {
          ...layout,
          primaryAppId: appId,
        };
      } else {
        appWorkspaceLayout.value = layoutForSplitTabClick(
          layout,
          appId,
          previousActiveTabId,
          runningAppIds.value,
          splitEligibleAppIds(),
          tabOrder.value,
        );
      }
    }
  };

  const emitLaunch = (id: string, appName: string) => {
    if (user.value) {
      void emitLaunchForTab(id, appName);
    }
  };

  const emitTeardown = async (id: string) => {
    if (user.value) {
      await handleTeardownApp(id, user.value?.userId || 0);
    }
  };

  return {
    runningApps,
    visibleRunningApps,
    minimizedApps,
    minimizedAppIds,
    activeWorkspaceAppIds,
    fullyMinimized,
    minimizeApp,
    minimizeAllApps,
    restoreApp,
    restoreNextApp,
    activeTabId,
    tabOrder,
    tabLoadingStates,
    sortByOrder,
    appWorkspaceLayout,
    setWorkspaceMode,
    updateWorkspaceSplitRatio,
    hydrateAppWorkspaceLayout,
    tabOrderApps,
    effectiveActiveTabId,
    isLoadingServer,
    loadingModalMsg,
    showLoadingModal,
    hideLoadingModal,
    emitLaunchForTab,
    handleCloseTab,
    handleTeardownApp,
    updateActiveAppTab,
    emitLaunch,
    emitTeardown,
  };
}
