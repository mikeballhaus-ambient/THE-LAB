import {
  approvalPolicyStepsValidForSubmit,
  hydrateApprovalPolicyStepsFromFormValues,
} from '@/shared/forms/approval-policy-steps-form';

export type FieldValidationRuleName =
  | 'required'
  | 'minLength'
  | 'maxLength'
  | 'pattern'
  | 'min'
  | 'max'
  | 'email'
  | 'number';

export type FieldValidationRule = {
  rule: FieldValidationRuleName;
  pattern?: string;
  message?: string;
};

export type FieldValidationRulesMap = Record<string, FieldValidationRule[]>;

export const FORM_INVALID_FIELD_KEYS_KEY = Symbol('formInvalidFieldKeys');

export interface FieldValidationSource {
  fieldKey?: string;
  label?: string;
  required?: boolean;
  validation?: FieldValidationRulesMap;
}

export function getFieldValidationRules(
  source: FieldValidationSource,
): FieldValidationRule[] {
  const key = source.fieldKey;
  if (!key) {
    return [];
  }
  const rules = source.validation?.[key];
  return Array.isArray(rules) ? rules : [];
}

export function isFieldRequired(source: FieldValidationSource): boolean {
  if (source.required === true) {
    return true;
  }
  return getFieldValidationRules(source).some(r => r.rule === 'required');
}

export function isEmptyFieldValue(value: unknown, fieldType?: string): boolean {
  if (value === undefined || value === null) {
    return true;
  }
  if (typeof value === 'string') {
    return value.trim() === '';
  }
  if (fieldType === 'Checkbox') {
    return value !== true;
  }
  if (fieldType === 'MultiSelect' || Array.isArray(value)) {
    return !Array.isArray(value) || value.length === 0;
  }
  return false;
}

export interface ValidateFieldResult {
  valid: boolean;
  message?: string;
}

export function validateFieldValue(
  source: FieldValidationSource & { type?: string; value?: unknown },
  rules: FieldValidationRule[] = getFieldValidationRules(source),
): ValidateFieldResult {
  const value = source.value;
  const type = source.type;

  for (const rule of rules) {
    if (rule.rule === 'required') {
      if (isEmptyFieldValue(value, type)) {
        return { valid: false, message: rule.message ?? 'This field is required.' };
      }
      continue;
    }
    if (rule.rule === 'email' && typeof value === 'string' && value.trim() !== '') {
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailPattern.test(value)) {
        return { valid: false, message: rule.message ?? 'Enter a valid email address.' };
      }
    }
    if (rule.rule === 'minLength' && typeof value === 'string' && rule.pattern) {
      const min = parseInt(rule.pattern, 10);
      if (!Number.isNaN(min) && value.length < min) {
        return { valid: false, message: rule.message ?? `Minimum length is ${min}.` };
      }
    }
    if (rule.rule === 'maxLength' && typeof value === 'string' && rule.pattern) {
      const max = parseInt(rule.pattern, 10);
      if (!Number.isNaN(max) && value.length > max) {
        return { valid: false, message: rule.message ?? `Maximum length is ${max}.` };
      }
    }
    if (rule.rule === 'pattern' && typeof value === 'string' && rule.pattern && value !== '') {
      try {
        const re = new RegExp(rule.pattern);
        if (!re.test(value)) {
          return { valid: false, message: rule.message ?? 'Value does not match the required pattern.' };
        }
      } catch {
        /* ignore invalid regex in config */
      }
    }
    if (rule.rule === 'min' && typeof value === 'number' && rule.pattern) {
      const min = Number(rule.pattern);
      if (!Number.isNaN(min) && value < min) {
        return { valid: false, message: rule.message ?? `Minimum value is ${min}.` };
      }
    }
    if (rule.rule === 'max' && typeof value === 'number' && rule.pattern) {
      const max = Number(rule.pattern);
      if (!Number.isNaN(max) && value > max) {
        return { valid: false, message: rule.message ?? `Maximum value is ${max}.` };
      }
    }
  }

  return { valid: true };
}

export interface FormFieldValidationError {
  fieldKey: string;
  label: string;
  message: string;
}

export interface ValidateFormFieldsResult {
  valid: boolean;
  invalidFieldKeys: string[];
  messages: Record<string, string>;
  fieldErrors: FormFieldValidationError[];
}

function resolveFieldLabel(
  field: FieldValidationSource,
  fieldKey: string,
): string {
  const label = field.label?.trim();
  if (label) {
    return label;
  }
  return fieldKey;
}

function formatFieldErrorMessage(label: string, rawMessage: string | undefined): string {
  if (!rawMessage || rawMessage === 'This field is required.') {
    return `${label} is required.`;
  }
  return rawMessage.startsWith(`${label}:`) ? rawMessage : `${label}: ${rawMessage}`;
}

function formatFieldErrorListMessage(label: string, rawMessage: string | undefined): string {
  if (!rawMessage || rawMessage === 'This field is required.') {
    return 'is required.';
  }
  if (rawMessage.startsWith(`${label}:`)) {
    return rawMessage.slice(label.length + 1).trim();
  }
  return rawMessage;
}

export function validateFormFields(
  fields: Array<FieldValidationSource & { type?: string; value?: unknown }>,
  values: Record<string, unknown> = {},
  formValidationRules?: FieldValidationRulesMap,
): ValidateFormFieldsResult {
  const invalidFieldKeys: string[] = [];
  const messages: Record<string, string> = {};
  const fieldErrors: FormFieldValidationError[] = [];

  const hasApprovalPolicyStepsControl = fields.some((f) => f.type === 'LabApprovalPolicySteps');
  const approvalPolicyLegacyFieldKeys = new Set([
    'step1AssigneeUserId',
    'step1Label',
    'step2AssigneeUserId',
    'step2Label',
    'definitionJson',
  ]);

  for (const field of fields) {
    const key = field.fieldKey;
    if (!key) {
      continue;
    }
    if (hasApprovalPolicyStepsControl && approvalPolicyLegacyFieldKeys.has(key)) {
      continue;
    }
    if (field.type === 'LabApprovalPolicySteps') {
      const drafts = hydrateApprovalPolicyStepsFromFormValues((key) => values[key]);
      const validStep1 = approvalPolicyStepsValidForSubmit(drafts);
      if (!validStep1) {
        invalidFieldKeys.push(key);
        const label = resolveFieldLabel(field, key);
        const message = 'Each approval step must have an assignee.';
        messages[key] = message;
        fieldErrors.push({
          fieldKey: key,
          label,
          message,
        });
      }
      continue;
    }
    const withValue = {
      ...field,
      value: values[key] !== undefined ? values[key] : field.value,
    };
    let rules = getFieldValidationRules(withValue);
    if (rules.length === 0 && formValidationRules?.[key]) {
      rules = formValidationRules[key] ?? [];
    }
    if (rules.length === 0 && !withValue.required) {
      continue;
    }
    const result = validateFieldValue(
      withValue,
      rules.length > 0 ? rules : [{ rule: 'required' }],
    );
    if (!result.valid) {
      invalidFieldKeys.push(key);
      const label = resolveFieldLabel(withValue, key);
      const message = formatFieldErrorMessage(label, result.message);
      const listMessage = formatFieldErrorListMessage(label, result.message);
      messages[key] = message;
      fieldErrors.push({ fieldKey: key, label, message: listMessage });
    }
  }

  return {
    valid: invalidFieldKeys.length === 0,
    invalidFieldKeys,
    messages,
    fieldErrors,
  };
}
