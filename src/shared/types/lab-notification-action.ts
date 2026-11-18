/** Primary action on a lab bell notification (workflow `notify_users` or future publishers). */
export type LabNotificationAction =
  | {
      kind: 'launch_app';
      label: string;
      appId: string;
      /** Merged into {@link useLabWorkspaceContext} before launch (catalog deep links, CRM handoff). */
      hostContext?: Record<string, string>;
    }
  | {
      kind: 'open_settings';
      label: string;
      /** Settings nav id (e.g. `approvals`) — see `settings-nav.ts`. */
      settingsView: string;
      hostContext?: Record<string, string>;
    };
