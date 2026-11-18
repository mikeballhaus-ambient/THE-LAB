import type { EntityFormBinding, FormBindingPurpose } from '../types/entity.types';
import { bindingsForEntity, dedupeFormBindings, formKeyForPurpose } from '../utils/form-binding-resolution';

/** Entity key for CRM Help Desk ticket form bindings (not shown in entity nav). */
export const CRM_TICKETS_ENTITY_KEY = 'tickets';

/**
 * Optional default published form (Help Desk ticket connector).
 * Prefer CRM Settings bindings for entity key `tickets`.
 */
/** Published Help Desk ticket form (Forms Builder + help-desk connector). */
export const CRM_TICKET_FORM_KEY = 'form_1791054325120_stz7jkl';

export function resolveTicketFormKey(
  bindings: EntityFormBinding[],
  purpose: FormBindingPurpose,
): string | undefined {
  const entityBindings = bindingsForEntity(
    dedupeFormBindings(bindings),
    CRM_TICKETS_ENTITY_KEY,
  );
  const forPurpose = formKeyForPurpose(entityBindings, purpose);
  if (forPurpose) {
    return forPurpose;
  }
  const shared =
    formKeyForPurpose(entityBindings, 'create') ?? formKeyForPurpose(entityBindings, 'edit');
  if (shared) {
    return shared;
  }
  const fallback = CRM_TICKET_FORM_KEY.trim();
  return fallback || undefined;
}
