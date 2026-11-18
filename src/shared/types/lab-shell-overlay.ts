/**
 * Lab shell modal overlays visible above the apps workspace (rm-68.1).
 * Sidecar is hidden in full Laboratory; overlays are ignored when `focusedAssistant` is true.
 */

export type LabShellOverlayKind =
  | 'settings'
  | 'messages'
  | 'notifications'
  | 'quarks'
  | 'about';

export interface LabShellOverlayState {
  kind: LabShellOverlayKind;
  /** Settings left nav section id (`settings-nav`). */
  settingsTabId?: string;
  settingsPersonaTab?: string;
  settingsPersonaPropertyTab?: string;
  messagesActivePartnerId?: number | null;
  messagesOpenPartnerIds?: number[];
  aboutTopicTab?: string;
  notificationsExpandedTitles?: string[];
  /** Notification ids selected for bulk delete in the notifications dialog. */
  notificationsSelectedIds?: string[];
}
