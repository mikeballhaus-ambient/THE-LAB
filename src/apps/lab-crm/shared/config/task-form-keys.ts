import type { EntityFormBinding, FormBindingPurpose } from '../types/entity.types';
import { bindingsForEntity, dedupeFormBindings, formKeyForPurpose } from '../utils/form-binding-resolution';

/** Entity key for CRM task form bindings (not shown in entity nav). */
export const CRM_TASKS_ENTITY_KEY = 'tasks';

/** Same published forms as Task List app (task-list connector). */
export const CRM_TASK_FORM_KEY = 'form_1790886832790_dfi9y90';

export function resolveTaskFormKey(
  bindings: EntityFormBinding[],
  purpose: FormBindingPurpose,
): string | undefined {
  const entityBindings = bindingsForEntity(
    dedupeFormBindings(bindings),
    CRM_TASKS_ENTITY_KEY,
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
  const fallback = CRM_TASK_FORM_KEY.trim();
  return fallback || undefined;
}
