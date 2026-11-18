import { describe, expect, test } from '@jest/globals';
import { conditionsMatch } from '@/backend/lab-rules/lab-rules-match';
import type { LabRuleConditionV1 } from '@/shared/types/lab-rule';

/**
 * Comparison operators added after the original equals/exists pair.
 *
 * The property that matters most: **an unevaluable comparison must not pass.** A condition that
 * cannot be resolved (missing field, number against text) returning `true` would make a `> 100`
 * guard fire on payloads that have no such field at all — the worst kind of failure, because the
 * workflow does something plausible-looking on data it never checked.
 */

function match(condition: LabRuleConditionV1, payload: Record<string, unknown>): boolean {
  return conditionsMatch([condition], payload);
}

describe('payload_equals / payload_not_equals', () => {
  test('equals still coerces a numeric string', () => {
    expect(match({ kind: 'payload_equals', path: 'n', value: 3 }, { n: '3' })).toBe(true);
  });

  test('not_equals is the exact inverse of equals', () => {
    const condition: LabRuleConditionV1 = { kind: 'payload_equals', path: 'n', value: 3 };
    expect(match(condition, { n: '3' })).toBe(true);
    expect(match({ ...condition, kind: 'payload_not_equals' }, { n: '3' })).toBe(false);
    expect(match({ ...condition, kind: 'payload_not_equals' }, { n: 4 })).toBe(true);
  });

  test('not_equals keeps @me resolution', () => {
    // Reusing the equals path is what guarantees `@me` is not special-cased twice and drifting.
    expect(
      conditionsMatch(
        [{ kind: 'payload_not_equals', path: 'assigneeId', value: '@me' }],
        { assigneeId: 7 },
        { scope: 'user', ownerUserId: 7 },
      ),
    ).toBe(false);
    expect(
      conditionsMatch(
        [{ kind: 'payload_not_equals', path: 'assigneeId', value: '@me' }],
        { assigneeId: 8 },
        { scope: 'user', ownerUserId: 7 },
      ),
    ).toBe(true);
  });
});

describe('ordering operators on numbers', () => {
  test('greater than compares numerically, not lexicographically', () => {
    // The bug a string compare would cause: '9' > '10' is true as text.
    expect(match({ kind: 'payload_greater_than', path: 'n', value: 10 }, { n: 9 })).toBe(false);
    expect(match({ kind: 'payload_greater_than', path: 'n', value: 10 }, { n: 11 })).toBe(true);
    expect(match({ kind: 'payload_greater_than', path: 'n', value: 10 }, { n: '11' })).toBe(true);
  });

  test('greater or equal includes the boundary', () => {
    expect(match({ kind: 'payload_greater_or_equal', path: 'n', value: 10 }, { n: 10 })).toBe(true);
    expect(match({ kind: 'payload_greater_or_equal', path: 'n', value: 10 }, { n: 9.99 })).toBe(false);
  });

  test('less than and less or equal', () => {
    expect(match({ kind: 'payload_less_than', path: 'n', value: 3 }, { n: 2 })).toBe(true);
    expect(match({ kind: 'payload_less_than', path: 'n', value: 3 }, { n: 3 })).toBe(false);
    expect(match({ kind: 'payload_less_or_equal', path: 'n', value: 3 }, { n: 3 })).toBe(true);
  });

  test('a partially numeric string does not compare', () => {
    // parseInt('12abc') is 12 — accepting it would make "amount > 10" true for junk input.
    expect(match({ kind: 'payload_greater_than', path: 'n', value: 10 }, { n: '12abc' })).toBe(false);
  });
});

describe('ordering operators on dates', () => {
  test('ISO date strings compare as instants', () => {
    expect(
      match(
        { kind: 'payload_less_than', path: 'due', value: '2026-10-01T00:00:00Z' },
        { due: '2026-09-30T12:00:00Z' },
      ),
    ).toBe(true);
  });

  test('a timezone offset is respected rather than string-compared', () => {
    // '2026-10-01T01:00+02:00' is 2026-09-30T23:00Z — earlier than 00:00Z, though it sorts later as
    // a plain string. This is why the date check runs before the string fallback.
    expect(
      match(
        { kind: 'payload_less_than', path: 'due', value: '2026-10-01T00:00:00Z' },
        { due: '2026-10-01T01:00:00+02:00' },
      ),
    ).toBe(true);
  });

  test('a non-date string falls back to string ordering', () => {
    expect(match({ kind: 'payload_less_than', path: 'v', value: 'banana' }, { v: 'apple' })).toBe(
      true,
    );
  });
});

describe('ordering refuses to guess', () => {
  test('a missing field does not match any ordering operator', () => {
    for (const kind of [
      'payload_greater_than',
      'payload_greater_or_equal',
      'payload_less_than',
      'payload_less_or_equal',
    ] as const) {
      expect(match({ kind, path: 'n', value: 0 }, {})).toBe(false);
    }
  });

  test('a null field does not match any ordering operator', () => {
    expect(match({ kind: 'payload_less_than', path: 'n', value: 100 }, { n: null })).toBe(false);
  });

  test('text against a number does not match', () => {
    expect(match({ kind: 'payload_less_than', path: 'n', value: 100 }, { n: 'abc' })).toBe(false);
  });
});

describe('contains operators', () => {
  test('contains is case-insensitive', () => {
    expect(match({ kind: 'payload_contains', path: 's', value: 'URGENT' }, { s: 'very urgent!' })).toBe(
      true,
    );
  });

  test('not_contains is the inverse', () => {
    expect(
      match({ kind: 'payload_not_contains', path: 's', value: 'urgent' }, { s: 'calm' }),
    ).toBe(true);
  });

  test('an empty needle matches nothing', () => {
    // An empty substring is in every string; matching everything is never what the author meant.
    expect(match({ kind: 'payload_contains', path: 's', value: '   ' }, { s: 'anything' })).toBe(
      false,
    );
  });

  test('a missing field does not match contains', () => {
    expect(match({ kind: 'payload_contains', path: 's', value: 'x' }, {})).toBe(false);
  });

  test('numbers are stringified so contains still works', () => {
    expect(match({ kind: 'payload_contains', path: 'n', value: '42' }, { n: 1420 })).toBe(true);
  });
});

describe('presence operators', () => {
  test('exists matches a present null, matching the original semantics', () => {
    expect(match({ kind: 'payload_exists', path: 'x' }, { x: null })).toBe(true);
  });

  test('missing is the inverse of exists on undefined only', () => {
    expect(match({ kind: 'payload_missing', path: 'x' }, {})).toBe(true);
    expect(match({ kind: 'payload_missing', path: 'x' }, { x: null })).toBe(false);
    expect(match({ kind: 'payload_missing', path: 'x' }, { x: 0 })).toBe(false);
  });
});
