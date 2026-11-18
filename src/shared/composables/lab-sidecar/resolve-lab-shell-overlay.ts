import type { LabShellOverlayState } from '@/shared/types/lab-shell-overlay';

export interface LabShellOverlayInput {
  focusedAssistant: boolean;
  showSettingsModal: boolean;
  settingsTabId: string;
  settingsPersonaTab: string;
  settingsPersonaPropertyTab: string;
  showMessagesModal: boolean;
  messagesActivePartnerId: number | null;
  messagesOpenPartnerIds: number[];
  notificationsDialogVisible: boolean;
  notificationsExpandedTitles: string[];
  notificationsSelectedIds: string[];
  quarksDialogVisible: boolean;
  showAboutModal: boolean;
  aboutTopicTab: string;
}

/**
 * Highest-priority open shell overlay for Sidecar context (one surface at a time).
 */
export function resolveLabShellOverlay(input: LabShellOverlayInput): LabShellOverlayState | undefined {
  if (input.focusedAssistant) {
    return undefined;
  }

  if (input.showSettingsModal) {
    return {
      kind: 'settings',
      settingsTabId: input.settingsTabId,
      settingsPersonaTab: input.settingsPersonaTab,
      settingsPersonaPropertyTab: input.settingsPersonaPropertyTab,
    };
  }

  if (input.showMessagesModal) {
    return {
      kind: 'messages',
      messagesActivePartnerId: input.messagesActivePartnerId,
      messagesOpenPartnerIds: [...input.messagesOpenPartnerIds],
    };
  }

  if (input.notificationsDialogVisible) {
    return {
      kind: 'notifications',
      notificationsExpandedTitles: [...input.notificationsExpandedTitles],
      notificationsSelectedIds:
        input.notificationsSelectedIds.length > 0 ? [...input.notificationsSelectedIds] : undefined,
    };
  }

  if (input.quarksDialogVisible) {
    return { kind: 'quarks' };
  }

  if (input.showAboutModal) {
    return {
      kind: 'about',
      aboutTopicTab: input.aboutTopicTab,
    };
  }

  return undefined;
}
