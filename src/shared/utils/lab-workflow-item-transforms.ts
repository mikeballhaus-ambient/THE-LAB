/**
 * Pure item transforms for the declarative data nodes (A2–A6).
 *
 * These live in `shared/` rather than next to the runner because they are **pure functions of
 * (items, step)** with no socket, no database and no dry-run concept — the property the handoff
 * insists on: a node that writes nothing outside the item array needs no `dryRun` branch, so it must
 * not grow one "for symmetry". The step runner is a thin adapter that adds provenance, counts and
 * `detail`.
 *
 * Every transform preserves **provenance**: output item `i` points at this node with `itemIndex: i`,
 * so a later node (or the run panel) can still correlate a row back to where it came from. A filter
 * that drops items keeps the surviving item's original index, because "item 3 of the trigger" is the
 * fact a user wants, not "item 1 of the filter".
 */

import { DateTime, IANAZone } from 'luxon';
import type { LabRuleConditionV1 } from '@/shared/types/lab-rule';
import type { LabWorkflowItem } from '@/shared/types/lab-workflow-items';
import {
  getPayloadValueAtPath,
  setPayloadValueAtPath,
} from '@/shared/utils/lab-payload-path';
import { renderWorkflowMessageTemplate } from '@/shared/utils/lab-workflow-notification-copy';

export interface LabWorkflowFieldAssignment {
  /** Path on the item to write. Dots create nesting. */
  path: string;
  /**
   * `literal` writes `value` as given; `from_payload` reads `value` as a path; `template` renders it.
   *
   * There is deliberately no read-modify-write source here. See {@link applySetFields}.
   */
  source: 'literal' | 'from_payload' | 'template';
  value: string | number | boolean | null;
}

export interface LabWorkflowFieldRename {
  from: string;
  to: string;
}

export interface LabWorkflowDateTimeOperation {
  /** Path to read the source date from. */
  source: string;
  /** Path to write the result to. Defaults to `source` when omitted. */
  target?: string;
  op: 'add' | 'subtract' | 'format';
  amount?: number;
  unit?: 'minutes' | 'hours' | 'days' | 'weeks' | 'months' | 'years';
  /** Output shape: `iso` (default) or a Luxon format string. */
  output?: 'iso' | string;
  /** IANA zone used for the arithmetic and formatting, e.g. `America/Denver`. */
  zone?: string;
}

export interface LabWorkflowSortKey {
  path: string;
  direction?: 'asc' | 'desc';
}

export interface ItemTransformResult {
  items: LabWorkflowItem[];
  /** What the node actually did — the run panel's only defence against a silent no-op. */
  detail: Record<string, unknown>;
}

/**
 * Deep-copy an item's json.
 *
 * Set/Rename mutate a nested path; without a copy they would write into the trigger envelope's
 * payload object, which is shared with every other workflow evaluating the same event. A payload is
 * JSON by construction (`LabDomainEventEnvelopeV1`), so a round trip is safe here and keeps the
 * clone out of the hot path's type system.
 */
function cloneItemJson(json: Record<string, unknown>): Record<string, unknown> {
  return JSON.parse(JSON.stringify(json)) as Record<string, unknown>;
}

function restamp(item: LabWorkflowItem, nodeId: string, itemIndex: number): LabWorkflowItem {
  return { json: item.json, pairedItem: { nodeId, itemIndex } };
}

function resolveAssignmentValue(
  assignment: LabWorkflowFieldAssignment,
  envelopePayload: Record<string, unknown>,
  itemJson: Record<string, unknown>,
): unknown {
  if (assignment.source === 'from_payload') {
    return getPayloadValueAtPath(itemJson, String(assignment.value ?? ''));
  }
  if (assignment.source === 'template') {
    return renderWorkflowMessageTemplate(String(assignment.value ?? ''), {
      payload: envelopePayload,
      item: itemJson,
    });
  }
  return assignment.value;
}

/** A2 — write or overwrite fields on each item. */
export function applySetFields(
  items: readonly LabWorkflowItem[],
  fields: readonly LabWorkflowFieldAssignment[],
  envelopePayload: Record<string, unknown>,
  nodeId: string,
): ItemTransformResult {
  let changed = 0;
  const out = items.map((item, itemIndex) => {
    const json = cloneItemJson(item.json);
    let itemChanged = false;
    for (const field of fields) {
      const value = resolveAssignmentValue(field, envelopePayload, item.json);
      if (getPayloadValueAtPath(json, field.path) !== value) {
        itemChanged = true;
      }
      setPayloadValueAtPath(json, field.path, value);
    }
    if (itemChanged) {
      changed += 1;
    }
    return { json, pairedItem: { nodeId, itemIndex } };
  });
  return {
    items: out,
    detail: { stepKind: 'set_fields', changed, fieldCount: fields.length, itemCount: out.length },
  };
}

/**
 * A3 — rename and/or remove keys.
 *
 * A rename whose source is missing is a no-op rather than an error: the usual authoring path is
 * "copy these three fields, drop that one" across items that do not all carry the same shape.
 */
export function applyRenameFields(
  items: readonly LabWorkflowItem[],
  renames: readonly LabWorkflowFieldRename[],
  remove: readonly string[],
  envelopePayload: Record<string, unknown>,
  nodeId: string,
): ItemTransformResult {
  let renamed = 0;
  let removed = 0;
  const out = items.map((item, itemIndex) => {
    const json = cloneItemJson(item.json);
    for (const { from, to } of renames) {
      const value = getPayloadValueAtPath(json, from);
      if (value === undefined) {
        continue;
      }
      setPayloadValueAtPath(json, to, value);
      deleteAtPath(json, from);
      renamed += 1;
    }
    for (const path of remove) {
      if (getPayloadValueAtPath(json, path) !== undefined) {
        deleteAtPath(json, path);
        removed += 1;
      }
    }
    return { json, pairedItem: { nodeId, itemIndex } };
  });
  // `envelopePayload` is unused but kept in the signature so every transform takes the same
  // arguments — a node helper that needs the envelope should not have to change its shape later.
  void envelopePayload;
  return {
    items: out,
    detail: { stepKind: 'rename_fields', renamed, removed, itemCount: out.length },
  };
}

function deleteAtPath(json: Record<string, unknown>, path: string): void {
  const keys = path.split('.').filter(Boolean);
  if (!keys.length) {
    return;
  }
  let current: Record<string, unknown> = json;
  for (const key of keys.slice(0, -1)) {
    const next = current[key];
    if (next == null || typeof next !== 'object' || Array.isArray(next)) {
      return;
    }
    current = next as Record<string, unknown>;
  }
  delete current[keys[keys.length - 1]];
}

/**
 * A5 — drop items that do not satisfy the condition set.
 *
 * Reuses `LabRuleConditionV1` so a business author learns **one** condition model: the same
 * `payload_equals` / `payload_exists` they already use on a rule node. The evaluator lives here as a
 * sync predicate; `lookup_field_*` conditions need an app call and are therefore rejected by the
 * schema rather than silently treated as "no match".
 */
export function applyFilterItems(
  items: readonly LabWorkflowItem[],
  conditions: readonly LabRuleConditionV1[],
  combine: 'all' | 'any',
  matches: (condition: LabRuleConditionV1, json: Record<string, unknown>) => boolean,
  nodeId: string,
): ItemTransformResult {
  const kept: LabWorkflowItem[] = [];
  let dropped = 0;
  items.forEach((item, itemIndex) => {
    const verdicts = conditions.map((condition) => matches(condition, item.json));
    const pass = combine === 'any' ? verdicts.some(Boolean) : verdicts.every(Boolean);
    if (pass) {
      kept.push({ json: item.json, pairedItem: { nodeId, itemIndex } });
    } else {
      dropped += 1;
    }
  });
  return {
    items: kept,
    detail: {
      stepKind: 'filter_items',
      dropped,
      kept: kept.length,
      itemCount: items.length,
      combine,
    },
  };
}

const DEFAULT_DATE_ZONE = 'UTC';

function resolveZone(zone: string | undefined, warnings: string[]): string {
  const candidate = zone?.trim();
  if (!candidate) {
    return DEFAULT_DATE_ZONE;
  }
  if (!IANAZone.isValidZone(candidate)) {
    // Fall back rather than throw: a bad zone is an authoring mistake in one field, and failing the
    // whole run over it means the user sees a dead workflow with no output to inspect.
    warnings.push(`unknown timezone "${candidate}"`);
    return DEFAULT_DATE_ZONE;
  }
  return candidate;
}

/**
 * Parse a payload date into a zoned `DateTime`.
 *
 * Accepts an ISO string, an epoch-millis number, or a Date-parseable string. A value with no offset
 * is interpreted **in the node's zone** — that is what an author means by "2026-03-01 09:00" in a
 * workflow configured for `America/Denver`.
 */
function parseZonedDateTime(value: unknown, zone: string): DateTime | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return DateTime.fromMillis(value, { zone });
  }
  if (typeof value !== 'string' || !value.trim()) {
    return null;
  }
  const trimmed = value.trim();
  const iso = DateTime.fromISO(trimmed, { zone, setZone: true });
  if (iso.isValid) {
    return iso;
  }
  const sql = DateTime.fromSQL(trimmed, { zone, setZone: true });
  if (sql.isValid) {
    return sql;
  }
  const jsDate = new Date(trimmed);
  if (!Number.isNaN(jsDate.getTime())) {
    return DateTime.fromJSDate(jsDate, { zone });
  }
  return null;
}

/**
 * A4 — add/subtract/format a date field, in a named IANA zone.
 *
 * Luxon is the single date component for the whole programme (A4 and W8): the need is zone
 * **arithmetic** across DST and month-end, which `Intl.DateTimeFormat` cannot do. Hand-rolled offset
 * maths is exactly the kind of thing that is wrong twice a year in every deployment.
 */
export function applyDateTime(
  items: readonly LabWorkflowItem[],
  operations: readonly LabWorkflowDateTimeOperation[],
  nodeId: string,
): ItemTransformResult {
  const warnings: string[] = [];
  let changed = 0;
  let unresolved = 0;

  const out = items.map((item, itemIndex) => {
    const json = cloneItemJson(item.json);
    let itemChanged = false;
    for (const op of operations) {
      const zone = resolveZone(op.zone, warnings);
      const parsed = parseZonedDateTime(getPayloadValueAtPath(json, op.source), zone);
      if (!parsed) {
        unresolved += 1;
        continue;
      }
      let result: string;
      if (op.op === 'format') {
        const shape = op.output && op.output !== 'iso' ? op.output : "yyyy-MM-dd'T'HH:mm:ssZZ";
        result = parsed.setZone(zone).toFormat(shape);
      } else {
        const amount = op.amount ?? 0;
        const unit = op.unit ?? 'days';
        const shifted =
          op.op === 'subtract' ? parsed.minus({ [unit]: amount }) : parsed.plus({ [unit]: amount });
        const zoned = shifted.setZone(zone);
        // Normalise the ISO form to UTC. Emitting the zone offset (`...-07:00`) is correct but makes
        // two equal instants compare unequal as strings, which is the sort of thing a downstream
        // dedupe or `payload_equals` condition would silently get wrong.
        result =
          op.output && op.output !== 'iso'
            ? zoned.toFormat(op.output)
            : zoned.toUTC().toISO() ?? '';
      }
      const target = op.target ?? op.source;
      if (getPayloadValueAtPath(json, target) !== result) {
        itemChanged = true;
      }
      setPayloadValueAtPath(json, target, result);
    }
    if (itemChanged) {
      changed += 1;
    }
    return { json, pairedItem: { nodeId, itemIndex } };
  });

  return {
    items: out,
    detail: {
      stepKind: 'date_time',
      changed,
      unresolved,
      operationCount: operations.length,
      itemCount: out.length,
      ...(warnings.length ? { warnings: [...new Set(warnings)] } : {}),
    },
  };
}

function compareValues(a: unknown, b: unknown): number {
  if (a === b) {
    return 0;
  }
  if (a == null) {
    return -1;
  }
  if (b == null) {
    return 1;
  }
  if (typeof a === 'number' && typeof b === 'number') {
    return a - b;
  }
  return String(a).localeCompare(String(b));
}

/**
 * A6 — sort, limit and dedupe.
 *
 * Applied in that order and **once over the whole array**, which is the difference between this node
 * and a per-item step: "top 3 by amount" is a statement about the list, not about each row.
 */
export function applySortLimitDedupe(
  items: readonly LabWorkflowItem[],
  sort: readonly LabWorkflowSortKey[],
  limit: number | undefined,
  dedupeBy: string | undefined,
  nodeId: string,
): ItemTransformResult {
  let working = [...items];
  const original = working.length;
  let deduped = 0;

  if (dedupeBy) {
    const seen = new Set<string>();
    working = working.filter((item) => {
      const value = getPayloadValueAtPath(item.json, dedupeBy);
      const key = value === undefined ? `__missing__${seen.size}` : String(value);
      if (seen.has(key)) {
        deduped += 1;
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  let reordered = false;
  if (sort.length > 0) {
    const before = working.map((item) => item.json);
    working = [...working].sort((left, right) => {
      for (const key of sort) {
        const cmp = compareValues(
          getPayloadValueAtPath(left.json, key.path),
          getPayloadValueAtPath(right.json, key.path),
        );
        if (cmp !== 0) {
          return key.direction === 'desc' ? -cmp : cmp;
        }
      }
      return 0;
    });
    reordered = working.some((item, index) => item.json !== before[index]);
  }

  let truncated = 0;
  if (limit != null && limit >= 0 && working.length > limit) {
    truncated = working.length - limit;
    working = working.slice(0, limit);
  }

  return {
    items: working.map((item, itemIndex) => restamp(item, nodeId, itemIndex)),
    detail: {
      stepKind: 'sort_items',
      itemCount: original,
      kept: working.length,
      deduped,
      truncated,
      reordered,
    },
  };
}

/**
 * F6 — Split Out: expand an array field into one item per element.
 *
 * An item whose path is **not an array** is passed through unchanged rather than dropped. The usual
 * reason a path is not an array is that one row in a batch has a different shape; silently deleting
 * that row would make the output look correct while quietly losing data.
 */
export function applySplitOut(
  items: readonly LabWorkflowItem[],
  path: string,
  includeOtherFields: boolean,
  targetPath: string | undefined,
  nodeId: string,
): ItemTransformResult {
  const out: LabWorkflowItem[] = [];
  let expanded = 0;
  let passthrough = 0;

  items.forEach((item, sourceIndex) => {
    const value = getPayloadValueAtPath(item.json, path);
    if (!Array.isArray(value)) {
      passthrough += 1;
      out.push({
        json: cloneItemJson(item.json),
        pairedItem: { nodeId, itemIndex: sourceIndex },
      });
      return;
    }
    expanded += 1;
    value.forEach((element) => {
      const base: Record<string, unknown> = includeOtherFields ? cloneItemJson(item.json) : {};
      if (targetPath) {
        setPayloadValueAtPath(base, targetPath, element);
      } else if (element && typeof element === 'object' && !Array.isArray(element)) {
        // Spreading an object element is the useful default: `tags: [{ id, name }]` becomes items
        // with `id` and `name` at the top level, which is what a Set/Filter node can address.
        Object.assign(base, element as Record<string, unknown>);
      } else {
        setPayloadValueAtPath(base, path, element);
      }
      out.push({
        json: base,
        // Provenance points at the *source* item, so "which row did this come from?" survives the
        // expansion — the question Split Out most needs to keep answerable.
        pairedItem: { nodeId, itemIndex: sourceIndex },
      });
    });
  });

  return {
    items: out,
    detail: {
      stepKind: 'split_out',
      expandedItems: expanded,
      passthroughItems: passthrough,
      itemCount: items.length,
      outCount: out.length,
    },
  };
}

/**
 * F3 — Merge: join several branches into one item array.
 *
 * ## Why the input is `readonly LabWorkflowItem[][]`
 *
 * Every other transform takes one array because it maps over rows. A merge is a function of *which
 * branch* each row came from, so flattening first would throw away the only information that makes
 * `by_index` and `by_key` mean anything. The evaluator supplies the arrays in **edge order**, which
 * is the order the author drew them.
 *
 * ## Missing branches
 *
 * A branch that never ran (an IF that took the other port) arrives as an **empty array**, not as an
 * absent entry — the walker buffers `[]` for it rather than waiting. So "one branch had no rows" and
 * "one branch was never reached" are the same thing here, by design: in both cases there is nothing
 * to join, and hanging the run would be the only alternative.
 *
 * ## Join semantics
 *
 * - `append` — concatenation. Empty branches contribute nothing; the result is never empty *because*
 *   a branch was empty.
 * - `by_index` — row *i* of branch 0 paired with row *i* of every later branch, as a `zip`. Row 0 of
 *   the result holds the `json` of every branch's row 0 **under the branch index** (`0`, `1`, …) so
 *   two branches with colliding field names do not overwrite each other. Shorter branches run out;
 *   with `includeUnpaired` the extra rows are emitted alone, otherwise they are dropped and counted.
 * - `by_key` — branch 0 is the base; every later branch is an index keyed by `keyPath`. Matching rows
 *   are **deep-merged** into the base row (the later branch wins on conflict, which is what "join on
 *   this key" means to an author). Keys that repeat keep the first match, because a join that fans
 *   out is a different node and doing it silently would multiply rows.
 *
 * `detail` reports `merged`, `pairs` and `unmatched` for every mode. A by-key merge that matched
 * nothing returns the base rows unchanged and would otherwise look like a successful run — the
 * unmatched count is the only signal the run panel can show.
 */
export function applyMergeItems(
  branches: readonly (readonly LabWorkflowItem[])[],
  mode: 'append' | 'by_index' | 'by_key',
  keyPath: string | undefined,
  includeUnpaired: boolean,
  nodeId: string,
): ItemTransformResult {
  const populated = branches.filter((branch) => branch.length > 0);

  if (branches.length === 0) {
    return {
      items: [],
      detail: { stepKind: 'merge_items', mode, merged: 0, pairs: 0, unmatched: 0, branches: 0 },
    };
  }

  if (mode === 'append') {
    const items: LabWorkflowItem[] = [];
    for (const branch of branches) {
      for (const item of branch) {
        items.push({
          json: cloneItemJson(item.json),
          pairedItem: { nodeId, itemIndex: items.length },
        });
      }
    }
    return {
      items,
      detail: {
        stepKind: 'merge_items',
        mode,
        merged: items.length,
        pairs: 0,
        unmatched: 0,
        branches: branches.length,
        populatedBranches: populated.length,
      },
    };
  }

  if (mode === 'by_index') {
    const longest = branches.reduce((max, branch) => Math.max(max, branch.length), 0);
    const items: LabWorkflowItem[] = [];
    let pairs = 0;
    let unmatched = 0;

    for (let row = 0; row < longest; row += 1) {
      const present = branches
        .map((branch, branchIndex) => ({ branchIndex, item: branch[row] }))
        .filter((entry): entry is { branchIndex: number; item: LabWorkflowItem } => entry.item != null);
      if (present.length === 0) {
        continue;
      }
      const complete = present.length === branches.length;
      if (complete) {
        pairs += 1;
      } else {
        // A row that exists in some branches but not all. Dropping it silently would make a zip of
        // two 3-row branches and one 2-row branch look like a 3-row join with no missing data.
        unmatched += 1;
        if (!includeUnpaired) {
          continue;
        }
      }
      const merged: Record<string, unknown> = {};
      for (const entry of present) {
        merged[String(entry.branchIndex)] = cloneItemJson(entry.item.json);
      }
      items.push({ json: merged, pairedItem: { nodeId, itemIndex: items.length } });
    }

    return {
      items,
      detail: {
        stepKind: 'merge_items',
        mode,
        merged: items.length,
        pairs,
        unmatched,
        branches: branches.length,
        populatedBranches: populated.length,
      },
    };
  }

  // by_key
  const base = branches[0] ?? [];
  if (!keyPath) {
    // Schema allows it, the validator rejects it. Reaching here means a graph bypassed the validator,
    // so fall back to append rather than throwing: an unhandled throw would fail the whole run and
    // hide which node was misconfigured.
    const fallback = applyMergeItems(branches, 'append', undefined, includeUnpaired, nodeId);
    return {
      items: fallback.items,
      detail: { ...fallback.detail, mode: 'by_key', warning: 'missing_key_path' },
    };
  }

  const indexes: Map<string, LabWorkflowItem[]>[] = [];
  for (const branch of branches.slice(1)) {
    const index = new Map<string, LabWorkflowItem[]>();
    for (const item of branch) {
      const key = keyForItem(item, keyPath);
      if (key == null) {
        continue;
      }
      const list = index.get(key) ?? [];
      list.push(item);
      index.set(key, list);
    }
    indexes.push(index);
  }

  const items: LabWorkflowItem[] = [];
  let pairs = 0;
  let unmatched = 0;
  let matchedBranches = 0;

  for (const baseItem of base) {
    const merged = cloneItemJson(baseItem.json);
    const key = keyForItem(baseItem, keyPath);
    let matchedHere = 0;
    if (key != null) {
      for (const index of indexes) {
        const match = index.get(key)?.[0];
        if (match) {
          Object.assign(merged, cloneItemJson(match.json));
          matchedHere += 1;
        }
      }
    }
    if (matchedHere > 0) {
      pairs += 1;
      matchedBranches += matchedHere;
    } else {
      unmatched += 1;
      if (!includeUnpaired) {
        continue;
      }
    }
    items.push({ json: merged, pairedItem: { nodeId, itemIndex: items.length } });
  }

  return {
    items,
    detail: {
      stepKind: 'merge_items',
      mode,
      keyPath,
      merged: items.length,
      pairs,
      unmatched,
      branches: branches.length,
      populatedBranches: populated.length,
      matchedBranches,
      baseCount: base.length,
    },
  };
}

/** Normalise a join key to a string so `1` and `"1"` join, and `null`/absent never join. */
function keyForItem(item: LabWorkflowItem, keyPath: string): string | null {
  const raw = getPayloadValueAtPath(item.json, keyPath);
  if (raw == null) {
    return null;
  }
  if (typeof raw === 'object') {
    return null;
  }
  return String(raw);
}
