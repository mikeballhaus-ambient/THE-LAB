export const CRM_DEAL_APPROVAL_STATUS_VALUES = ['pending', 'approved', 'rejected'] as const;

export type CrmDealApprovalStatus = (typeof CRM_DEAL_APPROVAL_STATUS_VALUES)[number];

export const CRM_DEAL_APPROVAL_STATUS_LABELS: Record<CrmDealApprovalStatus, string> = {
  pending: 'Pending approval',
  approved: 'Approved',
  rejected: 'Rejected',
};

export function readCrmDealApprovalStatus(
  record: Record<string, unknown> | null | undefined,
): CrmDealApprovalStatus | null {
  const raw = record?.approvalStatus;
  if (raw === 'pending' || raw === 'approved' || raw === 'rejected') {
    return raw;
  }
  return null;
}

/** Submit is allowed when no outcome yet, or after rejection (new request). */
export function crmDealApprovalStatusAllowsSubmit(status: CrmDealApprovalStatus | null): boolean {
  return status == null || status === 'rejected';
}
