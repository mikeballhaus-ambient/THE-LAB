import type { FormComponent, ValidationRules } from '@/apps/lab-formsbuilder/shared/types';

/** Build form-level validationRules from per-component validation + required flags. */
export function mergeValidationRulesFromComponents(components: FormComponent[]): ValidationRules {
  const merged: ValidationRules = {};

  for (const component of components) {
    const key = component.fieldKey;
    if (!key) {
      continue;
    }
    const rules = component.validation?.[key];
    if (Array.isArray(rules) && rules.length > 0) {
      merged[key] = rules;
    } else if (component.required) {
      merged[key] = [{ rule: 'required' }];
    }
  }

  return merged;
}
