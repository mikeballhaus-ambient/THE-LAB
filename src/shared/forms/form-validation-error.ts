import type { FormFieldValidationError, ValidateFormFieldsResult } from './form-field-validation';

export type { FormFieldValidationError } from './form-field-validation';

export type FormValidationError = Error & {
  fieldErrors: FormFieldValidationError[];
};

export function formValidationErrorFromResult(result: ValidateFormFieldsResult): FormValidationError {
  const err = new Error(
    result.fieldErrors.length === 1
      ? `${result.fieldErrors[0].label} ${result.fieldErrors[0].message}`
      : 'Please fix the validation errors below.',
  ) as FormValidationError;
  err.fieldErrors = result.fieldErrors;
  return err;
}

export function getFieldErrorsFromError(err: unknown): FormFieldValidationError[] | undefined {
  if (!err || typeof err !== 'object' || !('fieldErrors' in err)) {
    return undefined;
  }
  const items = (err as FormValidationError).fieldErrors;
  return Array.isArray(items) && items.length > 0 ? items : undefined;
}

/** Full sentence for UI banners (label + list-style message from validateFormFields). */
export function formatFieldValidationErrorLine(error: FormFieldValidationError): string {
  const label = error.label?.trim() || error.fieldKey;
  const msg = error.message?.trim() ?? '';
  if (!msg || msg === 'is required.') {
    return `${label} is required.`;
  }
  if (msg.startsWith(`${label}:`)) {
    return msg;
  }
  if (msg.startsWith(label)) {
    return msg;
  }
  return `${label}: ${msg}`;
}

export function formatFieldValidationErrorSummary(errors: FormFieldValidationError[]): string {
  return errors.map(formatFieldValidationErrorLine).join(' ');
}
