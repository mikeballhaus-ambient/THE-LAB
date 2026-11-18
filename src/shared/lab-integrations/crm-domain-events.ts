import { buildLabEventType } from '@/shared/types/lab-domain-event';

export const CRM_APP_ID = 'app-lab-crm';

export const CRM_SALES_APPROVAL_SUBMITTED_EVENT = buildLabEventType(
  CRM_APP_ID,
  'sales',
  'approval_submitted',
);

export const CRM_QUOTES_APPROVAL_SUBMITTED_EVENT = buildLabEventType(
  CRM_APP_ID,
  'quotes',
  'approval_submitted',
);

export const CRM_SALES_LEDGER_POST_REQUESTED_EVENT = buildLabEventType(
  CRM_APP_ID,
  'sales',
  'ledger_post_requested',
);

export const CRM_QUOTES_LEDGER_POST_REQUESTED_EVENT = buildLabEventType(
  CRM_APP_ID,
  'quotes',
  'ledger_post_requested',
);

export function crmApprovalSubmittedEventForEntity(entityKey: string): string | null {
  if (entityKey === 'sales') {
    return CRM_SALES_APPROVAL_SUBMITTED_EVENT;
  }
  if (entityKey === 'quotes') {
    return CRM_QUOTES_APPROVAL_SUBMITTED_EVENT;
  }
  return null;
}

export function crmLedgerPostRequestedEventForEntity(entityKey: string): string | null {
  if (entityKey === 'sales') {
    return CRM_SALES_LEDGER_POST_REQUESTED_EVENT;
  }
  if (entityKey === 'quotes') {
    return CRM_QUOTES_LEDGER_POST_REQUESTED_EVENT;
  }
  return null;
}
