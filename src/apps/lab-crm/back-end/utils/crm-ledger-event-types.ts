import { buildLabEventType } from '@/shared/types/lab-domain-event';

/** Literal event types for catalog publisher CI (see `lab-domain-event-publishers.test.ts`). */
export const CRM_SALES_LEDGER_POST_REQUESTED_EVENT_TYPE = buildLabEventType('app-lab-crm', 'sales', 'ledger_post_requested');

export const CRM_QUOTES_LEDGER_POST_REQUESTED_EVENT_TYPE = buildLabEventType('app-lab-crm', 'quotes', 'ledger_post_requested');

export function crmLedgerPostRequestedEventType(entityKey: string): string | null {
  if (entityKey === 'sales') {
    return CRM_SALES_LEDGER_POST_REQUESTED_EVENT_TYPE;
  }
  if (entityKey === 'quotes') {
    return CRM_QUOTES_LEDGER_POST_REQUESTED_EVENT_TYPE;
  }
  return null;
}
