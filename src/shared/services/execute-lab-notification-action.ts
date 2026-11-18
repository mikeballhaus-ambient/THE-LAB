import type { LabWorkspaceContextApi } from '@/shared/composables/useLabWorkspaceContext';
import type { LabNotificationAction } from '@/shared/types/lab-notification-action';
import { LAB_APPROVALS_APP_ID } from '@/shared/config/platform-lab-product-app-ids';
import { LAB_HOST_CTX_APPROVAL_OPEN_REQUEST_ID } from '@/shared/lab-integrations/lab-host-context-keys';
import { logNotificationDeepLink } from '@/shared/utils/lab-notification-deeplink-debug';

export interface ExecuteLabNotificationActionHandlers {
  workspace: LabWorkspaceContextApi | null;
  focusAppsWorkspace: () => void | Promise<void>;
  launchApp: (appId: string, displayName: string) => void | Promise<void>;
  openSettings: (settingsView: string) => void;
  resolveAppDisplayName: (appId: string) => string | Promise<string>;
}

function mergeHostContext(
  workspace: LabWorkspaceContextApi | null,
  patch: Record<string, string> | undefined,
): void {
  if (!workspace || !patch || Object.keys(patch).length === 0) {
    return;
  }
  workspace.setHostContext(patch);
}

export async function executeLabNotificationAction(
  action: LabNotificationAction,
  handlers: ExecuteLabNotificationActionHandlers,
): Promise<void> {
  if (action.kind === 'launch_app') {
    logNotificationDeepLink('launch_app:start', {
      appId: action.appId,
      hostContext: action.hostContext,
    });
    await handlers.focusAppsWorkspace();
    const displayName = await handlers.resolveAppDisplayName(action.appId);
    await handlers.launchApp(action.appId, displayName);
    mergeHostContext(handlers.workspace, action.hostContext);
    logNotificationDeepLink('launch_app:hostContext merged after launch', {
      workspacePresent: Boolean(handlers.workspace),
      hostContext: handlers.workspace ? { ...handlers.workspace.hostContext.value } : null,
    });
    return;
  }

  mergeHostContext(handlers.workspace, action.hostContext);
  handlers.openSettings(action.settingsView);
  await handlers.focusAppsWorkspace();
}

/**
 * Launch Approvals & Policies and open the decide dialog for `payload.requestId`.
 *
 * Prefer `launch_app` over `open_settings` for product workflows: Settings nav visibility
 * varies by role and can move; catalog/platform apps are the stable entry surface.
 */
export function approvalReviewNotificationAction(): LabNotificationAction {
  return {
    kind: 'launch_app',
    label: 'Review approval',
    appId: LAB_APPROVALS_APP_ID,
    hostContext: {
      [LAB_HOST_CTX_APPROVAL_OPEN_REQUEST_ID]: '{{payload.requestId}}',
    },
  };
}
