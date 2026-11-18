export type AppWorkspaceMode =
  | 'tabs'
  | 'split-horizontal'
  | 'anchored';

/** @deprecated Removed from UI; migrated to split-horizontal on load */
export type LegacyAppWorkspaceMode = AppWorkspaceMode | 'split-vertical';

export interface AppWorkspaceLayoutState {
  mode: AppWorkspaceMode;
  primaryAppId: string | null;
  secondaryAppId: string | null;
  pinnedAppId: string | null;
  splitRatio: number;
}

export const DEFAULT_APP_WORKSPACE_LAYOUT: AppWorkspaceLayoutState = {
  mode: 'tabs',
  primaryAppId: null,
  secondaryAppId: null,
  pinnedAppId: null,
  splitRatio: 45,
};

export const FORMS_BUILDER_APP_ID = 'app-lab-formsbuilder';

/** Default active-app (leading) share in anchored / form-designer layout */
export const ANCHORED_HOST_SPLIT_RATIO = 62;

/** Plain object safe for IndexedDB structured clone */
export function cloneAppWorkspaceLayout(
  layout: AppWorkspaceLayoutState,
): AppWorkspaceLayoutState {
  return {
    mode: layout.mode,
    primaryAppId: layout.primaryAppId,
    secondaryAppId: layout.secondaryAppId,
    pinnedAppId: layout.pinnedAppId,
    splitRatio: layout.splitRatio,
  };
}

/** Dexie: only gutter positions — not mode or app IDs */
export interface AppViewLayoutPersistence {
  splitHorizontalRatio: number;
  anchoredSplitRatio: number;
}

export const DEFAULT_APP_VIEW_LAYOUT_PERSISTENCE: AppViewLayoutPersistence = {
  splitHorizontalRatio: DEFAULT_APP_WORKSPACE_LAYOUT.splitRatio,
  anchoredSplitRatio: ANCHORED_HOST_SPLIT_RATIO,
};

export function cloneAppViewLayoutPersistence(
  persistence: AppViewLayoutPersistence,
): AppViewLayoutPersistence {
  return {
    splitHorizontalRatio: persistence.splitHorizontalRatio,
    anchoredSplitRatio: persistence.anchoredSplitRatio,
  };
}
