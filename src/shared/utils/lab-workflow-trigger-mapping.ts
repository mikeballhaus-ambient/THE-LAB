import type { LabWorkflowTriggerMappingRow } from '@/shared/types/lab-workflow-graph';
import { getPayloadValueAtPath, setPayloadValueAtPath } from '@/shared/utils/lab-payload-path';
import { collectPayloadShapeFields } from '@/shared/utils/lab-workflow-payload-shape';

/**
 * Project an incoming payload through a trigger's output mapping (phase 37).
 *
 * ## The rule
 *
 * - **No mapping** ⇒ the payload passes through unchanged. This is pre-37 behaviour and keeps every
 *   existing graph working.
 * - **Mapping present** ⇒ the payload is **reduced** to the mapped pairs. Unmapped fields are dropped.
 *
 * Dropping is deliberate. A mapping that passes everything through is advisory, and a misspelled
 * `to` becomes invisible instead of surfacing as a missing field downstream. The author's explicit
 * list is the contract.
 *
 * ## Why `from` can be a flat path or an array element
 *
 * A capture reports `items[].id`, and a caller may send `items: [{id: 1}]`. This projects the **whole
 * array** when the path names one, preserving its shape rather than flattening it — a mapping is about
 * naming fields, not reshaping collections.
 */
export function applyTriggerOutputMapping(
  payload: Record<string, unknown>,
  mapping: readonly LabWorkflowTriggerMappingRow[] | undefined | null,
): Record<string, unknown> {
  if (!mapping || mapping.length === 0) {
    return payload;
  }

  const out: Record<string, unknown> = {};
  for (const row of mapping) {
    const from = row.from?.trim();
    const to = row.to?.trim();
    if (!from || !to) {
      // A half-written row is skipped rather than writing `undefined` under a real name: the
      // validator blocks save on this, so reaching here means a definition predates that rule.
      continue;
    }
    const value = getPayloadValueAtPath(payload, from);
    if (value === undefined) {
      // A missing source is skipped, not written as undefined. Downstream a condition can test
      // `payload_exists`, which is a clearer signal than a field that exists but is null.
      continue;
    }
    setPayloadValueAtPath(out, to, value);
  }
  return out;
}

/**
 * Rows whose `from` path is absent from `payload`.
 *
 * This is what makes **Adopt** safe: after adopting a new shape, every row pointing at a path the
 * capture did not contain is surfaced for re-pointing, and save is blocked until each is fixed.
 * Silently re-mapping would guess at intent; a `to` that quietly changes meaning is worse than one
 * that refuses to save.
 */
export function unresolvedMappingPaths(
  payload: Record<string, unknown>,
  mapping: readonly LabWorkflowTriggerMappingRow[] | undefined | null,
): string[] {
  if (!mapping || mapping.length === 0) {
    return [];
  }
  return mapping
    .filter((row) => row.from?.trim())
    .filter((row) => getPayloadValueAtPath(payload, row.from.trim()) === undefined)
    .map((row) => row.from.trim());
}

export interface TriggerMappingValidation {
  valid: boolean;
  /** Duplicate `to` names — two sources writing one field is ambiguous, not a merge. */
  duplicateTargets: string[];
  /** Rows missing one half. */
  incomplete: number;
}

/**
 * Structural validation, independent of any payload.
 *
 * Duplicate `to` is an error rather than last-write-wins: two `from` paths mapped onto one `to` means
 * the author has not decided which wins, and picking one silently is how a mapping stops being
 * truthful.
 */
export function validateTriggerMapping(
  mapping: readonly LabWorkflowTriggerMappingRow[] | undefined | null,
): TriggerMappingValidation {
  const rows = mapping ?? [];
  const seen = new Set<string>();
  const duplicateTargets: string[] = [];
  let incomplete = 0;

  for (const row of rows) {
    const from = row.from?.trim() ?? '';
    const to = row.to?.trim() ?? '';
    if (!from || !to) {
      incomplete += 1;
      continue;
    }
    if (seen.has(to)) {
      if (!duplicateTargets.includes(to)) {
        duplicateTargets.push(to);
      }
      continue;
    }
    seen.add(to);
  }

  return {
    valid: duplicateTargets.length === 0 && incomplete === 0,
    duplicateTargets,
    incomplete,
  };
}

/**
 * Suggested rows from a captured shape.
 *
 * Identity mapping — `stepValue` → `stepValue` — because the common case is "take these fields as
 * they are, drop the rest". The author renames the rows they care about.
 *
 * Only **leaf** paths are suggested. An intermediate object (`user`) is not offered, because mapping
 * it and also mapping `user.name` would write the same data twice.
 */
export function suggestedMappingFromShape(
  payload: Record<string, unknown>,
): LabWorkflowTriggerMappingRow[] {
  return collectPayloadShapeFields(payload)
    .filter((field) => field.type !== 'object')
    .map((field) => ({ from: field.path, to: field.path }));
}
