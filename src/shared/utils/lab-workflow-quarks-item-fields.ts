import type { CapturedPayloadField } from '@/shared/utils/lab-workflow-captured-payload-fields';
import type { PayloadTemplateInsertOption } from '@/shared/utils/lab-workflow-payload-template-insert';

/**
 * Item JSON fields written by Quarks workflow steps — surfaced in path pickers and template inserts
 * even before a dry-run sample exists.
 */
export const LAB_WORKFLOW_QUARKS_ITEM_FIELD_HINTS: readonly CapturedPayloadField[] = [
  { path: 'userId', type: 'number' },
  { path: 'balance', type: 'number' },
  { path: 'lastDailyAccrualDate', type: 'string' },
  { path: 'dailyAccrualAmount', type: 'number' },
  { path: 'balanceCap', type: 'number' },
  { path: 'dailyAllotmentEligible', type: 'boolean' },
  { path: 'projectedAllotmentDelta', type: 'number' },
  { path: 'accrualApplied', type: 'boolean' },
  { path: 'accrualDelta', type: 'number' },
  { path: 'balanceAfter', type: 'number' },
  { path: 'ledgerEntryId', type: 'number' },
];

export function mergeCapturedPayloadFieldHints(
  fields: readonly CapturedPayloadField[],
  hints: readonly CapturedPayloadField[],
): CapturedPayloadField[] {
  const byPath = new Map<string, CapturedPayloadField>();
  for (const field of fields) {
    const path = field.path.trim();
    if (path) {
      byPath.set(path, field);
    }
  }
  for (const hint of hints) {
    const path = hint.path.trim();
    if (path && !byPath.has(path)) {
      byPath.set(path, hint);
    }
  }
  return [...byPath.values()].sort((a, b) => a.path.localeCompare(b.path));
}

export const LAB_WORKFLOW_TOAST_ITEM_INSERT_OPTIONS: readonly PayloadTemplateInsertOption[] =
  LAB_WORKFLOW_QUARKS_ITEM_FIELD_HINTS.map((field) => ({
    path: field.path,
    type: field.type,
    label: field.path,
  }));