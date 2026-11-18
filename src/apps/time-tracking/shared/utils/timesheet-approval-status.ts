export const TIMESHEET_APPROVAL_STATUS_VALUES = ['pending', 'approved', 'rejected'] as const;

export type TimesheetApprovalStatus = (typeof TIMESHEET_APPROVAL_STATUS_VALUES)[number];

export const TIMESHEET_APPROVAL_STATUS_LABELS: Record<TimesheetApprovalStatus, string> = {
  pending: 'Pending approval',
  approved: 'Approved',
  rejected: 'Rejected',
};

export function readTimesheetApprovalStatus(
  record: { approvalStatus?: unknown } | null | undefined,
): TimesheetApprovalStatus | null {
  const raw = record?.approvalStatus;
  if (raw === 'pending' || raw === 'approved' || raw === 'rejected') {
    return raw;
  }
  return null;
}
