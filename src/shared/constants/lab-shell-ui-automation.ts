/**
 * Lab shell DOM context areas for ui_automation_discover_elements.
 * Match is substring on element class names (`[class*="name"]` in UIAutomationHandler).
 *
 * Apps catalog (rm-51 tag/hero revamp): full grid lives under `app-list-container`;
 * when other apps are running, compact launch rows use `lab-app-catalog-sidebar`.
 */
export const LAB_SHELL_UI_AUTOMATION_CONTEXT_AREAS = [
  'the-lab-container',
  'app-view-container',
  'app-list-container',
  'app-catalog-toolbar',
  'app-catalog-body',
  'lab-app-catalog-sidebar',
  'lab-app-catalog-sidebar-shell',
  'lab-catalog-sidebar-rail',
  'lab-running-apps-rail',
  'lab-running-apps-rail-shell',
  'app-catalog-section',
  'app-catalog-grid',
  'app-card-container',
  'app-card-grid',
  'app-loaded-container',
  'lab-workflow-studio-app',
  'lab-workflows-management',
  'lab-workflows-list',
  'tabs-wrapper',
  'app-workspace-mount-root',
  'lab-workspace-tabbar',
  'app-view-layout',
  'lab-assistant-container',
  'session-tabs-container',
  'messages-view-container',
  'message-input-container',
  'settings-container',
  'lab-settings-dialog',
  'lab-messages-dialog',
  'lab-notifications-dialog',
  'lab-quarks-wallet-dialog',
  'lab-app-catalog-tags-dialog',
  'p-dialog-mask',
  'body',
] as const;

export const LAB_CATALOG_DEFAULT_CONTEXT_AREA = 'app-list-container';

export const LAB_CATALOG_APP_ID_ATTR = 'data-app-id';
export const LAB_CATALOG_APP_NAME_ATTR = 'data-appname';
export const LAB_CATALOG_LAUNCH_ACTION_ATTR = 'data-lab-catalog-action';
export const LAB_CATALOG_LAUNCH_ACTION_VALUE = 'launch';
export const LAB_CATALOG_CLOSE_TAB_ACTION_VALUE = 'close-tab';
export const LAB_CATALOG_TOGGLE_PIN_ACTION_VALUE = 'toggle-pin';
export const LAB_CATALOG_EDIT_TAGS_ACTION_VALUE = 'edit-tags';
export const LAB_CATALOG_FILTER_TAG_ACTION_VALUE = 'filter-tag';

/** Narrow catalog discovery to launch/toolbar controls (avoids hundreds of layout divs). */
export const LAB_CATALOG_LAUNCH_INTERACTIVE_SELECTOR = [
  'button[data-app-id]',
  'button[data-appname]',
  'button.lab-catalog-launch',
  'button.lab-catalog-sidebar-launch',
  'input.lab-catalog-search',
  'button.lab-catalog-tag-chip',
  'button.app-catalog-hero-carousel__nav',
  '.lab-catalog-type-filter button',
  'button.app-card-grid__deps-link',
  'button.app-card-grid__tags-link',
  'button.lab-catalog-sidebar-rail',
  'button.lab-running-apps-rail-tab',
  'button.lab-running-apps-rail__restore',
  'button.lab-running-apps-rail__close',
].join(', ');

export const LAB_CATALOG_DISCOVERY_CONTEXT_AREAS = [
  'app-list-container',
  'lab-app-catalog-sidebar',
  'app-catalog-toolbar',
] as const;

function escapeCatalogSelectorValue(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

export function buildLabCatalogLaunchTargetSelector(tagName: string, appId: string): string {
  const id = escapeCatalogSelectorValue(appId);
  const tag = tagName.toLowerCase();
  return `${tag}[${LAB_CATALOG_APP_ID_ATTR}="${id}"][${LAB_CATALOG_LAUNCH_ACTION_ATTR}="${LAB_CATALOG_LAUNCH_ACTION_VALUE}"]`;
}

type CatalogLaunchPtVariant = 'grid' | 'list' | 'sidebar';

/** PrimeVue Button PT — guarantees launch attrs on the root <button> for UI automation. */
export function labCatalogLaunchButtonPt(
  generateUniqueId: (prefix: string) => string,
  appId: string,
  appName: string,
  variant: CatalogLaunchPtVariant,
  actionVerb = 'Launch',
) {
  const launchLabel = `${actionVerb} ${appName}`;
  const rootAttrs: Record<string, string> = {
    id: generateUniqueId(`lab-catalog-launch-${appId}`),
    [LAB_CATALOG_APP_NAME_ATTR]: appName,
    [LAB_CATALOG_APP_ID_ATTR]: appId,
    'aria-label': launchLabel,
  };
  if (actionVerb === 'Launch') {
    rootAttrs[LAB_CATALOG_LAUNCH_ACTION_ATTR] = LAB_CATALOG_LAUNCH_ACTION_VALUE;
  }

  if (variant === 'sidebar') {
    return {
      root: {
        class:
          'lab-catalog-sidebar-launch lab-catalog-launch lab-catalog-sidebar-launch-root w-full! max-w-full! justify-start! text-left!',
        attrs: rootAttrs,
      },
      label: { class: 'w-full! flex! justify-start! text-left!' },
    };
  }

  return {
    root: {
      class: 'lab-catalog-launch',
      attrs: rootAttrs,
    },
  };
}

/** Embedded in MCP tool descriptions (models + personas). */
export const LAB_SHELL_UI_AUTOMATION_CATALOG_GUIDANCE = `
Lab apps catalog (apps home):
- Outer shell: \`app-view-container\` (catalog + workspace). Prefer \`app-list-container\` to scope discovery to the catalog only.
- Full catalog (no apps in workspace tabs): hero carousel \`app-catalog-grid--hero\`, tag sections \`app-catalog-section--tag-group\`, toolbar \`app-catalog-toolbar\` (search \`lab-catalog-search\`, type filter, "Show server apps").
- Compact catalog (while other apps are open): \`lab-app-catalog-sidebar\` with \`lab-catalog-sidebar-launch\` buttons — still inside \`app-list-container\`.
- Launch controls: \`button[data-app-id="app-…"][data-lab-catalog-action="launch"]\`, \`data-appname="<display name>"\`, \`aria-label="Launch <display name>"\`. \`searchPattern\` matches display name, registry id (\`app-lab-workflow-studio\`), or \`aria-label\` — not the visible "Launch" label alone.
- Pin / favorite (star on grid cards): \`button[data-lab-catalog-action="toggle-pin"]\`, class \`lab-catalog-pin\`, \`aria-label="Pin app"\` / \`"Unpin app"\` — discover \`uiRole: "catalog-pin"\`.
- Catalog tag assignment (permissioned): \`button[data-lab-catalog-action="edit-tags"]\`, class \`lab-catalog-edit-tags\`, \`aria-label="Edit catalog tags for <display name>"\` — discover \`uiRole: "catalog-edit-tags"\`. Dialog: \`lab-app-catalog-tags-dialog\` (\`contextArea\` + Save/Cancel).
- Category nav filters: \`button.lab-catalog-tag-chip[data-lab-catalog-action="filter-tag"]\` — discover \`uiRole: "catalog-tag-filter"\` with \`searchPattern\` = tag label (e.g. Games).
- Category filters: \`lab-catalog-tag-chip\` / \`app-catalog-category-nav\` (optional; use \`searchPattern\` for app name when launching).
- After launch: workspace mount \`app-loaded-container\`, panes \`[data-app-pane-app-id="app-<id>"]\`, mount \`#tab-container-app-<id>\`.
- Removed: chat preview strip (rm-57) — do not use \`chat-preview\` as contextArea.
`.trim();

export const LAB_SHELL_CONTEXT_AREA_SCHEMA_HINT =
  `Container class substring. Catalog launch: ${LAB_CATALOG_DEFAULT_CONTEXT_AREA}. ` +
  `Also: app-catalog-body, lab-app-catalog-sidebar, app-loaded-container, lab-assistant-container, ` +
  `settings-container, lab-settings-dialog, lab-messages-dialog, lab-notifications-dialog, lab-quarks-wallet-dialog, p-dialog-mask.`;

/** FAQ / SearchPattern sections in seeded \`app_system_instructions\`. */
export const LAB_UI_AUTOMATION_TOOLS_PHRASE =
  '`ui_automation_discover_elements` and `ui_automation_element_action`';

export function formatLabCatalogLaunchSearchBullet(displayName: string, appId?: string): string {
  const idHint = appId ? ` or registry id \`${appId}\`` : '';
  return (
    `- **Launch:** \`app-list-container\` or \`lab-app-catalog-sidebar\` (when workspace tabs are open); ` +
    `\`searchPattern\` **display name** (\`${displayName}\`)${idHint} or click \`button[data-app-id="…"][data-lab-catalog-action="launch"]\` from discovery \`target\`.`
  );
}

export function formatLabCatalogLaunchFaq(displayName: string): string {
  return (
    `- \`ui_automation_discover_elements\` with \`contextArea: "app-list-container"\` ` +
    `(or \`lab-app-catalog-sidebar\` when workspace tabs are open); ` +
    `\`ui_automation_element_action\` click \`[data-appname="${displayName}"]\`.`
  );
}

export function formatLabCatalogLaunchTableRow(displayName: string): string {
  return (
    `| Launch (dashboard) | \`app-list-container\` / \`lab-app-catalog-sidebar\` | ` +
    `\`[data-appname="${displayName}"]\` — grid or \`lab-catalog-sidebar-launch\` |`
  );
}

export { LAB_RECORD_AUTOMATION_GUIDANCE } from '@/shared/constants/lab-record-automation';
