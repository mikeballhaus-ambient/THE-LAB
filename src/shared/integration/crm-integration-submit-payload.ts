import { buildHelpDeskCrmMetadata } from '@/apps/lab-helpdesk/shared/types/help-desk-crm-metadata';
import { buildCrmTaskMetadata } from '@/apps/lab-crm/shared/types/crm-task-metadata';

/** CRM host integration slots that inject related-record metadata on create. */
export function resolveCrmIntegrationPrepareSubmitPayload(
  slot: string,
  context: Record<string, unknown>,
): ((data: Record<string, unknown>) => Record<string, unknown>) | undefined {
  if (slot === 'crm.task.create.dialog') {
    const entityKey = typeof context.entityKey === 'string' ? context.entityKey : '';
    const recordId = coerceRecordId(context.recordId);
    if (!entityKey || recordId == null) {
      return undefined;
    }
    const recordLabel =
      typeof context.recordLabel === 'string' ? context.recordLabel : undefined;
    const stage = typeof context.stage === 'string' ? context.stage : undefined;
    const workflow = typeof context.workflow === 'string' ? context.workflow : undefined;
    return (data) => {
      const payload = { ...data };
      if (payload.metadata == null || String(payload.metadata).trim() === '') {
        payload.metadata = buildCrmTaskMetadata({
          entityKey,
          recordId,
          recordLabel,
          stage,
          workflow,
        });
      }
      return payload;
    };
  }

  if (slot === 'crm.ticket.create.dialog') {
    const entityKey = typeof context.entityKey === 'string' ? context.entityKey : '';
    const recordId = coerceRecordId(context.recordId);
    if (!entityKey || recordId == null) {
      return undefined;
    }
    const recordLabel =
      typeof context.recordLabel === 'string' ? context.recordLabel : undefined;
    return (data) => {
      const payload = { ...data };
      if (payload.metadata == null || String(payload.metadata).trim() === '') {
        payload.metadata = buildHelpDeskCrmMetadata({
          entityKey,
          recordId,
          recordLabel,
        });
      }
      return payload;
    };
  }

  return undefined;
}

function coerceRecordId(raw: unknown): number | null {
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return raw;
  }
  if (typeof raw === 'string' && raw.trim() !== '' && !Number.isNaN(Number(raw))) {
    return Number(raw);
  }
  return null;
}
