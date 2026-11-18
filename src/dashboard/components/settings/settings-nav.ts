export type SettingsViewId =
  | 'api'
  | 'personas'
  | 'mcpServers'
  | 'context'
  | 'command'
  | 'sysMsg'
  | 'sessions'
  | 'usermanagement'
  | 'authproviders'
  | 'seeddata'
  | 'themes'
  | 'catalogTags'
  | 'sidecarActivity'
  | 'appsOrder'
  | 'approvals'
  | 'approvalPolicies'
  | 'ledger'
  | 'ledgerAccounts'
  | 'appBuilder'
  | 'gameSidecar';

export const SETTINGS_ADMIN_VIEWS: SettingsViewId[] = [
  'usermanagement',
  'authproviders',
  'seeddata',
  'themes',
  'catalogTags',
  'sidecarActivity',
  'appsOrder',
  'approvalPolicies',
  'appBuilder',
];

export interface SettingsNavItem {
  id: SettingsViewId;
  label: string;
  description?: string;
  icon: string;
  requiresDashboard?: boolean;
}

export interface SettingsNavGroup {
  label: string;
  items: SettingsNavItem[];
}

export const SETTINGS_NAV_GROUPS: SettingsNavGroup[] = [
  {
    label: 'Lab configuration',
    items: [
      {
        id: 'api',
        label: 'API & models',
        description: 'Chat and embedding providers, models, and connection settings.',
        icon: 'fa-microchip',
      },
      {
        id: 'personas',
        label: 'Personas',
        description: 'Roles, tools, and behavior for Lab Assistant personas.',
        icon: 'fa-user-astronaut',
        requiresDashboard: true,
      },
      {
        id: 'mcpServers',
        label: 'MCP servers',
        description: 'Connect and manage Model Context Protocol servers.',
        icon: 'fa-plug',
        requiresDashboard: true,
      },
      {
        id: 'context',
        label: 'Context',
        description: 'Context window and summarization behavior.',
        icon: 'fa-layer-group',
        requiresDashboard: true,
      },
      {
        id: 'command',
        label: 'Slash commands',
        description: 'Custom slash commands available in chat.',
        icon: 'fa-slash',
        requiresDashboard: true,
      },
      {
        id: 'sysMsg',
        label: 'System messages',
        description: 'Global and per-user system instructions.',
        icon: 'fa-message',
        requiresDashboard: true,
      },
      {
        id: 'sessions',
        label: 'Sessions',
        description: 'Browse and manage stored chat sessions.',
        icon: 'fa-comments',
        requiresDashboard: true,
      },
      {
        id: 'gameSidecar',
        label: 'Games & Sidecar',
        description: 'Auto-open Sidecar for catalog games and in-game banter.',
        icon: 'fa-chess-board',
        requiresDashboard: true,
      },
      {
        id: 'approvals',
        label: 'Approvals',
        description: 'Inbox, submit requests, and track status.',
        icon: 'fa-clipboard-check',
        requiresDashboard: true,
      },
      {
        id: 'ledger',
        label: 'Financial ledger',
        description: 'Journal entries and posting.',
        icon: 'fa-coins',
        requiresDashboard: true,
      },
      {
        id: 'ledgerAccounts',
        label: 'Ledger accounts',
        description: 'Chart of accounts (read-only for members).',
        icon: 'fa-book',
        requiresDashboard: true,
      },
    ],
  },
  {
    label: 'Administration',
    items: [
      {
        id: 'usermanagement',
        label: 'Users',
        description: 'Accounts, roles, and app permissions.',
        icon: 'fa-users',
      },
      {
        id: 'authproviders',
        label: 'Auth providers',
        description: 'OIDC sign-in (Google, GitHub, Microsoft Entra).',
        icon: 'fa-shield-halved',
      },
      {
        id: 'seeddata',
        label: 'App demo data',
        description: 'Restore or apply seeded demo packs for apps.',
        icon: 'fa-database',
      },
      {
        id: 'themes',
        label: 'Themes',
        description: 'Platform colors, presets, and chat surfaces.',
        icon: 'fa-palette',
      },
      {
        id: 'approvalPolicies',
        label: 'Approval policies',
        description: 'Define multi-step approval chains (admin).',
        icon: 'fa-list-check',
      },
      {
        id: 'appBuilder',
        label: 'App Builder',
        description: 'Sidecar-first app creation via App Management MCP.',
        icon: 'fa-hammer',
      },
      {
        id: 'catalogTags',
        label: 'App catalog tags',
        description: 'Create and manage platform-wide app catalog tags.',
        icon: 'fa-tags',
      },
      {
        id: 'sidecarActivity',
        label: 'Sidecar activity text',
        description: 'Thinking and working status messages in the Lab Assistant Sidecar.',
        icon: 'fa-flask',
      },
      {
        id: 'appsOrder',
        label: 'App catalog',
        description: 'Launch order and visibility (show/hide) for dashboard apps.',
        icon: 'fa-list-ol',
      },
    ],
  },
];

export function findSettingsNavItem(id: SettingsViewId): SettingsNavItem | undefined {
  for (const group of SETTINGS_NAV_GROUPS) {
    const item = group.items.find((entry) => entry.id === id);
    if (item) return item;
  }
  return undefined;
}
