import { isLabRuleConditionMeValue } from '@/shared/constants/lab-rule-condition-me';
import type { LabRuleConditionV1, LabRuleScope } from '@/shared/types/lab-rule';
import { eventTypeMatches } from '@/shared/utils/lab-event-type-match';

export { eventTypeMatches };

export interface LabRuleConditionContext {
  scope: LabRuleScope;
  ownerUserId: number | null;
}

/**
 * Resolves `@me` in payload_equals for user vs global automation.
 * - **user:** rule/workflow owner id
 * - **global:** user id at the same payload path (e.g. assignee on the event)
 */
export function resolveLabRuleConditionExpectedValue(
  rawValue: string | number | boolean | null,
  path: string,
  payload: Record<string, unknown>,
  context: LabRuleConditionContext,
): string | number | boolean | null {
  if (!isLabRuleConditionMeValue(rawValue)) {
    return rawValue;
  }
  if (context.scope === 'user' && context.ownerUserId != null && context.ownerUserId > 0) {
    return String(context.ownerUserId);
  }
  const atPath = getPayloadValue(payload, path);
  if (atPath === undefined || atPath === null) {
    return null;
  }
  if (typeof atPath === 'number' || typeof atPath === 'boolean') {
    return atPath;
  }
  return String(atPath);
}

export function getPayloadValue(payload: Record<string, unknown>, path: string): unknown {
  const trimmed = path.trim();
  if (!trimmed) {
    return payload;
  }
  const keys = trimmed.split('.');
  let current: unknown = payload;
  for (const key of keys) {
    if (current == null || typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

function coerceNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number.parseInt(value, 10);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/**
 * A finite number, or `null` when the value is not numeric.
 *
 * Uses `Number` rather than `Number.parseInt` deliberately: `parseInt('12abc')` returns 12, which
 * would make `amount > 10` true for the string "12abc". For an ordering test a partial parse is a
 * wrong answer, so anything that is not wholly numeric must not compare.
 */
function strictNumber(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '') {
      return null;
    }
    const n = Number(trimmed);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/** Epoch milliseconds, or `null` when the value is not a parseable date. */
function asTimestamp(value: unknown): number | null {
  if (value instanceof Date) {
    const t = value.getTime();
    return Number.isFinite(t) ? t : null;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    // Only ISO-ish strings are treated as dates. `new Date('5')` parses as a year, so letting any
    // string through would quietly turn the number 5 into a date comparison.
    if (!/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
      return null;
    }
    const t = Date.parse(trimmed);
    return Number.isFinite(t) ? t : null;
  }
  return null;
}

/**
 * Order two operands for `<`, `<=`, `>`, `>=`.
 *
 * ## Date-first, then number, then string
 *
 * The type is not always known at evaluation time — a webhook payload has no declaration, and a field
 * the catalog calls `string` may hold a date. Rather than trusting the declaration, the operands are
 * compared by what they actually contain, in the order that is safe:
 *
 * 1. **Both look like dates** → compare timestamps. Doing this first matters because
 *    `'2026-01-02' < '2026-10-01'` is also true lexicographically, so a string compare would pass on
 *    ISO strings but fail the moment a timezone offset or a non-padded format appears.
 * 2. **Both numeric** → compare numerically, so `9 < 10` is true rather than false (string compare
 *    would claim `'9' > '10'`).
 * 3. **Otherwise** → locale-free string compare, which is at least stable and predictable.
 *
 * Returns `null` when the operands are not comparable (a missing field, or a number against a
 * non-numeric string). Callers treat `null` as **no match**, never as true: a condition that cannot
 * be evaluated must not silently pass.
 */
function compareOrdered(
  actual: unknown,
  expected: unknown,
): { kind: 'number'; left: number; right: number } | { kind: 'string'; left: string; right: string } | null {
  if (actual === undefined || actual === null || expected === undefined || expected === null) {
    return null;
  }
  const actualDate = asTimestamp(actual);
  const expectedDate = asTimestamp(expected);
  if (actualDate != null && expectedDate != null) {
    return { kind: 'number', left: actualDate, right: expectedDate };
  }
  const actualNumber = strictNumber(actual);
  const expectedNumber = strictNumber(expected);
  if (actualNumber != null && expectedNumber != null) {
    return { kind: 'number', left: actualNumber, right: expectedNumber };
  }
  // Exactly one side numeric: the author typed a number, so a text comparison is not what they mean.
  // Falling through to string compare here is what made `'12abc' > 10` true — the junk prefix sorts
  // after '10'. Incomparable is the honest answer, and the caller treats it as no-match.
  if (actualNumber != null || expectedNumber != null) {
    return null;
  }
  if (typeof actual === 'object' || typeof expected === 'object') {
    return null;
  }
  return { kind: 'string', left: String(actual), right: String(expected) };
}

/**
 * True when the field is **absent** — the exact negation of what `payload_exists` accepts.
 *
 * `undefined` only, not `null`: `payload_exists` treats a present `null` as present (the publisher
 * chose to send the key), so treating null as missing here would make `exists` and `missing` overlap
 * and leave a condition that answers neither.
 */
function isPayloadValueMissing(value: unknown): boolean {
  return value === undefined;
}

/**
 * Case-insensitive substring test.
 *
 * Stringify rather than reject non-strings: an author aiming a `contains` at a numeric field almost
 * certainly means "does the text of this number contain 42", and refusing would leave them with no
 * working option for that field.
 */
function payloadContains(actual: unknown, expected: string): boolean {
  if (actual === undefined || actual === null) {
    return false;
  }
  const needle = expected.trim().toLowerCase();
  if (needle === '') {
    // An empty needle would match everything, which is never what the author meant.
    return false;
  }
  return String(actual).toLowerCase().includes(needle);
}

export function conditionsMatch(
  conditions: LabRuleConditionV1[] | undefined,
  payload: Record<string, unknown>,
  context?: LabRuleConditionContext,
): boolean {
  if (!conditions || conditions.length === 0) {
    return true;
  }
  for (const condition of conditions) {
    if (condition.kind === 'payload_exists') {
      if (getPayloadValue(payload, condition.path) === undefined) {
        return false;
      }
      continue;
    }
    if (condition.kind === 'payload_missing') {
      if (!isPayloadValueMissing(getPayloadValue(payload, condition.path))) {
        return false;
      }
      continue;
    }
    if (condition.kind === 'payload_contains' || condition.kind === 'payload_not_contains') {
      const actual = getPayloadValue(payload, condition.path);
      const matches = payloadContains(actual, condition.value);
      if (condition.kind === 'payload_contains' ? !matches : matches) {
        return false;
      }
      continue;
    }
    if (
      condition.kind === 'payload_greater_than'
      || condition.kind === 'payload_greater_or_equal'
      || condition.kind === 'payload_less_than'
      || condition.kind === 'payload_less_or_equal'
    ) {
      const actual = getPayloadValue(payload, condition.path);
      const ordered = compareOrdered(actual, condition.value);
      if (!ordered) {
        // Not comparable (missing field, or a number against text). A test that cannot be evaluated
        // must not pass — otherwise `amount > 100` would fire on a payload with no `amount` at all.
        return false;
      }
      const cmp =
        ordered.kind === 'number'
          ? ordered.left - ordered.right
          : ordered.left < ordered.right
            ? -1
            : ordered.left > ordered.right
              ? 1
              : 0;
      const matches =
        condition.kind === 'payload_greater_than'
          ? cmp > 0
          : condition.kind === 'payload_greater_or_equal'
            ? cmp >= 0
            : condition.kind === 'payload_less_than'
              ? cmp < 0
              : cmp <= 0;
      if (!matches) {
        return false;
      }
      continue;
    }
    if (condition.kind === 'payload_not_equals') {
      // Reuse the equals logic (including `@me` resolution and numeric coercion) and invert it, so the
      // two operators can never drift apart.
      if (
        conditionsMatch(
          [{ ...condition, kind: 'payload_equals' }],
          payload,
          context,
        )
      ) {
        return false;
      }
      continue;
    }
    if (condition.kind === 'payload_equals') {
      const actual = getPayloadValue(payload, condition.path);
      if (isLabRuleConditionMeValue(condition.value)) {
        const emptyActual =
          actual === undefined ||
          actual === null ||
          (typeof actual === 'string' && actual.trim() === '');
        if (emptyActual) {
          return false;
        }
      }
      const expected =
        context != null
          ? resolveLabRuleConditionExpectedValue(
              condition.value,
              condition.path,
              payload,
              context,
            )
          : condition.value;
      let matches = actual === expected;
      if (!matches && typeof expected === 'number') {
        matches = coerceNumber(actual) === expected;
      }
      if (!matches && actual != null && expected != null && expected !== '') {
        matches = String(actual) === String(expected);
      }
      if (!matches) {
        return false;
      }
    }
  }
  return true;
}

export interface LabRuleConditionIntegrationContext {
  actorUser: import('@/shared/types/user').User;
  fetchRecord: (
    providerAppId: string,
    serviceId: string,
    recordId: string | number,
  ) => Promise<Record<string, unknown> | null>;
}

function lookupFieldValue(
  record: Record<string, unknown> | null,
  field: string,
): unknown {
  if (!record) {
    return undefined;
  }
  if (field.includes('.')) {
    return getPayloadValue(record, field);
  }
  return record[field];
}

export async function conditionsMatchAsync(
  conditions: LabRuleConditionV1[] | undefined,
  payload: Record<string, unknown>,
  context?: LabRuleConditionContext,
  integration?: LabRuleConditionIntegrationContext,
): Promise<boolean> {
  if (!conditions || conditions.length === 0) {
    return true;
  }
  for (const condition of conditions) {
    if (condition.kind === 'lookup_field_exists' || condition.kind === 'lookup_field_equals') {
      if (!integration) {
        return false;
      }
      const recordIdRaw = getPayloadValue(payload, condition.recordIdPath);
      if (recordIdRaw === undefined || recordIdRaw === null) {
        return false;
      }
      const recordId =
        typeof recordIdRaw === 'number' || typeof recordIdRaw === 'string'
          ? recordIdRaw
          : String(recordIdRaw);
      const record = await integration.fetchRecord(
        condition.providerAppId,
        condition.serviceId,
        recordId,
      );
      const actual = lookupFieldValue(record, condition.field);
      if (condition.kind === 'lookup_field_exists') {
        if (actual === undefined || actual === null) {
          return false;
        }
        continue;
      }
      const expected = condition.value;
      let matches = actual === expected;
      if (!matches && typeof expected === 'number') {
        matches = coerceNumber(actual) === expected;
      }
      if (!matches && actual != null && expected != null && expected !== '') {
        matches = String(actual) === String(expected);
      }
      if (!matches) {
        return false;
      }
      continue;
    }
    if (!conditionsMatch([condition], payload, context)) {
      return false;
    }
  }
  return true;
}
