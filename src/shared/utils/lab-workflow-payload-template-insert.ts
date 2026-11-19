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

/** Item field on the current workflow row, e.g. `{{accrualDelta}}` (resolved before payload). */
export function itemTemplateRef(path: string): string {
  const trimmed = path.trim().replace(/^payload\./, '');
  if (!trimmed) {
    return '{{field}}';
  }
  return `{{${trimmed}}}`;
}

export type PayloadTemplateSnippetStyle = 'payload' | 'item';

export function insertPayloadTemplateSnippet(
  text: string,
  path: string,
  selectionStart?: number,
  selectionEnd?: number,
  style: PayloadTemplateSnippetStyle = 'payload',
): { text: string; cursor: number } {
  const snippet = style === 'item' ? itemTemplateRef(path) : payloadTemplateRef(path);
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
  extraOptions?: readonly PayloadTemplateInsertOption[] | undefined,
): PayloadTemplateInsertOption[] {
  const byPath = new Map<string, PayloadTemplateInsertOption>();
  const add = (path: string, label: string, type?: string) => {
    const trimmed = path.trim().replace(/^payload\./, '');
    if (!trimmed) {
      return;
    }
    if (!byPath.has(trimmed)) {
      byPath.set(trimmed, { path: trimmed, label, type });
    }
  };
  for (const field of capturedFields) {
    add(field.path, field.path, field.type);
  }
  for (const option of extraOptions ?? []) {
    add(option.path, option.label || option.path, option.type);
  }
  if (byPath.size > 0) {
    return [...byPath.values()].sort((a, b) => a.path.localeCompare(b.path));
  }
  for (const option of payloadPathOptions ?? []) {
    if (option.value === CUSTOM_PATH_SENTINEL || !option.value.trim()) {
      continue;
    }
    add(option.value, option.label || option.value);
  }
  return [...byPath.values()].sort((a, b) => a.path.localeCompare(b.path));
}
