import { LAB_APPROVAL_REQUEST_DIALOG_SLOTS } from '@/shared/lab-integrations/platform-catalog-integration-services';
import { isApprovalRequestSubmitSlot } from '@/shared/lab-integrations/approval-request-form-stub-filter';

/** Auto-fill API-only fields removed from the submit dialog (title, subject metadata). */
export function resolveApprovalRequestPrepareSubmitPayload(
  slot: string,
  context: Record<string, unknown>,
): ((data: Record<string, unknown>) => Record<string, unknown>) | undefined {
  if (!isApprovalRequestSubmitSlot(slot)) {
    return undefined;
  }
  return (data) => {
    const payload = { ...data };
    if (payload.title == null || String(payload.title).trim() === '') {
      const recordLabel =
        typeof context.recordLabel === 'string' ? context.recordLabel.trim() : '';
      const entityKey = typeof context.entityKey === 'string' ? context.entityKey : '';
      const recordId = context.recordId;
      if (recordLabel) {
        payload.title = `Approval: ${recordLabel}`;
      } else if (entityKey && recordId != null) {
        payload.title = `Approval for ${entityKey} #${recordId}`;
      } else if (typeof context.title === 'string' && context.title.trim()) {
        payload.title = context.title.trim();
      } else {
        payload.title = 'Approval request';
      }
    }
    if (
      slot === LAB_APPROVAL_REQUEST_DIALOG_SLOTS.submit
      && typeof context.policyId === 'string'
      && context.policyId.trim()
      && (payload.policyId == null || String(payload.policyId).trim() === '')
    ) {
      payload.policyId = context.policyId.trim();
    }
    return payload;
  };
}
