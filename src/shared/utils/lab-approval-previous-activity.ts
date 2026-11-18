import type {
  LabApprovalPolicyRecord,
  LabApprovalRequestRecord,
} from '@/shared/types/lab-approval';

export type LabApprovalActivityRow =
  | {
      kind: 'submission';
      label: string;
      comment: string;
    }
  | {
      kind: 'step';
      stepIndex: number;
      label: string;
      decision: 'Approved' | 'Rejected';
      comment?: string;
      decidedAt?: string;
      decidedByUserId?: number;
    };

export function buildLabApprovalPreviousActivityRows(
  request: LabApprovalRequestRecord,
  policy: LabApprovalPolicyRecord | null,
): LabApprovalActivityRow[] {
  const rows: LabApprovalActivityRow[] = [];
  const submitComment = request.description?.trim();
  if (submitComment) {
    rows.push({
      kind: 'submission',
      label: 'Request submitted',
      comment: submitComment,
    });
  }
  for (const step of request.steps) {
    if (step.status !== 'approved' && step.status !== 'rejected') {
      continue;
    }
    const policyStep = policy?.definition.steps[step.stepIndex];
    const stepLabel = policyStep?.label?.trim() || `Step ${step.stepIndex + 1}`;
    rows.push({
      kind: 'step',
      stepIndex: step.stepIndex,
      label: stepLabel,
      decision: step.status === 'approved' ? 'Approved' : 'Rejected',
      comment: step.comment?.trim() || undefined,
      decidedAt: step.decidedAt,
      decidedByUserId: step.decidedByUserId,
    });
  }
  rows.sort((a, b) => {
    if (a.kind === 'submission') {
      return -1;
    }
    if (b.kind === 'submission') {
      return 1;
    }
    return a.stepIndex - b.stepIndex;
  });
  return rows;
}

export function labApprovalPreviousActivityCount(
  request: LabApprovalRequestRecord,
  policy: LabApprovalPolicyRecord | null,
): number {
  return buildLabApprovalPreviousActivityRows(request, policy).length;
}
