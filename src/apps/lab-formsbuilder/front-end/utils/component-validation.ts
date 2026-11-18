/** Which validation rules apply per canvas control type (matches form-types.ts). */

export type ValidationRuleKind =
  | 'required'
  | 'minLength'
  | 'maxLength'
  | 'pattern'
  | 'min'
  | 'max'
  | 'email';

const VALIDATION_BY_CONTROL: Record<string, ValidationRuleKind[]> = {
  InputText: ['required', 'minLength', 'maxLength', 'pattern', 'email'],
  Textarea: ['required', 'minLength', 'maxLength', 'pattern'],
  NumberInput: ['required', 'min', 'max'],
  DatePicker: ['required'],
  Checkbox: ['required'],
  Select: ['required'],
  RadioButton: ['required'],
  MultiSelect: ['required'],
  Label: [],
};

export function allowedValidationRules(componentType: string): ValidationRuleKind[] {
  return VALIDATION_BY_CONTROL[componentType] ?? ['required'];
}

export function supportsValidationRule(
  componentType: string,
  rule: ValidationRuleKind,
): boolean {
  return allowedValidationRules(componentType).includes(rule);
}

export function validationHintForType(componentType: string): string | null {
  switch (componentType) {
    case 'DatePicker':
      return 'Date fields support required only. Use connector or runtime validation for date ranges.';
    case 'Checkbox':
    case 'Select':
    case 'RadioButton':
    case 'MultiSelect':
      return 'This control supports required only.';
    case 'NumberInput':
      return 'Use minimum and maximum value for numeric bounds.';
    case 'Label':
      return 'Static labels do not support validation.';
    default:
      return null;
  }
}
