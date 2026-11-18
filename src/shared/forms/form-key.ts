/**
 * Canonical form keys: legacy `my-form_key` and rm-64 dotted keys
 * (`task-list.task-list.tasks.task-create-dialog`).
 */
export const FORM_KEY_MAX_LENGTH = 255;

/** Allowed in `forms.form_key` and URL path segments (encodeURIComponent when building URLs). */
export const FORM_KEY_PATTERN = /^[a-zA-Z0-9._-]+$/;

export function isValidFormKey(formKey: string): boolean {
  const key = formKey.trim();
  return key.length > 0 && key.length <= FORM_KEY_MAX_LENGTH && FORM_KEY_PATTERN.test(key);
}
