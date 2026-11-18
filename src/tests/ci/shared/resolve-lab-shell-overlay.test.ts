import { describe, expect, test } from '@jest/globals';
import { resolveLabShellOverlay } from '@/shared/composables/lab-sidecar/resolve-lab-shell-overlay';

const base = {
  focusedAssistant: false,
  showSettingsModal: false,
  settingsTabId: 'api',
  settingsPersonaTab: 'Chat',
  settingsPersonaPropertyTab: 'Role',
  showMessagesModal: false,
  messagesActivePartnerId: null as number | null,
  messagesOpenPartnerIds: [] as number[],
  notificationsDialogVisible: false,
  notificationsExpandedTitles: [] as string[],
  notificationsSelectedIds: [] as string[],
  quarksDialogVisible: false,
  showAboutModal: false,
  aboutTopicTab: 'Getting Started',
};

describe('resolveLabShellOverlay', () => {
  test('settings wins over messages when both open', () => {
    const overlay = resolveLabShellOverlay({
      ...base,
      showSettingsModal: true,
      settingsTabId: 'themes',
      showMessagesModal: true,
      messagesActivePartnerId: 2,
    });
    expect(overlay?.kind).toBe('settings');
    expect(overlay?.settingsTabId).toBe('themes');
  });

  test('returns undefined when Laboratory focused', () => {
    expect(
      resolveLabShellOverlay({
        ...base,
        focusedAssistant: true,
        showSettingsModal: true,
      }),
    ).toBeUndefined();
  });
});
