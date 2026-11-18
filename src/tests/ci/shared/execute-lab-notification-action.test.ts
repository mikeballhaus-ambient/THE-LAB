import { describe, expect, test, jest } from '@jest/globals';
import { executeLabNotificationAction } from '@/shared/services/execute-lab-notification-action';
import { createLabWorkspaceContextApi } from '@/shared/composables/useLabWorkspaceContext';
import { DEFAULT_APP_WORKSPACE_LAYOUT } from '@/shared/types/app-view-layout';
import { ref } from 'vue';

describe('executeLabNotificationAction', () => {
  test('launch_app merges hostContext after launch (tab switch clears context first)', async () => {
    const workspace = createLabWorkspaceContextApi({
      focusedAssistant: ref(false),
      runningAppIds: ref([]),
      activeTabId: ref(null),
      workspaceLayout: ref({ ...DEFAULT_APP_WORKSPACE_LAYOUT }),
      user: ref({ role: 'member' }),
      shellOverlay: ref(null),
    });

    const launchApp = jest.fn(async () => {
      workspace.clearHostContext();
    });

    await executeLabNotificationAction(
      {
        kind: 'launch_app',
        label: 'Vote now',
        appId: 'app-polls-surveys',
        hostContext: { catalogOpenPrimaryRecordId: '7' },
      },
      {
        workspace,
        focusAppsWorkspace: () => undefined,
        launchApp,
        openSettings: () => undefined,
        resolveAppDisplayName: async () => 'Polls',
      },
    );

    expect(launchApp).toHaveBeenCalled();
    expect(workspace.hostContext.value.catalogOpenPrimaryRecordId).toBe('7');
  });
});
