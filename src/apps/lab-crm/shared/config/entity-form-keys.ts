import type { EntityFormBinding, FormBindingPurpose } from '../types/entity.types';
import { bindingsForEntity, dedupeFormBindings, formKeyForPurpose } from '../utils/form-binding-resolution';

/** Default CRM entity keys (seeded in entity_definitions). */
export type CrmEntityKey =
  | 'contacts'
  | 'leads'
  | 'sales'
  | 'service'
  | 'products'
  | 'inventory'
  | 'quotes';

/**
 * Published Forms Builder `form_key` values (auto-generated in the designer).
 * One form per entity is enough for create + edit (same as Task List).
 *
 * Fill after you publish forms; restart the CRM app server to upsert bindings.
 */
export const CRM_ENTITY_FORM_KEYS: Partial<Record<CrmEntityKey, string>> = {
  contacts: 'form_1790896575693_tx751n3',
  leads: 'form_1790896806701_q3sxe4x',
  sales: 'form_1790897050000_09ct3y8',
  service: 'form_1790897101090_1roh6qb',
  products: 'form_1790897134699_v8n99uv',
  inventory: 'form_1790897234895_ajmrn25',
  quotes: 'form_1790963590212_43zxb2u',
};

export function getCrmEntityFormKey(entityKey: string): string | undefined {
  const key = CRM_ENTITY_FORM_KEYS[entityKey as CrmEntityKey];
  const trimmed = key?.trim();
  return trimmed || undefined;
}

/**
 * Resolve form key: DB bindings first, then shared registry fallback.
 * Create and edit may share the same form key.
 */
export function resolveEntityFormKey(
  entityKey: string,
  bindings: EntityFormBinding[],
  purpose: FormBindingPurpose,
): string | undefined {
  const entityBindings = bindingsForEntity(dedupeFormBindings(bindings), entityKey);

  const forPurpose = formKeyForPurpose(entityBindings, purpose);
  if (forPurpose) {
    return forPurpose;
  }

  const shared =
    formKeyForPurpose(entityBindings, 'create') ?? formKeyForPurpose(entityBindings, 'edit');

  if (shared) {
    return shared;
  }

  return getCrmEntityFormKey(entityKey);
}
