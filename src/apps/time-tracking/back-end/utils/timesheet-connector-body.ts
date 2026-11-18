import type { TimesheetWeek } from '../../shared/types';
import { TIMESHEET_APPROVAL_STATUS_VALUES } from '../../shared/utils/timesheet-approval-status';

export function timesheetToConnector(row: TimesheetWeek): Record<string, unknown> {
  return {
    id: row.weekKey,
    weekKey: row.weekKey,
    approvalStatus: row.approvalStatus ?? '',
    requesterUserId: row.requesterUserId ?? null,
    submittedAt: row.submittedAt,
  };
}

export function parseTimesheetConnectorUpdate(body: Record<string, unknown>): {
  approvalStatus?: (typeof TIMESHEET_APPROVAL_STATUS_VALUES)[number];
} {
  const raw = body.approvalStatus;
  if (
    raw === 'pending' ||
    raw === 'approved' ||
    raw === 'rejected'
  ) {
    return { approvalStatus: raw };
  }
  return {};
}
