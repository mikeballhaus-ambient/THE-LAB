import type {
  LabSidecarChatContext,
  LabViewMode,
} from '@/shared/types/lab-sidecar-view-context';
import { formatLabShellOverlayGuidance } from '@/shared/composables/lab-sidecar/format-lab-shell-overlay-guidance';
import {
  formatAppsHomeCatalogRegistry,
  type LabSidecarCatalogAppEntry,
} from '@/shared/composables/lab-sidecar/format-lab-sidecar-catalog-registry';
import { LAB_SHELL_LABORATORY_VIEW_AGENT_GLOSSARY } from '@/shared/constants/lab-shell-naming';
import {
  LAB_SIDECAR_GAME_VIEW_PLAY,
  LAB_SIDECAR_HOST_CTX_GAME_VIEW,
} from '@/shared/constants/lab-game-assistant-opponent';

const VIEW_MODE_LABELS: Record<LabViewMode, string> = {
  apps_home: 'Apps home (catalog)',
  single_app: 'Single app focused',
  split_apps: 'Split workspace (two apps visible)',
  lab_assistant_full: 'Full Laboratory view (formerly Lab Assistant view)',
};

function formatHostContext(hostContext?: Record<string, string>): string {
  if (!hostContext || Object.keys(hostContext).length === 0) {
    return '';
  }
  const lines = Object.entries(hostContext).map(([key, value]) => `- ${key}: \`${value}\``);
  return `\n### Host context (from running app)\n${lines.join('\n')}\n`;
}

function formatAppInstructions(
  visibleAppIds: string[],
  focusedAppId: string | null,
  appInstructionsByAppId: Record<string, string>,
): string {
  const ids = [...new Set(visibleAppIds)];
  if (ids.length === 0) {
    return '\nNo mounted app system instructions apply in this view.\n';
  }

  const blocks: string[] = [];
  for (const appId of ids) {
    const instructions = appInstructionsByAppId[appId]?.trim();
    const focusNote = appId === focusedAppId ? ' **(UI automation default target)**' : '';
    if (!instructions) {
      blocks.push(`#### App \`${appId}\`${focusNote}\n(No app system instructions in registry.)\n`);
      continue;
    }
    const trimmed =
      instructions.length > 12_000
        ? `${instructions.slice(0, 11_997)}...\n[Truncated — use app_management_get_app if needed.]`
        : instructions;
    blocks.push(`#### App \`${appId}\`${focusNote}\n${trimmed}\n`);
  }
  return `\n### App system instructions\n${blocks.join('\n')}`;
}

function formatIntegrationGuidance(ctx: LabSidecarChatContext): string {
  if (ctx.toolProfile !== 'integration' && !ctx.integrationIntent) {
    return '';
  }
  return `
### Integration mode (rm-64)

The user is wiring **app integrations** (bindings, stubs, manifests). Prefer:

1. **Silent switch to Code (first tool call)** — \`persona_manager_switch_persona\` → \`Code\` when you are not already Code (no narration). Chat/Orchestrator cannot wire bindings without this.
2. **Platform tools only** — \`lab_integrations_*\` (never \`write_query\` on \`lab_integration_bindings\`).
3. **Source edits** — \`src/apps/{host-id}/\` for host shell / layout when playbooks require it; use \`read_file\` / \`update_file\` here (integration Sidecar profile allows them).

Do not tell the user to open Laboratory unless a tool is blocked by allowlist. App Builder profile still requires Laboratory for source edits.
`;
}

function formatAppBuilderGuidance(ctx: LabSidecarChatContext): string {
  if (ctx.toolProfile !== 'app_builder') {
    return '';
  }
  return `
### App Builder mode (consultation first, narrow tools)

The user is planning or creating a THE-LAB app. **Do not call \`app_management_create_app\` (or other registry mutators) until the user explicitly approves a written plan** after you finish discovery.

**Persona (first — before any other tool):** The shell opens this Sidecar session as **Code** so App Management scaffold tools are allowed. If the active persona is not **Code**, call \`persona_manager_switch_persona\` → **Code** immediately (no narration) before discovery or scaffold. **Chat** cannot create apps — never stay on Chat for this flow.

When the first user message includes \`[THE-LAB App Builder — new app consultation]\`, treat the embedded draft (name, icon, description) as a starting point — confirm and refine it.

**Discovery (before any create):**
1. Ask clarifying questions: users, daily workflows, data to store, integrations with other Lab apps, admin vs member needs.
2. **Catalog tags (mandatory on scaffold):** If the consultation says **Recommend for me**, propose primary + optional secondary tag **ids** (lowercase slugs, e.g. \`examples\`, \`demo-training\`) and get explicit user confirmation. If the user already picked a tag in the wizard, use that id as primary. **Never** tell the user tags will be applied later via Settings or a separate API — they must be on **\`app_management_create_app\`**.
3. Recommend **browser**, **server**, or **hybrid** with a short plain-language rationale.
4. Propose a registry **app id** (\`app-\` kebab-case) and run **\`app_management_get_apps\`** to check collisions — still no create until approval.
5. Summarize agreed scope (name, id, type, icon, description, **\`catalogTagIds\` in order**, system-instruction outline) and ask: *"Should I scaffold this app in the registry now?"*

**After explicit approval only:**
1. **\`app_management_create_app\`** — scaffold registry row + \`src/apps/{id}/\` (requires **create-apps** permission). **Required:** include **\`catalogTagIds\`** (primary first) or **\`catalogTags\`** on **this same tool call**. Omitting them puts the app under **Other apps** on the home grid. The platform creates missing tags and links the app — do not skip parameters because you already mentioned tags in chat.
2. **\`app_management_update_app\`** — metadata, system instructions, **dependencies** (e.g. Forms Builder, Chart Builder), server port.
3. **App DB helpers** (\`app_management_add_table\`, etc.) — only after the app exists.

**Reuse THE-LAB apps — do not reinvent:**
- Before custom UI, run **\`app_management_get_apps\`** and consider existing catalog apps (Task List, Help Desk, CRM, Forms Builder, Chart Builder, Financial Ledger, Approvals, Workflow Studio, etc.).
- During discovery, say when the user should **depend on** or **integrate with** an existing app instead of rebuilding the same feature.

**After template scaffold (critical — tell the user before coding in Laboratory):**
- **Data entry / CRUD dialogs:** **Forms Builder** + **rm-64** (\`form.surface\` slots, host connectors, \`lab_integrations_*\` in Laboratory). **Never** plan “we’ll build the forms in Vue in the host” as the main approach.
- **Reports / dashboards:** **Chart Builder** + **\`chart.surface\`** bindings. **Never** plan ad-hoc Chart.js pages in the host as the primary reports layer.
- Point implementers to \`docs/platform/lab-app-integrations.md\` and copy patterns from Task List / Help Desk / CRM app instructions.

For **Vue/server implementation** after scaffold, direct the user to **Open Laboratory** (stay on **Code**) — file/repo MCP tools are unavailable in this Sidecar profile. Use **UI automation** only to **launch** the new app on the catalog when the user asks to try it.
`;
}

function sidecarCatalogLaunchInScope(ctx: LabSidecarChatContext): boolean {
  if (ctx.shellOverlay || ctx.viewMode === 'lab_assistant_full') {
    return false;
  }
  return true;
}

function formatFocusedAppUiAutomationGuidance(ctx: LabSidecarChatContext): string {
  if (
    ctx.shellOverlay ||
    ctx.viewMode === 'lab_assistant_full' ||
    ctx.viewMode === 'apps_home' ||
    !ctx.focusedAppId
  ) {
    return '';
  }

  const visible =
    ctx.visibleAppIds.length > 0
      ? ctx.visibleAppIds.map((id) => `\`${id}\``).join(', ')
      : '(none)';

  return `
### In-app UI automation (workspace already open)

The user is on the **apps workspace with apps mounted** — not apps home only. **Do not** launch or re-open apps that are already visible or running (${visible}). In particular, when **Focused app** is \`${ctx.focusedAppId}\`, **never** say you will "launch" that app from the catalog; automate **inside the mount** instead.

1. **Default scope:** the **focused** app — \`ui_automation_discover_elements\` with \`contextArea\` from that app's system instructions (root class, e.g. \`lab-workflow-studio-app\`) or \`app-loaded-container\` scoped to \`#tab-container-${ctx.focusedAppId}\` / \`[data-app-pane-app-id="${ctx.focusedAppId}"]\`.
2. **List rows (Edit / Delete / New):** use \`searchPattern\` on the record **name** (e.g. workflow title substring), **not** the word \`edit\`. Prefer discover rows with \`uiRole: "record-action"\` and \`recordAction.action: "edit"\`, then \`elementRef\` — follow the focused app's **UI automation** section below. **Host context (\`setContext\`) is optional**; row actions use \`data-lab-record-*\` on the control.
3. **Catalog launch** is only for opening a **different** app that is **not** in **Visible apps** or **Workspace running apps** — compact **app launcher sidebar**, not a repeat Launch on the current app.
4. **Close / teardown** — there is **no** MCP app teardown tool. Use \`ui_automation_discover_elements\` with \`contextArea: "lab-workspace-tabbar"\` (or \`app-view-layout\`) and \`searchPattern\` \`close\` plus the app name if needed; prefer \`uiRole: "workspace-tab"\` with \`shellAction.action: "close-app"\` and matching \`targetAppId\`, or catalog \`data-lab-catalog-action="close-tab"\` on the launcher sidebar row (\`uiRole: "catalog-launch"\`).
5. **Switch tab:** \`contextArea: "lab-workspace-tabbar"\`, \`searchPattern\` = app display name or registry id → \`shellAction.action: "focus-app-tab"\` on the tab button.
6. **Split / layout:** same tab bar context — \`shellAction.action: "layout-split-horizontal"\` (\`Split ↔\`), \`layout-tabs\`, or \`layout-anchored\` (Form designer).
7. **Rails:** collapsed launcher → \`contextArea: "lab-catalog-sidebar-rail"\` + \`searchPattern: "app launcher"\` → \`shellAction: "expand-catalog-sidebar"\`. Minimized apps → \`lab-running-apps-rail\` + \`restore-app\` with \`targetAppId\`.
`;
}

function formatLabWorkspaceChromeSummary(ctx: LabSidecarChatContext): string {
  if (!ctx.workspaceRunningAppIds?.length) {
    return '';
  }
  const layoutLine = ctx.workspaceLayoutMode
    ? `\n- **Workspace layout mode:** \`${ctx.workspaceLayoutMode}\``
    : '';
  return `\n### Lab shell workspace (UI automation only)${layoutLine}
- **Tab bar:** \`contextArea: "lab-workspace-tabbar"\` or \`"app-view-layout"\` — tabs, close, minimize, Split ↔.
- **Launcher sidebar:** \`lab-app-catalog-sidebar\` / \`lab-catalog-sidebar-rail\` — Launch, \`close-tab\`, expand/collapse.
- **Running apps rail:** \`lab-running-apps-rail\` — Restore (\`restore-app\`), Close (\`close-app\`).
`;
}

function resolveCatalogRegistryLayout(ctx: LabSidecarChatContext): 'full-grid' | 'compact-sidebar' {
  return (ctx.workspaceRunningAppIds?.length ?? 0) > 0 ? 'compact-sidebar' : 'full-grid';
}

function formatAppsCatalogAutomationGuidance(ctx: LabSidecarChatContext): string {
  if (!sidecarCatalogLaunchInScope(ctx)) {
    return '';
  }
  const compactSidebar = resolveCatalogRegistryLayout(ctx) === 'compact-sidebar';
  const catalogSurface = compactSidebar
    ? '**app launcher sidebar** (`lab-app-catalog-sidebar` inside `app-list-container`; expand `lab-catalog-sidebar-rail` if collapsed)'
    : '**apps home** catalog grid (`app-list-container`)';
  const discoverHint = compactSidebar
    ? 'Apps past a visible scroll area may still match — use the registry table below. Same Launch attrs (`lab-catalog-sidebar-launch`, `uiRole: "catalog-launch"`). Do **not** use the **running apps rail** for new launches (that rail is **Restore** for minimized apps).'
    : 'Apps past the first **8** in a category are **not on screen** until Show all / search — the registry still lists them.';

  const mountedNote =
    ctx.viewMode === 'single_app' || ctx.viewMode === 'split_apps'
      ? '\n**Skip this section** when the requested app is already **Visible** or **Focused** — use **In-app UI automation** above instead.\n'
      : '';

  return `
### Apps catalog — launch / open **additional** apps

The user is on the apps workspace with ${catalogSurface}. There is **no** MCP tool that **launches** or **teardowns** apps — only UI automation (discover → click).
${mountedNote}
When they ask to **launch**, **open**, or **start** an app that is **not already running** (e.g. CRM, Help Desk):

1. Resolve the app from **full registry (enabled)** below (exact **display name** or **registry id**). Use **\`ui_automation_discover_elements\`** with \`contextArea: "app-list-container"\` (or \`"lab-app-catalog-sidebar"\`) and \`searchPattern\` set to that name or id — **not** a CSS selector. Discover **auto-applies** that term to **Search apps…** and expands a collapsed launcher sidebar when needed. ${discoverHint} Without \`searchPattern\`, discovery omits Launch rows. Click rows with \`uiRole: "catalog-launch"\` via \`elementRef\`.
2. Use **\`ui_automation_element_action\`** with \`actions: [{ order: 1, elementRef: "<from discover row>", action: "click" }]\` (prefer \`elementRef\`; \`target\` from the same row is fallback) on **Launch** (not Teardown when the app is not running).
3. **Wait for the app in the UI (up to 30 seconds total):** After the Launch click, **repeat** \`ui_automation_discover_elements\` (and \`ui_automation_element_action\` only if you must retry Launch) until the app is clearly available — e.g. a workspace tab for that app, \`#tab-container-{app-id}\`, \`[data-app-pane-app-id="{app-id}"]\` visible, or the catalog card shows a running/open state. Between polls, use short \`awaiter\` waits (2–3 seconds) when configured, or continue tool rounds without idle chatter.
4. **Success:** Once the app is available, send the user a **short confirmation** (app name + that it is open/ready).
5. **Timeout:** If the app is still not available after **30 seconds**, tell the user launch **failed or timed out**, what you last saw (errors, loading, missing tab), and one manual next step.

Prefer **executing** these tools over telling the user to click Launch themselves. Do not claim success until step 3 passes.
`;
}

function formatCatalogPinGuidance(ctx: LabSidecarChatContext): string {
  if (!sidecarCatalogLaunchInScope(ctx)) {
    return '';
  }
  return `
### Apps catalog — pin / favorite (star)

Each catalog card has a **star** control next to **Launch** (\`uiRole: "catalog-pin"\`, \`data-lab-catalog-action="toggle-pin"\`, aria-label **Pin app** / **Unpin app**). Pinned apps show in the **Pinned** section when filters are cleared.

When the user asks to **favorite**, **pin**, or **star** an app:

1. \`ui_automation_discover_elements\` with \`contextArea: "app-list-container"\` and \`searchPattern\` = display name or registry id (e.g. Billiards).
2. \`ui_automation_element_action\` **click** the discover row with \`uiRole: "catalog-pin"\` (not **Launch** / \`catalog-launch\`).
3. Short confirmation — do **not** say the catalog has no favorites or star feature.
`;
}

function formatCatalogEditTagsGuidance(ctx: LabSidecarChatContext): string {
  if (!sidecarCatalogLaunchInScope(ctx)) {
    return '';
  }
  return `
### Apps catalog — edit tags (permissioned)

Grid cards expose **Tags** for users with catalog-tag permission (\`uiRole: "catalog-edit-tags"\`, \`data-lab-catalog-action="edit-tags"\`, aria-label **Edit catalog tags for …**). Only present when the user can modify tags for that app.

1. Discover with \`contextArea: "app-list-container"\` and \`searchPattern\` = app display name or registry id.
2. Click the row with \`uiRole: "catalog-edit-tags"\` (not Launch / Pin).
3. In \`lab-app-catalog-tags-dialog\`, discover **Save** / **Cancel** (\`contextArea: "lab-app-catalog-tags-dialog"\` or \`p-dialog-mask\`) and act. User must have permission — if the control is missing, say they lack tag edit access.

**Category filters:** \`searchPattern\` = tag label (e.g. Games) returns \`uiRole: "catalog-tag-filter"\` chips in the category nav; click to filter the grid. **Clear filters** uses the same role.
`;
}

function formatGameMatchSidecarGuidance(hostContext?: Record<string, string>): string {
  if (hostContext?.[LAB_SIDECAR_HOST_CTX_GAME_VIEW] !== LAB_SIDECAR_GAME_VIEW_PLAY) {
    return '';
  }
  return `

## Vs–Lab Assistant match (Sidecar companion)

The user is playing a catalog game against the **Lab Assistant** opponent (in-game moves run on the app server, not via this chat).

**Sidecar voice:** you are the **Lab Assistant at the table** — same opponent as on the board — doing **table talk only**, not move execution. Keep banter **PG, warm, and good-natured** (friendly lab tablemate; light humor about the position, not digs at the person). No profanity, trash talk, insults, gloating, or harsh edge.

- Proactive banter lines include **authoritative facts** (who just moved: human vs Lab Assistant). Follow those facts; do not guess from old chat messages.
- When **you** moved: first-person reaction (never praise the human for your capture/check).
- When the **human** moved: friendly opponent tone (mild surprise, easy banter about the position, brief respect for a sharp line) — not a neutral coach saying "good move" every capture.
- Speak on **important moments** only; do not narrate every ply.
- Optional light nudge if the human thinks a long time: **opponent waiting at the table** (playful and patient, never needling) — never coach lines like "every move counts" or "taking your time makes sense"; vary wording each nudge.
- Do not call game APIs or play moves unless the user asks for rules/UI help.
- When the user sends Sidecar chat during play, their message may include a **live match snapshot** (full turn history, human-visible game state JSON, whose turn, scores). Treat it as authoritative for that reply.
- **User Sidecar replies:** answer what they asked as the **Lab Assistant opponent** — use snapshot/JSON for facts. Address them as **you** or with no direct address; do **not** use their profile display name in every message (no repeated "Well played, {name}" banter). Their name in the snapshot is metadata for reasoning only — at most a rare first-name nod when it truly fits. Do **not** announce turns or read metadata aloud (no "seat 1/2", "your turn now", "what's next?", or coach check-ins). Snapshot bullets are internal only.
- Proactive **banter** completions include the same snapshot so table talk matches the board.
`;
}

/**
 * Markdown appendix merged into the chat system message when the user sends from Lab Sidecar.
 */
export function formatLabSidecarSystemPromptAppendix(
  ctx: LabSidecarChatContext,
  appInstructionsByAppId: Record<string, string> = {},
  catalogRegistry?: LabSidecarCatalogAppEntry[],
): string {
  const splitLine =
    ctx.splitAppIds && ctx.splitAppIds.length === 2
      ? `\n- Split panes (leading → trailing): \`${ctx.splitAppIds[0]}\` | \`${ctx.splitAppIds[1]}\``
      : '';

  const visible =
    ctx.visibleAppIds.length > 0
      ? ctx.visibleAppIds.map((id) => `\`${id}\``).join(', ')
      : '(none)';

  const shellOverlayBlock = formatLabShellOverlayGuidance(ctx.shellOverlay);
  const automationFocusLine = ctx.shellOverlay
    ? 'When a **shell overlay** is open (below), **ui_automation** must target that overlay first — mounted apps are still listed for background context only.'
    : ctx.focusedAppId && (ctx.viewMode === 'single_app' || ctx.viewMode === 'split_apps')
      ? `**ui_automation** default target: the **focused** app mount (\`${ctx.focusedAppId}\`). Do not launch that app from the catalog — it is already open.`
      : 'When using **ui_automation** tools, prefer the focused app mount unless the user names another visible app.';

  const runningWorkspaceLine =
    (ctx.workspaceRunningAppIds?.length ?? 0) > 0
      ? `\n- **Workspace running apps (includes minimized):** ${ctx.workspaceRunningAppIds!.map((id) => `\`${id}\``).join(', ')}\n- **Catalog UI:** compact **app launcher sidebar** (Launch) + optional **running apps rail** (Restore parked apps)\n`
      : '';

  const registryLayout = resolveCatalogRegistryLayout(ctx);

  return `---

# LAB SIDECAR VIEW CONTEXT

The user sent this message from the **Lab Sidecar** (in-app assistant panel), not the full-screen **Laboratory** workspace. When a **Lab user display name** appendix is present in the system message, use it sparingly (see that section).

${LAB_SHELL_LABORATORY_VIEW_AGENT_GLOSSARY}

- **View mode:** ${VIEW_MODE_LABELS[ctx.viewMode]}
- **Visible apps:** ${visible}
- **Focused app (underlying workspace):** ${ctx.focusedAppId ? `\`${ctx.focusedAppId}\`` : '(none)'}${splitLine}${runningWorkspaceLine}
${ctx.shellOverlay ? `- **Shell overlay (foreground):** \`${ctx.shellOverlay.kind}\`\n` : ''}
${automationFocusLine}
${shellOverlayBlock}${formatLabWorkspaceChromeSummary(ctx)}${formatFocusedAppUiAutomationGuidance(ctx)}${formatGameMatchSidecarGuidance(ctx.hostContext)}${formatIntegrationGuidance(ctx)}${formatAppBuilderGuidance(ctx)}${formatAppsCatalogAutomationGuidance(ctx)}${formatCatalogPinGuidance(ctx)}${formatCatalogEditTagsGuidance(ctx)}${
    catalogRegistry?.length ? formatAppsHomeCatalogRegistry(catalogRegistry, registryLayout) : ''
  }${formatHostContext(ctx.hostContext)}${formatAppInstructions(ctx.visibleAppIds, ctx.focusedAppId, appInstructionsByAppId)}`;
}
