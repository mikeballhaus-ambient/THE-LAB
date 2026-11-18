import {
  findSettingsNavItem,
  SETTINGS_ADMIN_VIEWS,
  type SettingsViewId,
} from '@/dashboard/components/settings/settings-nav';
import type { LabShellOverlayState } from '@/shared/types/lab-shell-overlay';

function settingsTabLabel(tabId: string | undefined): string {
  if (!tabId) {
    return '(unknown section)';
  }
  const item = findSettingsNavItem(tabId as SettingsViewId);
  return item?.label ?? tabId;
}

function formatSettingsOverlay(overlay: LabShellOverlayState): string {
  const tabId = overlay.settingsTabId ?? 'api';
  const tabLabel = settingsTabLabel(tabId);
  const adminOnly = SETTINGS_ADMIN_VIEWS.includes(tabId as SettingsViewId);
  const personaLine =
    tabId === 'personas'
      ? `\n- **Personas sub-nav:** persona \`${overlay.settingsPersonaTab ?? 'Chat'}\`, property tab \`${overlay.settingsPersonaPropertyTab ?? 'Role'}\`.`
      : '';

  return `
### Lab shell — Settings (modal)

The user has **Settings** open on top of the apps workspace. **UI automation and answers must target the Settings dialog first**, not mounted catalog apps, until they close Settings.

- **Active section:** \`${tabId}\` — **${tabLabel}**${personaLine}
- **Navigation:** left nav \`.lab-settings-nav__btn\` (active: \`.lab-settings-nav__btn--active\`). Personas tree uses child buttons \`.lab-settings-nav__btn--child\`.
- **Discover scope:** teleported PrimeVue dialog — search within the Settings dialog root (class includes \`lab-settings-dialog\`).
- **Changing values:** use **UI automation** on visible controls in the active section. Many sections also have **socket/MCP paths** (API providers, personas, MCP servers) — prefer automation when the user asked to "click" or "toggle"; use MCP when they name a structured update (e.g. persona tool allowlist).
${adminOnly ? '- **Role gate:** this section is **admin/owner only** — if automation shows disabled controls, explain permission limits; do not pretend changes succeeded.' : ''}
`;
}

function formatMessagesOverlay(overlay: LabShellOverlayState): string {
  const open = overlay.messagesOpenPartnerIds ?? [];
  const active = overlay.messagesActivePartnerId;
  return `
### Lab shell — Messages (lab-comms)

**Team DMs** use the **/lab-comms** socket namespace — not Laboratory \`SOCKET_EVENTS\`. There is no REST send/history API in v1.

- **Open conversation tabs:** ${open.length > 0 ? open.map((id) => `\`user:${id}\``).join(', ') : '(none)'}
- **Active thread:** ${active != null ? `\`user:${active}\`` : '(picker / no thread)'}
- **UI automation:** \`lab-messages-dialog\` — partner list and thread composer. Do not confuse with Laboratory chat.
`;
}

function formatNotificationsOverlay(overlay: LabShellOverlayState): string {
  const expanded = overlay.notificationsExpandedTitles ?? [];
  const selected = overlay.notificationsSelectedIds ?? [];
  return `
### Lab shell — Notifications

Grouped workflow/alert notifications (read/mark read/remove/run action). **Not** Laboratory chat.

- **Expanded groups:** ${expanded.length > 0 ? expanded.map((t) => `\`${t}\``).join(', ') : '(all collapsed)'}
- **Bulk selection:** ${selected.length > 0 ? `${selected.length} notification(s) checked for delete` : '(none selected)'}
- **UI automation:** teleported \`lab-notifications-dialog\`; expand group headers before acting on a row inside a collapsed group.
`;
}

const SHELL_DIALOG_CLOSE_WORKFLOW = `
**Close / dismiss this overlay:** do **not** invent PrimeVue header selectors (e.g. \`pcclosebutton\`) — they break JSON and often miss teleported DOM. Always:
1. \`ui_automation_discover_elements\` with \`contextArea\` set to this dialog's class (below) and \`searchPattern\` **Close** (or **close**).
2. \`ui_automation_element_action\` **click** using the **exact** \`target\` selector from discovery (footer **Close** button preferred over header icon).
3. Emit **valid JSON** for tool arguments — every string quoted; never truncate the \`target\` value.
`;

function formatQuarksOverlay(): string {
  return `
### Lab shell — Quarks wallet

Play-money **Quarks** balance and recent ledger (virtual bank). Read-only unless the user asks how Quarks work — do not move money via chat tools.

- **Discover scope:** \`contextArea: "lab-quarks-wallet-dialog"\` (teleported dialog root class).
- **Close wallet:** footer **Close** (or \`[data-lab-shell-action="close-quarks-wallet"]\` after discovery).
${SHELL_DIALOG_CLOSE_WORKFLOW}
`;
}

function formatAboutOverlay(overlay: LabShellOverlayState): string {
  const topic = overlay.aboutTopicTab ?? 'Getting Started';
  return `
### Lab shell — About THE-LAB

**Read-only** product help. **Do not** attempt Settings changes or app launches from here unless the user explicitly switches surfaces.

- **Active topic tab:** \`${topic}\`
- **UI automation:** only when the user asks to scroll or highlight About copy; no configuration controls.
`;
}

export function formatLabShellOverlayGuidance(overlay: LabShellOverlayState | undefined): string {
  if (!overlay) {
    return '';
  }

  switch (overlay.kind) {
    case 'settings':
      return formatSettingsOverlay(overlay);
    case 'messages':
      return formatMessagesOverlay(overlay);
    case 'notifications':
      return formatNotificationsOverlay(overlay);
    case 'quarks':
      return formatQuarksOverlay();
    case 'about':
      return formatAboutOverlay(overlay);
    default:
      return '';
  }
}

export function formatLabShellOverlaySubtitle(overlay: LabShellOverlayState): string {
  switch (overlay.kind) {
    case 'settings':
      return `Settings · ${settingsTabLabel(overlay.settingsTabId)}`;
    case 'messages':
      return overlay.messagesActivePartnerId != null
        ? `Messages · user ${overlay.messagesActivePartnerId}`
        : 'Messages';
    case 'notifications':
      return 'Notifications';
    case 'quarks':
      return 'Quarks wallet';
    case 'about':
      return `About · ${overlay.aboutTopicTab ?? 'Getting Started'}`;
    default:
      return 'THE-LAB';
  }
}
