import {

  AppWorkspaceLayoutState,

  AppWorkspaceMode,

  DEFAULT_APP_WORKSPACE_LAYOUT,

  FORMS_BUILDER_APP_ID,

  cloneAppWorkspaceLayout,

  DEFAULT_APP_VIEW_LAYOUT_PERSISTENCE,

  type AppViewLayoutPersistence,

} from '@/shared/types/app-view-layout';



const VALID_MODES: AppWorkspaceMode[] = [

  'tabs',

  'split-horizontal',

  'anchored',

];



const SPLIT_MODES: AppWorkspaceMode[] = ['split-horizontal', 'anchored'];



function normalizeWorkspaceMode(mode: unknown): AppWorkspaceMode {

  if (mode === 'split-vertical') {

    return 'split-horizontal';

  }

  if (typeof mode === 'string' && (VALID_MODES as string[]).includes(mode)) {

    return mode as AppWorkspaceMode;

  }

  return 'tabs';

}



export function clampSplitRatio(ratio: number): number {

  if (Number.isNaN(ratio)) return DEFAULT_APP_WORKSPACE_LAYOUT.splitRatio;

  return Math.min(80, Math.max(20, Math.round(ratio)));

}



/** Read Dexie `appViewLayout` — new ratio-only shape or legacy full layout */

export function normalizeAppViewLayoutPersistence(raw: unknown): AppViewLayoutPersistence {

  const defaults = { ...DEFAULT_APP_VIEW_LAYOUT_PERSISTENCE };

  if (!raw || typeof raw !== 'object') {

    return defaults;

  }

  const o = raw as Record<string, unknown>;

  if ('splitHorizontalRatio' in o || 'anchoredSplitRatio' in o) {

    return {

      splitHorizontalRatio: clampSplitRatio(

        Number(o.splitHorizontalRatio ?? defaults.splitHorizontalRatio),

      ),

      anchoredSplitRatio: clampSplitRatio(

        Number(o.anchoredSplitRatio ?? defaults.anchoredSplitRatio),

      ),

    };

  }

  const legacyRatio = clampSplitRatio(Number(o.splitRatio ?? defaults.splitHorizontalRatio));

  const legacyMode = o.mode;

  if (legacyMode === 'anchored') {

    return { splitHorizontalRatio: defaults.splitHorizontalRatio, anchoredSplitRatio: legacyRatio };

  }

  return { splitHorizontalRatio: legacyRatio, anchoredSplitRatio: defaults.anchoredSplitRatio };

}



export type SplitEligibleRuntimeApp = {

  id: string;

  type: string;

  isDependencyLaunch?: boolean;

};



/** User-visible apps that may occupy a split pane (not minimized, not hidden dependency). */

export function resolveSplitEligibleAppIdsFromApps(

  apps: readonly SplitEligibleRuntimeApp[],

  options: {

    minimizedAppIds?: readonly string[];

    showDependencyApps: boolean;

  },

): string[] {

  const launchable = new Set(['browser', 'hybrid', 'server']);

  const minimized = new Set(options.minimizedAppIds ?? []);

  return apps

    .filter((app) => launchable.has(app.type))

    .filter((app) => !minimized.has(app.id))

    .filter((app) => options.showDependencyApps || !app.isDependencyLaunch)

    .map((app) => app.id);

}



/** Prefer the next visible tab after primary when choosing the trailing split pane. */

export function pickSplitSecondaryAppId(

  primaryId: string | null,

  eligibleIds: readonly string[],

  tabOrderIds?: readonly string[],

): string | null {

  if (eligibleIds.length < 2) {

    return null;

  }

  const others = eligibleIds.filter((id) => id !== primaryId);

  if (others.length === 0) {

    return null;

  }

  if (primaryId && tabOrderIds?.length) {

    const index = tabOrderIds.indexOf(primaryId);

    if (index !== -1) {

      for (let offset = 1; offset < tabOrderIds.length; offset += 1) {

        const candidate = tabOrderIds[(index + offset) % tabOrderIds.length];

        if (candidate && others.includes(candidate)) {

          return candidate;

        }

      }

    }

    const inTabOrder = tabOrderIds.filter((id) => others.includes(id));

    if (inTabOrder.length > 0) {

      return inTabOrder[inTabOrder.length - 1] ?? null;

    }

  }

  return others[0] ?? null;

}



export function sanitizeAppWorkspaceLayout(

  raw: Partial<AppWorkspaceLayoutState> | undefined,

  runningAppIds: string[],

  splitEligibleAppIds?: string[],

  tabOrderIds?: string[],

): AppWorkspaceLayoutState {

  const base: AppWorkspaceLayoutState = cloneAppWorkspaceLayout({

    ...DEFAULT_APP_WORKSPACE_LAYOUT,

    ...raw,

    mode: normalizeWorkspaceMode(raw?.mode),

    splitRatio: clampSplitRatio(raw?.splitRatio ?? DEFAULT_APP_WORKSPACE_LAYOUT.splitRatio),

  });



  if (!VALID_MODES.includes(base.mode)) {

    base.mode = 'tabs';

  }



  const keep = (id: string | null | undefined): string | null =>

    id && runningAppIds.includes(id) ? id : null;



  base.primaryAppId = keep(base.primaryAppId);

  base.secondaryAppId = keep(base.secondaryAppId);

  base.pinnedAppId = keep(base.pinnedAppId);



  const eligible =

    splitEligibleAppIds?.length

      ? splitEligibleAppIds.filter((id) => runningAppIds.includes(id))

      : runningAppIds;



  if (eligible.length < 2 && SPLIT_MODES.includes(base.mode)) {

    base.mode = 'tabs';

    base.secondaryAppId = null;

    base.pinnedAppId = null;

  }



  if (base.mode === 'split-horizontal') {

    const primary = base.primaryAppId;

    if (primary && !eligible.includes(primary)) {

      base.primaryAppId = eligible[0] ?? null;

    }

    if (!base.secondaryAppId || !eligible.includes(base.secondaryAppId)) {

      base.secondaryAppId = pickSplitSecondaryAppId(

        base.primaryAppId ?? null,

        eligible,

        tabOrderIds,

      );

    }

  }



  if (base.mode === 'anchored' && !base.pinnedAppId && runningAppIds.includes(FORMS_BUILDER_APP_ID)) {

    base.pinnedAppId = FORMS_BUILDER_APP_ID;

  }



  return base;

}



export function isSplitWorkspaceMode(mode: AppWorkspaceMode): boolean {

  return SPLIT_MODES.includes(mode);

}



export function resolveSecondaryAppId(

  layout: AppWorkspaceLayoutState,

  activeTabId: string | null,

  runningAppIds: string[],

  splitEligibleAppIds?: string[],

  tabOrderIds?: string[],

): string | null {

  const eligible =

    splitEligibleAppIds?.length

      ? splitEligibleAppIds.filter((id) => runningAppIds.includes(id))

      : runningAppIds;



  if (layout.mode === 'anchored') {

    const pinned = layout.pinnedAppId;

    if (pinned && eligible.includes(pinned)) {

      return pinned;

    }

    return layout.pinnedAppId;

  }

  if (layout.secondaryAppId && eligible.includes(layout.secondaryAppId)) {

    return layout.secondaryAppId;

  }

  const primary = layout.primaryAppId ?? activeTabId;

  return (

    pickSplitSecondaryAppId(primary, eligible, tabOrderIds) ??

    runningAppIds.find((id) => id !== primary) ??

    null

  );

}



export function resolvePrimaryAppId(

  layout: AppWorkspaceLayoutState,

  activeTabId: string | null,

): string | null {

  return layout.primaryAppId ?? activeTabId;

}



/**

 * Leading pane = left in DOM/tab order.

 * splitRatio is the leading pane's share; gutter position matches that edge.

 */

export function resolveSplitPaneOrder(

  layout: AppWorkspaceLayoutState,

  activeTabId: string | null,

  runningAppIds: string[],

  splitEligibleAppIds?: string[],

  tabOrderIds?: string[],

): { leading: string; trailing: string } | null {

  const primary = resolvePrimaryAppId(layout, activeTabId);

  const secondary = resolveSecondaryAppId(

    layout,

    activeTabId,

    runningAppIds,

    splitEligibleAppIds,

    tabOrderIds,

  );

  if (!primary || !secondary || primary === secondary) {

    return null;

  }



  if (layout.mode === 'anchored') {

    const pinned = layout.pinnedAppId ?? secondary;

    const host =

      primary !== pinned

        ? primary

        : runningAppIds.find((id) => id !== pinned) ?? primary;

    return { leading: host, trailing: pinned };

  }



  const ordered = [primary, secondary].sort(

    (a, b) => runningAppIds.indexOf(a) - runningAppIds.indexOf(b),

  );

  return { leading: ordered[0], trailing: ordered[1] };

}



export function isAppVisibleInWorkspace(

  appId: string,

  layout: AppWorkspaceLayoutState,

  activeTabId: string | null,

  runningAppIds: string[],

  splitEligibleAppIds?: string[],

  tabOrderIds?: string[],

): boolean {

  if (!runningAppIds.includes(appId)) {

    return false;

  }

  if (layout.mode === 'tabs') {

    return appId === activeTabId;

  }

  const primary = resolvePrimaryAppId(layout, activeTabId);

  const secondary = resolveSecondaryAppId(

    layout,

    activeTabId,

    runningAppIds,

    splitEligibleAppIds,

    tabOrderIds,

  );

  return appId === primary || appId === secondary;

}



/** Flex styles for visible workspace panes (hidden panes stay in DOM with v-show). */

export function getPaneFlexStyle(

  appId: string,

  layout: AppWorkspaceLayoutState,

  activeTabId: string | null,

  runningAppIds: string[],

  splitEligibleAppIds?: string[],

  tabOrderIds?: string[],

): Record<string, string> {

  if (

    !isAppVisibleInWorkspace(

      appId,

      layout,

      activeTabId,

      runningAppIds,

      splitEligibleAppIds,

      tabOrderIds,

    )

  ) {

    return {};

  }

  if (layout.mode === 'tabs') {

    return { flex: '1 1 0%', minHeight: '0', minWidth: '0' };

  }

  const ratio = clampSplitRatio(layout.splitRatio);

  const panes = resolveSplitPaneOrder(

    layout,

    activeTabId,

    runningAppIds,

    splitEligibleAppIds,

    tabOrderIds,

  );

  if (!panes) {

    return {};

  }

  const trailingRatio = 100 - ratio;

  const isLeading = appId === panes.leading;

  const isTrailing = appId === panes.trailing;

  if (layout.mode === 'split-horizontal' || layout.mode === 'anchored') {

    if (isLeading) {

      return {

        flex: `0 0 ${ratio}%`,

        minHeight: '0',

        minWidth: '0',

        maxWidth: `${ratio}%`,

      };

    }

    if (isTrailing) {

      return {

        flex: `0 0 ${trailingRatio}%`,

        minHeight: '0',

        minWidth: '0',

        maxWidth: `${trailingRatio}%`,

      };

    }

  }

  return {};

}



/** @deprecated Prefer isAppVisibleInWorkspace + getPaneFlexStyle */

export function getMountHostStyle(

  appId: string,

  layout: AppWorkspaceLayoutState,

  activeTabId: string | null,

  runningAppIds: string[],

): Record<string, string> {

  const hidden: Record<string, string> = { display: 'none' };



  if (!runningAppIds.includes(appId)) {

    return hidden;

  }



  if (layout.mode === 'tabs') {

    if (appId !== activeTabId) return hidden;

    return {

      position: 'absolute',

      inset: '0',

      width: '100%',

      height: '100%',

      overflow: 'auto',

      zIndex: '1',

    };

  }



  const primary = resolvePrimaryAppId(layout, activeTabId);

  const secondary = resolveSecondaryAppId(layout, activeTabId, runningAppIds);



  if (!primary && activeTabId) {

    if (appId !== activeTabId) return hidden;

    return {

      position: 'absolute',

      inset: '0',

      width: '100%',

      height: '100%',

      overflow: 'auto',

      zIndex: '1',

    };

  }

  const ratio = clampSplitRatio(layout.splitRatio);



  if (layout.mode === 'split-horizontal' || layout.mode === 'anchored') {

    if (appId === primary) {

      return {

        position: 'absolute',

        left: '0',

        top: '0',

        width: `${ratio}%`,

        height: '100%',

        overflow: 'auto',

        zIndex: '1',

      };

    }

    if (appId === secondary) {

      return {

        position: 'absolute',

        left: `${ratio}%`,

        top: '0',

        width: `${100 - ratio}%`,

        height: '100%',

        overflow: 'auto',

        zIndex: '1',

      };

    }

    return hidden;

  }



  return hidden;

}



export function resolveLayoutAfterCloseApp(

  layout: AppWorkspaceLayoutState,

  closedAppId: string,

  runningAppIds: string[],

  nextActiveTabId: string | null,

): AppWorkspaceLayoutState {

  const next: AppWorkspaceLayoutState = { ...layout };



  if (next.primaryAppId === closedAppId) {

    next.primaryAppId = nextActiveTabId;

  }

  if (next.secondaryAppId === closedAppId) {

    next.secondaryAppId = null;

  }

  if (next.pinnedAppId === closedAppId) {

    next.pinnedAppId = null;

  }



  return sanitizeAppWorkspaceLayout(next, runningAppIds);

}



/**

 * Split ↔ tab clicks: promote clicked app to primary; keep secondary when picking a

 * background tab; swap when clicking the current secondary pane's tab.

 */

export function layoutForSplitTabClick(

  layout: AppWorkspaceLayoutState,

  clickedAppId: string,

  previousActiveTabId: string | null,

  runningAppIds: string[],

  splitEligibleAppIds?: string[],

  tabOrderIds?: string[],

): AppWorkspaceLayoutState {

  if (layout.mode !== 'split-horizontal') {

    return layout;

  }

  if (!runningAppIds.includes(clickedAppId)) {

    return layout;

  }



  const eligible =

    splitEligibleAppIds?.length

      ? splitEligibleAppIds.filter((id) => runningAppIds.includes(id))

      : runningAppIds;



  const currentPrimary = resolvePrimaryAppId(layout, previousActiveTabId);

  const currentSecondary = resolveSecondaryAppId(

    layout,

    previousActiveTabId,

    runningAppIds,

    eligible,

    tabOrderIds,

  );



  if (clickedAppId === currentPrimary) {

    return { ...layout, primaryAppId: clickedAppId };

  }



  if (currentSecondary && clickedAppId === currentSecondary) {

    return {

      ...layout,

      primaryAppId: clickedAppId,

      secondaryAppId: currentPrimary,

    };

  }



  const keptSecondary =

    currentSecondary &&

    currentSecondary !== clickedAppId &&

    eligible.includes(currentSecondary)

      ? currentSecondary

      : pickSplitSecondaryAppId(clickedAppId, eligible, tabOrderIds);



  return {

    ...layout,

    primaryAppId: clickedAppId,

    secondaryAppId: keptSecondary,

  };

}



/** After launching another app: keep an existing split pair; anchored promotes new host. */

export function layoutAfterAppLaunch(

  layout: AppWorkspaceLayoutState,

  launchedAppId: string,

  runningAppIds: string[],

  splitEligibleAppIds?: string[],

  tabOrderIds?: string[],

): AppWorkspaceLayoutState {

  if (!runningAppIds.includes(launchedAppId)) {

    return sanitizeAppWorkspaceLayout(layout, runningAppIds);

  }



  if (layout.mode === 'anchored') {

    return sanitizeAppWorkspaceLayout(

      { ...layout, primaryAppId: launchedAppId },

      runningAppIds,

    );

  }



  if (layout.mode === 'split-horizontal') {

    const eligible =

      splitEligibleAppIds?.length

        ? splitEligibleAppIds.filter((id) => runningAppIds.includes(id))

        : runningAppIds;



    const primary = layout.primaryAppId;

    const secondary = layout.secondaryAppId;

    const pairIntact =

      primary &&

      secondary &&

      primary !== launchedAppId &&

      secondary !== launchedAppId &&

      eligible.includes(primary) &&

      eligible.includes(secondary);



    if (pairIntact) {

      return sanitizeAppWorkspaceLayout(layout, runningAppIds, splitEligibleAppIds, tabOrderIds);

    }



    return sanitizeAppWorkspaceLayout(

      {

        ...layout,

        primaryAppId: launchedAppId,

        secondaryAppId:

          pickSplitSecondaryAppId(launchedAppId, eligible, tabOrderIds) ?? secondary,

      },

      runningAppIds,

      splitEligibleAppIds,

      tabOrderIds,

    );

  }



  return sanitizeAppWorkspaceLayout(layout, runningAppIds);

}



export function layoutForModeChange(

  mode: AppWorkspaceMode,

  current: AppWorkspaceLayoutState,

  activeTabId: string | null,

  runningAppIds: string[],

  persistedRatios: AppViewLayoutPersistence = DEFAULT_APP_VIEW_LAYOUT_PERSISTENCE,

  splitEligibleAppIds?: string[],

  tabOrderIds?: string[],

): AppWorkspaceLayoutState {

  const next: AppWorkspaceLayoutState = {

    ...current,

    mode,

    primaryAppId: activeTabId,

  };



  if (mode === 'anchored') {

    next.pinnedAppId =

      runningAppIds.includes(FORMS_BUILDER_APP_ID)

        ? FORMS_BUILDER_APP_ID

        : runningAppIds.find((id) => id !== activeTabId) ?? null;

    next.secondaryAppId = null;

    next.splitRatio = clampSplitRatio(persistedRatios.anchoredSplitRatio);

  } else if (mode === 'split-horizontal') {

    next.pinnedAppId = null;

    const eligible =

      splitEligibleAppIds?.length

        ? splitEligibleAppIds.filter((id) => runningAppIds.includes(id))

        : runningAppIds;

    next.secondaryAppId = pickSplitSecondaryAppId(activeTabId, eligible, tabOrderIds);

    next.splitRatio = clampSplitRatio(persistedRatios.splitHorizontalRatio);

  } else {

    next.pinnedAppId = null;

    next.secondaryAppId = null;

  }



  return sanitizeAppWorkspaceLayout(next, runningAppIds, splitEligibleAppIds, tabOrderIds);

}

/** Ids that still occupy the workspace (running apps minus minimized ones). */
export function resolveActiveWorkspaceAppIds(
  runningAppIds: readonly string[],
  minimizedAppIds: readonly string[],
): string[] {
  if (minimizedAppIds.length === 0) {
    return [...runningAppIds];
  }
  const minimized = new Set(minimizedAppIds);
  return runningAppIds.filter((id) => !minimized.has(id));
}

/** True when apps are running but every one of them is minimized. */
export function isWorkspaceFullyMinimized(
  runningAppIds: readonly string[],
  minimizedAppIds: readonly string[],
): boolean {
  return (
    runningAppIds.length > 0 &&
    minimizedAppIds.length > 0 &&
    resolveActiveWorkspaceAppIds(runningAppIds, minimizedAppIds).length === 0
  );
}

/**
 * Drop minimized apps out of the persisted selection: a minimized app must not stay
 * primary/secondary/pinned, and split modes collapse to tabs when <2 active apps remain.
 */
export function resolveLayoutWithMinimizedApps(
  layout: AppWorkspaceLayoutState,
  activeAppIds: readonly string[],
): AppWorkspaceLayoutState {
  const active = [...activeAppIds];
  if (active.length === 0) {
    return {
      ...layout,
      primaryAppId: null,
      secondaryAppId: null,
      pinnedAppId: null,
    };
  }
  return sanitizeAppWorkspaceLayout(layout, active);
}

/** Restore target: the requested app when it is still minimized, else the first minimized one. */
export function resolveRestoredAppId(
  preferredAppId: string | null | undefined,
  minimizedAppIds: readonly string[],
): string | null {
  if (minimizedAppIds.length === 0) {
    return null;
  }
  if (preferredAppId && minimizedAppIds.includes(preferredAppId)) {
    return preferredAppId;
  }
  return minimizedAppIds[0] ?? null;
}

/** Next app to surface after minimizing one app (prefers the next non-minimized tab). */
export function resolveNextActiveAfterMinimize(
  minimizedAppId: string,
  tabOrderIds: readonly string[],
  activeAppIds: readonly string[],
  minimizedAppIds: readonly string[],
): string | null {
  const minimized = new Set([...minimizedAppIds, minimizedAppId]);
  const stillActive = activeAppIds.filter((id) => !minimized.has(id));
  if (stillActive.length === 0) {
    return null;
  }
  const index = tabOrderIds.indexOf(minimizedAppId);
  if (index === -1) {
    return stillActive[0] ?? null;
  }
  for (let offset = 1; offset < tabOrderIds.length; offset += 1) {
    const candidate = tabOrderIds[(index + offset) % tabOrderIds.length];
    if (candidate && stillActive.includes(candidate)) {
      return candidate;
    }
  }
  return stillActive[0] ?? null;
}


