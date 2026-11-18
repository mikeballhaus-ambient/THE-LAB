import type { CapturedPayloadField } from '@/shared/utils/lab-workflow-captured-payload-fields';
import { CUSTOM_PATH_SENTINEL } from '@/shared/utils/lab-workflow-captured-payload-fields';

/** Canonical `{{payload.path}}` snippet for workflow message / URL templates. */
export function payloadTemplateRef(path: string): string {
  const trimmed = path.trim().replace(/^payload\./, '');
  if (!trimmed) {
    return '{{payload.field}}';
  }
  return `{{payload.${trimmed}}}`;
}

export function insertPayloadTemplateSnippet(
  text: string,
  path: string,
  selectionStart?: number,
  selectionEnd?: number,
): { text: string; cursor: number } {
  const snippet = payloadTemplateRef(path);
  const start = selectionStart ?? text.length;
  const end = selectionEnd ?? start;
  const next = text.slice(0, start) + snippet + text.slice(end);
  return { text: next, cursor: start + snippet.length };
}

export type PayloadTemplateInsertOption = {
  label: string;
  path: string;
  type?: string;
};

/** Options for “Insert field” controls — prefers captured sample fields, falls back to path pickers. */
export function buildPayloadTemplateInsertOptions(
  capturedFields: readonly CapturedPayloadField[],
  payloadPathOptions?: readonly { label: string; value: string }[],
): PayloadTemplateInsertOption[] {
  const fromCapture: PayloadTemplateInsertOption[] = capturedFields.map((field) => ({
    path: field.path,
    type: field.type,
    label: field.path,
  }));
  if (fromCapture.length > 0) {
    return fromCapture;
  }
  const fromOptions: PayloadTemplateInsertOption[] = [];
  for (const option of payloadPathOptions ?? []) {
    if (option.value === CUSTOM_PATH_SENTINEL || !option.value.trim()) {
      continue;
    }
    fromOptions.push({ path: option.value, label: option.label || option.value });
  }
  return fromOptions;
}
