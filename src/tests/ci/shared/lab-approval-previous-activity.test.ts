import { describe, expect, test } from '@jest/globals';
import type {
  LabApprovalPolicyRecord,
  LabApprovalRequestRecord,
} from '@/shared/types/lab-approval';
import { buildLabApprovalPreviousActivityRows } from '@/shared/utils/lab-approval-previous-activity';

describe('lab-approval-previous-activity', () => {
  const policy: LabApprovalPolicyRecord = {
    id: 'policy-1',
    name: 'Deal policy',
    enabled: true,
    createdByUserId: 1,
    definition: {
      schemaVersion: 1,
      steps: [
        { label: 'Deal review', assigneeUserId: 2 },
        { label: 'Final sign-off', assigneeUserId: 1 },
      ],
    },
    createdAt: '',
    updatedAt: '',
  };

  test('includes submission comment and completed steps', () => {
    const request: LabApprovalRequestRecord = {
      id: 'req-1',
      policyId: policy.id,
      title: 'Approval: Deal',
      description: 'Please review pricing',
      status: 'pending',
      requesterUserId: 3,
      subjectAppId: 'app-lab-crm',
      subjectEntityType: 'sales',
      subjectEntityId: '99',
      currentStepIndex: 1,
      steps: [
        {
          requestId: 'req-1',
          stepIndex: 0,
          assigneeUserId: 2,
          status: 'approved',
          comment: 'Looks good',
          decidedAt: '2026-10-28T12:00:00.000Z',
          decidedByUserId: 2,
        },
        {
          requestId: 'req-1',
          stepIndex: 1,
          assigneeUserId: 1,
          status: 'pending',
        },
      ],
      createdAt: '',
      updatedAt: '',
    };

    const rows = buildLabApprovalPreviousActivityRows(request, policy);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ kind: 'submission', comment: 'Please review pricing' });
    expect(rows[1]).toMatchObject({
      kind: 'step',
      label: 'Deal review',
      decision: 'Approved',
      comment: 'Looks good',
    });
  });
});
