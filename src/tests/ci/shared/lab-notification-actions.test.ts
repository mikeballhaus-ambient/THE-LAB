import { describe, expect, test } from '@jest/globals';
import { resolveLabNotificationActionsForScope } from '@/shared/utils/lab-notification-actions';
import { catalogLaunchPrimaryRecordAction } from '@/shared/utils/lab-notification-action-builders';
import { approvalReviewNotificationAction } from '@/shared/services/execute-lab-notification-action';

describe('lab notification actions', () => {
  test('resolves launch_app hostContext from event payload', () => {
    const actions = resolveLabNotificationActionsForScope(
      [catalogLaunchPrimaryRecordAction('app-polls-surveys', 'Vote now', 'pollId')],
      { payload: { pollId: 42, question: 'Lunch?' } },
    );
    expect(actions).toHaveLength(1);
    expect(actions?.[0]).toMatchObject({
      kind: 'launch_app',
      appId: 'app-polls-surveys',
      hostContext: { catalogOpenPrimaryRecordId: '42' },
    });
  });

  test('resolves approval review action request id', () => {
    const actions = resolveLabNotificationActionsForScope([approvalReviewNotificationAction()], {
      payload: { requestId: 'req-abc', assigneeUserId: 3 },
    });
    expect(actions?.[0]).toMatchObject({
      kind: 'launch_app',
      appId: 'app-lab-approvals-policies',
      hostContext: {
        labApprovalOpenRequestId: 'req-abc',
      },
    });
  });
});
