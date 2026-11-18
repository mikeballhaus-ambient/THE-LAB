/**
 * User-facing shell labels and agent glossary for THE-LAB dashboard views.
 *
 * **Laboratory** — full-screen AI chat workspace (quick nav, brand comment-dots).
 * Former product copy called this the "Lab Assistant view".
 *
 * **Apps workspace** — catalog + mounted apps (Sidecar Assistant panel on this surface).
 * **Lab Sidecar** — in-context Assistant panel on the apps workspace.
 */

/** Quick nav + brand control label for full-screen chat focus. */
export const LAB_SHELL_LABORATORY_VIEW_LABEL = 'Laboratory';

/** Agent/system prompt alias line (include in docs when renaming surfaces). */
export const LAB_SHELL_LABORATORY_VIEW_AGENT_GLOSSARY =
  '**Lab Assistant** is the AI teammate (personas + MCP). **Laboratory** is the full-screen workspace (quick nav "Laboratory" or brand comment-dots; formerly "Lab Assistant view"). **Lab Sidecar** is the top-right **Lab Assistant** panel on the apps workspace for in-context app help.';

export const LAB_SHELL_FOCUS_LABORATORY_ARIA = 'Focus Laboratory';
export const LAB_SHELL_OPEN_LABORATORY_ARIA =
  'Open Laboratory with the current chat session';

/** Collapsed rail + expanded panel title for Lab Sidecar (apps workspace). */
export const LAB_SHELL_SIDECAR_LAB_ASSISTANT_LABEL = 'Lab Assistant';

export const LAB_SHELL_OPEN_SIDECAR_ARIA = 'Open Lab Assistant panel';
export const LAB_SHELL_COLLAPSE_SIDECAR_ARIA = 'Collapse Lab Assistant panel';
export const LAB_SHELL_SIDECAR_PANEL_ARIA = 'Lab Assistant side panel';

/** Compact app launcher while workspace tabs are open. */
export const LAB_SHELL_CATALOG_SIDEBAR_LABEL = 'Apps';

export const LAB_SHELL_OPEN_CATALOG_SIDEBAR_ARIA = 'Open app launcher';
export const LAB_SHELL_COLLAPSE_CATALOG_SIDEBAR_ARIA = 'Collapse app launcher';
export const LAB_SHELL_CATALOG_SIDEBAR_PANEL_ARIA = 'App launcher panel';

/** Minimized-but-running apps rail shown when the app workspace is collapsed. */
export const LAB_SHELL_RUNNING_APPS_LABEL = 'Running apps';

export const LAB_SHELL_RUNNING_APPS_PANEL_ARIA = 'Running apps panel';
export const LAB_SHELL_OPEN_RUNNING_APPS_ARIA = 'Open running apps panel';
export const LAB_SHELL_COLLAPSE_RUNNING_APPS_ARIA = 'Collapse running apps panel';
export const LAB_SHELL_RESTORE_APP_ARIA = 'Restore app to workspace';
export const LAB_SHELL_MINIMIZE_APP_ARIA = 'Minimize app';
export const LAB_SHELL_MINIMIZE_ALL_APPS_ARIA = 'Minimize all open apps';
