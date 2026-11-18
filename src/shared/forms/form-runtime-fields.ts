import type { FieldValidationRule, FieldValidationRulesMap } from './form-field-validation';
import type { IFormRuntimeField } from './form-runtime-types';

type FormLevelValidationRules = Record<string, FieldValidationRule[] | undefined>;

function rulesForFieldKey(
  fieldKey: string,
  componentValidation: unknown,
  formRules?: FormLevelValidationRules,
): FieldValidationRule[] {
  const map = componentValidation as FieldValidationRulesMap | undefined;
  const fromComponent = map?.[fieldKey];
  if (Array.isArray(fromComponent) && fromComponent.length > 0) {
    return fromComponent;
  }
  const fromForm = formRules?.[fieldKey];
  return Array.isArray(fromForm) ? fromForm : [];
}

/**
 * Prefer `definition.type` when canvas `type` was not updated (e.g. Select → Radio).
 */
const LOOKUP_CONTROL_TYPES = new Set(['Select', 'MultiSelect', 'RadioButton']);

export function normalizeRuntimeFieldTypes(fields: IFormRuntimeField[]): IFormRuntimeField[] {
  return fields.map((field) => {
    const def = field.definition as { type?: string } | undefined;
    if (field.dataFetch && field.type && LOOKUP_CONTROL_TYPES.has(field.type)) {
      return field;
    }
    if (def?.type && def.type !== field.type) {
      return { ...field, type: def.type };
    }
    return field;
  });
}

/** Merge form-level validationRules onto each field for runtime display and validation. */
export function mergeFormValidationIntoRuntimeFields(
  fields: IFormRuntimeField[],
  validationRules?: FormLevelValidationRules,
): IFormRuntimeField[] {
  return fields.map((field) => {
    const fieldKey = field.fieldKey;
    if (!fieldKey) {
      return field;
    }

    const mergedRules = rulesForFieldKey(fieldKey, field.validation, validationRules);
    const validation: FieldValidationRulesMap = {
      ...(typeof field.validation === 'object' && field.validation && !Array.isArray(field.validation)
        ? (field.validation as FieldValidationRulesMap)
        : {}),
    };

    if (mergedRules.length > 0) {
      validation[fieldKey] = mergedRules;
    }

    const withValidation: IFormRuntimeField = {
      ...field,
      validation: Object.keys(validation).length > 0 ? validation : field.validation,
    };

    const requiredFromRules = mergedRules.some(r => r.rule === 'required');
    if (field.required === true || requiredFromRules) {
      withValidation.required = true;
    }

    return withValidation;
  });
}

export function prepareFormRuntimeFields(
  components: IFormRuntimeField[] | undefined,
  validationRules?: FormLevelValidationRules,
): IFormRuntimeField[] {
  const base = components ?? [];
  return mergeFormValidationIntoRuntimeFields(normalizeRuntimeFieldTypes(base), validationRules);
}
