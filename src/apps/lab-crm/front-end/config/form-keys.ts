/**
 * Re-export shared CRM ↔ Forms Builder form key registry.
 * @see src/apps/crm/shared/config/entity-form-keys.ts
 * @see src/apps/crm/docs/form-keys.md
 */
export {
  CRM_ENTITY_FORM_KEYS,
  getCrmEntityFormKey,
  resolveEntityFormKey,
  type CrmEntityKey,
} from '../../shared/config/entity-form-keys';
