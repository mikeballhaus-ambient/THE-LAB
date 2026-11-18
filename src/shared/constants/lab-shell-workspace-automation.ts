/**
 * Lab **workspace** shell controls (tab bar, layout pills) — rm-68.4.
 * Agents launch/teardown/switch apps via UI automation only (no MCP launch tools).
 */

import { LAB_CATALOG_APP_ID_ATTR } from '@/shared/constants/lab-shell-ui-automation';

export const LAB_SHELL_ACTION_ATTR = 'data-lab-shell-action';
export const LAB_SHELL_TARGET_APP_ID_ATTR = 'data-lab-target-app-id';

export type LabShellRailAction =
  | 'expand-catalog-sidebar'
  | 'collapse-catalog-sidebar'
  | 'expand-running-apps-rail'
  | 'collapse-running-apps-rail'
  | 'restore-app';

export type LabShellWorkspaceAction =
  | LabShellRailAction
  | 'focus-app-tab'
  | 'close-app'
  | 'minimize-app'
  | 'minimize-all-apps'
  | 'layout-tabs'
  | 'layout-split-horizontal'
  | 'layout-anchored';

export type LabShellDiscoverUiRole =
  | 'workspace-tab'
  | 'workspace-layout'
  | 'workspace-chrome'
  | 'shell-rail';

export type LabShellActionDiscoverMeta = {
  action: LabShellWorkspaceAction;
  targetAppId?: string;
};

const LAB_SHELL_RAIL_ACTIONS = new Set<LabShellWorkspaceAction>([
  'expand-catalog-sidebar',
  'collapse-catalog-sidebar',
  'expand-running-apps-rail',
  'collapse-running-apps-rail',
  'restore-app',
]);

export function resolveShellActionUiRole(
  action: LabShellWorkspaceAction,
): LabShellDiscoverUiRole {
  if (LAB_SHELL_RAIL_ACTIONS.has(action)) return 'shell-rail';
  if (action === 'minimize-all-apps') return 'workspace-chrome';
  if (action.startsWith('layout-')) return 'workspace-layout';
  return 'workspace-tab';
}

export function readLabShellActionDiscoverMeta(
  el: HTMLElement,
): LabShellActionDiscoverMeta | undefined {
  const action = el.getAttribute(LAB_SHELL_ACTION_ATTR)?.trim() as
    | LabShellWorkspaceAction
    | undefined;
  if (!action) return undefined;
  const targetAppId = el.getAttribute(LAB_SHELL_TARGET_APP_ID_ATTR)?.trim();
  return {
    action,
    ...(targetAppId ? { targetAppId } : {}),
  };
}

export function isLabShellWorkspaceControl(el: HTMLElement): boolean {
  return Boolean(el.getAttribute(LAB_SHELL_ACTION_ATTR)?.trim());
}

function escapeSelectorValue(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

export function buildLabShellActionTargetSelector(
  tagName: string,
  action: LabShellWorkspaceAction,
  targetAppId?: string,
): string {
  const tag = tagName.toLowerCase();
  const actionEsc = escapeSelectorValue(action);
  let selector = `${tag}[${LAB_SHELL_ACTION_ATTR}="${actionEsc}"]`;
  if (targetAppId) {
    const idEsc = escapeSelectorValue(targetAppId);
    selector += `[${LAB_SHELL_TARGET_APP_ID_ATTR}="${idEsc}"]`;
  }
  return selector;
}

export function labShellFocusTabAttrs(
  appId: string,
  appName: string,
): Record<string, string> {
  return {
    [LAB_SHELL_ACTION_ATTR]: 'focus-app-tab',
    [LAB_SHELL_TARGET_APP_ID_ATTR]: appId,
    'aria-label': `Switch to ${appName} tab`,
  };
}

export function labShellCloseAppIconAttrs(
  appId: string,
  appName: string,
): Record<string, string> {
  return {
    [LAB_SHELL_ACTION_ATTR]: 'close-app',
    [LAB_SHELL_TARGET_APP_ID_ATTR]: appId,
    role: 'button',
    tabindex: '0',
    'aria-label': `Close ${appName}`,
  };
}

export function labShellMinimizeAppIconAttrs(
  appId: string,
  appName: string,
): Record<string, string> {
  return {
    [LAB_SHELL_ACTION_ATTR]: 'minimize-app',
    [LAB_SHELL_TARGET_APP_ID_ATTR]: appId,
    role: 'button',
    tabindex: '0',
    'aria-label': `Minimize ${appName}`,
  };
}

export function labShellMinimizeAllAttrs(): Record<string, string> {
  return {
    [LAB_SHELL_ACTION_ATTR]: 'minimize-all-apps',
    'aria-label': 'Minimize all open apps',
  };
}

export function labShellLayoutModeAttrs(
  action: Extract<
    LabShellWorkspaceAction,
    'layout-tabs' | 'layout-split-horizontal' | 'layout-anchored'
  >,
  ariaLabel: string,
): Record<string, string> {
  return {
    [LAB_SHELL_ACTION_ATTR]: action,
    'aria-label': ariaLabel,
  };
}

/** Catalog sidebar/grid when app is already running — teardown, not launch. */
export function labShellExpandCatalogSidebarAttrs(): Record<string, string> {
  return {
    [LAB_SHELL_ACTION_ATTR]: 'expand-catalog-sidebar',
    'aria-label': 'Open app launcher',
  };
}

export function labShellCollapseCatalogSidebarAttrs(): Record<string, string> {
  return {
    [LAB_SHELL_ACTION_ATTR]: 'collapse-catalog-sidebar',
    'aria-label': 'Collapse app launcher',
  };
}

export function labShellExpandRunningAppsRailAttrs(): Record<string, string> {
  return {
    [LAB_SHELL_ACTION_ATTR]: 'expand-running-apps-rail',
    'aria-label': 'Open running apps panel',
  };
}

export function labShellCollapseRunningAppsRailAttrs(): Record<string, string> {
  return {
    [LAB_SHELL_ACTION_ATTR]: 'collapse-running-apps-rail',
    'aria-label': 'Collapse running apps panel',
  };
}

export function labShellRestoreAppAttrs(
  appId: string,
  appName: string,
): Record<string, string> {
  return {
    [LAB_SHELL_ACTION_ATTR]: 'restore-app',
    [LAB_SHELL_TARGET_APP_ID_ATTR]: appId,
    [LAB_CATALOG_APP_ID_ATTR]: appId,
    'data-appname': appName,
    'aria-label': `Restore app to workspace: ${appName}`,
  };
}

export function labCatalogCloseTabRootAttrs(
  appId: string,
  appName: string,
  generateUniqueId: (prefix: string) => string,
): Record<string, string> {
  const label = `Close tab ${appName}`;
  return {
    id: generateUniqueId(`lab-catalog-close-${appId}`),
    [LAB_CATALOG_APP_ID_ATTR]: appId,
    'data-appname': appName,
    'data-lab-catalog-action': 'close-tab',
    [LAB_SHELL_ACTION_ATTR]: 'close-app',
    [LAB_SHELL_TARGET_APP_ID_ATTR]: appId,
    'aria-label': label,
  };
}
