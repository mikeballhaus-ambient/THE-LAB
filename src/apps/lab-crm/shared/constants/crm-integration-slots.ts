export function crmEntityCreateSlot(entityKey: string): string {
  return `crm.${entityKey}.create.dialog`;
}

export function crmEntityEditSlot(entityKey: string): string {
  return `crm.${entityKey}.edit.dialog`;
}

export function crmEntityDeleteSlot(entityKey: string): string {
  return `crm.${entityKey}.delete.dialog`;
}

const CRM_ENTITY_RECORD_DIALOG_SLOT =
  /^crm\.([^.]+)\.(create|edit|delete)\.dialog$/;

/** Parses CRM entity record dialog slots (not `crm.task.*` / `crm.ticket.*`). */
export function parseCrmEntityRecordDialogSlot(
  slot: string,
): { entityKey: string; mode: 'create' | 'edit' | 'delete' } | null {
  const match = CRM_ENTITY_RECORD_DIALOG_SLOT.exec(slot);
  if (!match) {
    return null;
  }
  const entityKey = match[1];
  if (entityKey === 'task' || entityKey === 'ticket') {
    return null;
  }
  return { entityKey, mode: match[2] as 'create' | 'edit' | 'delete' };
}

export function crmEntityServiceId(entityKey: string): string {
  return `crm.${entityKey}`;
}

export const CRM_TASK_INTEGRATION_SLOTS = {
  create: 'crm.task.create.dialog',
  edit: 'crm.task.edit.dialog',
  delete: 'crm.task.delete.dialog',
} as const;

export const CRM_TICKET_INTEGRATION_SLOTS = {
  create: 'crm.ticket.create.dialog',
  edit: 'crm.ticket.edit.dialog',
  delete: 'crm.ticket.delete.dialog',
} as const;

/** Decide-only; submit publishes `app-lab-crm.{sales|quotes}.approval_submitted` via CRM API + Workflow Studio. */
export const CRM_APPROVAL_INTEGRATION_SLOTS = {
  decide: 'crm.approval.request.decide.dialog',
} as const;

export const CRM_APPROVAL_SUBMIT_SLOT_LEGACY = 'crm.approval.request.submit.dialog';

export const CRM_LEDGER_INTEGRATION_SLOTS = {
  createAccount: 'crm.ledger.account.create.dialog',
} as const;

/** Legacy slot removed — post publishes `app-lab-crm.{sales|quotes}.ledger_post_requested`. */
export const CRM_LEDGER_POST_SLOT_LEGACY = 'crm.ledger.entry.post.dialog';

/** Entity keys that show quick approval / ledger actions on the list toolbar (v1). */
export const CRM_DEAL_ENTITY_KEYS = new Set(['sales', 'quotes']);

export const CRM_LEDGER_ACTIVITY_CHART_SLOT = 'reports.ledger.activity';
