import {
  CRM_ENTITY_FORM_KEYS,
  type CrmEntityKey,
} from '../../shared/config/entity-form-keys';
import { CRM_TASKS_ENTITY_KEY, CRM_TASK_FORM_KEY } from '../../shared/config/task-form-keys';
import { CRM_TICKETS_ENTITY_KEY, CRM_TICKET_FORM_KEY } from '../../shared/config/ticket-form-keys';
import { FormBindingService } from '../services/form-binding-service';

/**
 * Upserts create + edit bindings from CRM_ENTITY_FORM_KEYS (idempotent).
 * Skips entities with empty keys.
 */
export async function seedFormBindingsFromRegistry(): Promise<void> {
  const bindings = FormBindingService.getInstance();

  for (const entityKey of Object.keys(CRM_ENTITY_FORM_KEYS) as CrmEntityKey[]) {
    const formKey = CRM_ENTITY_FORM_KEYS[entityKey]?.trim();
    if (!formKey) {
      continue;
    }
    for (const purpose of ['create', 'edit'] as const) {
      await bindings.upsertBinding({
        entityKey,
        purpose,
        formKey,
        isDefault: true,
      });
    }
  }
}

/** Task create/edit forms (Task List connector); entity key `tasks` is hidden from CRM entity nav. */
export async function seedTaskFormBindingsFromRegistry(): Promise<void> {
  const formKey = CRM_TASK_FORM_KEY.trim();
  if (!formKey) {
    return;
  }
  const bindings = FormBindingService.getInstance();
  for (const purpose of ['create', 'edit'] as const) {
    await bindings.upsertBinding({
      entityKey: CRM_TASKS_ENTITY_KEY,
      purpose,
      formKey,
      isDefault: true,
    });
  }
}

/** Ticket create/edit forms (Help Desk connector); entity key `tickets` is hidden from CRM entity nav. */
export async function seedTicketFormBindingsFromRegistry(): Promise<void> {
  const formKey = CRM_TICKET_FORM_KEY.trim();
  if (!formKey) {
    return;
  }
  const bindings = FormBindingService.getInstance();
  for (const purpose of ['create', 'edit'] as const) {
    await bindings.upsertBinding({
      entityKey: CRM_TICKETS_ENTITY_KEY,
      purpose,
      formKey,
      isDefault: true,
    });
  }
}
