import { buildLabEventType } from '@/shared/types/lab-domain-event';

/** Literal event types for catalog publisher CI (see `lab-domain-event-publishers.test.ts`). */
export const CRM_SALES_APPROVAL_SUBMITTED_EVENT_TYPE = buildLabEventType('app-lab-crm', 'sales', 'approval_submitted');

export const CRM_QUOTES_APPROVAL_SUBMITTED_EVENT_TYPE = buildLabEventType('app-lab-crm', 'quotes', 'approval_submitted');

export function crmApprovalSubmittedEventType(entityKey: string): string | null {
  if (entityKey === 'sales') {
    return CRM_SALES_APPROVAL_SUBMITTED_EVENT_TYPE;
  }
  if (entityKey === 'quotes') {
    return CRM_QUOTES_APPROVAL_SUBMITTED_EVENT_TYPE;
  }
  return null;
}
