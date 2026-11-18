import { describe, expect, test } from '@jest/globals';
import {
  daysBetweenDays,
  isRequirementInWindow,
  predicatesMatch,
  readRecordPath,
  readRequirementRecordDay,
} from '@/shared/utils/lab-requirement-evaluation';

/**
 * The pure half of the requirement sweep.
 *
 * Every failure worth having here is arithmetic: a window that includes the wrong boundary, a
 * `YYYY-MM` that resolves to the wrong month, or a predicate that matches a `null` and lets an
 * ended lease fire. None of them need a connector or a database, so none of them are tested with
 * one.
 */

describe('requirement date reading', () => {
  test('a date-only value keeps its own calendar day', () => {
    // Reading `2026-11-01` as an instant and converting to UTC would move it to 31 October in any
    // negative-offset deployment — a one-day error on every record.
    expect(readRequirementRecordDay('2026-11-01')).toEqual({ ok: true, day: '2026-11-01' });
  });

  test('a timestamp resolves to its UTC day', () => {
    expect(readRequirementRecordDay('2026-11-01T16:30:00Z')).toEqual({
      ok: true,
      day: '2026-11-01',
    });
  });

  test('a SQLite datetime is readable', () => {
    // `datetime('now')` writes `YYYY-MM-DD HH:MM:SS`, which strict ISO parsing rejects. Rejecting it
    // would silently disable every requirement on an app that relies on the column default.
    expect(readRequirementRecordDay('2026-11-01 08:00:00')).toEqual({
      ok: true,
      day: '2026-11-01',
    });
  });

  test('a YYYY-MM period resolves to the first day of the following month', () => {
    // Rent for 2026-10 is due by the end of October; the period has only definitively elapsed on
    // 1 November. Resolving to 1 October would mark every payment late on day one.
    expect(readRequirementRecordDay('2026-10', 'year-month')).toEqual({
      ok: true,
      day: '2026-11-01',
    });
  });

  test('a December period rolls into the next year', () => {
    expect(readRequirementRecordDay('2026-12', 'year-month')).toEqual({
      ok: true,
      day: '2027-01-01',
    });
  });

  test('an empty or unreadable date reports a reason instead of guessing', () => {
    expect(readRequirementRecordDay('')).toMatchObject({ ok: false });
    expect(readRequirementRecordDay(null)).toMatchObject({ ok: false });
    expect(readRequirementRecordDay('not a date')).toMatchObject({ ok: false });
  });
});

describe('requirement window', () => {
  const before = { relation: 'before' as const, offsetDays: 30 };
  const after = { relation: 'after' as const, offsetDays: 0, horizonDays: 1 };

  test('daysBetweenDays is signed and day-granular', () => {
    expect(daysBetweenDays('2026-11-01', '2026-11-04')).toBe(3);
    expect(daysBetweenDays('2026-11-04', '2026-11-01')).toBe(-3);
    expect(daysBetweenDays('2026-11-01', '2026-11-01')).toBe(0);
  });

  test('"30 days before" includes 30 days out and the date itself, and nothing earlier', () => {
    // The phase's verify list names 31 days explicitly: it must publish nothing.
    expect(isRequirementInWindow(before, '2026-12-01', '2026-10-31')).toBe(false);
    expect(isRequirementInWindow(before, '2026-12-01', '2026-11-01')).toBe(true);
    expect(isRequirementInWindow(before, '2026-12-01', '2026-12-01')).toBe(true);
  });

  test('"after" opens on the date and stays open for its horizon', () => {
    expect(isRequirementInWindow(after, '2026-11-01', '2026-10-31')).toBe(false);
    expect(isRequirementInWindow(after, '2026-11-01', '2026-11-01')).toBe(true);
    expect(isRequirementInWindow(after, '2026-11-01', '2026-11-02')).toBe(true);
    // Past the horizon: the record leaves the window and the sweep stops considering it.
    expect(isRequirementInWindow(after, '2026-11-01', '2026-11-03')).toBe(false);
  });
});

describe('requirement predicates', () => {
  test('reads a dotted path', () => {
    expect(readRecordPath({ lease: { status: 'active' } }, 'lease.status')).toBe('active');
    expect(readRecordPath({ lease: null }, 'lease.status')).toBeUndefined();
  });

  test('an `ended` lease fails the `active` predicate', () => {
    // This is the assertion the phase's verify list states directly.
    expect(
      predicatesMatch([{ path: 'status', equals: 'active' }], { status: 'ended' }),
    ).toBe(false);
    expect(
      predicatesMatch([{ path: 'status', equals: 'active' }], { status: 'active' }),
    ).toBe(true);
  });

  test('`not_in` excludes finished work', () => {
    const predicate = [{ path: 'status', operator: 'not_in' as const, values: ['done', 'skipped'] }];
    expect(predicatesMatch(predicate, { status: 'due' })).toBe(true);
    expect(predicatesMatch(predicate, { status: 'done' })).toBe(false);
    expect(predicatesMatch(predicate, { status: 'skipped' })).toBe(false);
  });

  test('a missing predicate field excludes the record rather than passing it', () => {
    // If absence passed, renaming a column would quietly make `lease.expiring` fire for every row.
    expect(predicatesMatch([{ path: 'status', equals: 'active' }], {})).toBe(false);
  });

  test('numeric and boolean comparisons are normalised to strings', () => {
    expect(predicatesMatch([{ path: 'passed', equals: true }], { passed: true })).toBe(true);
    expect(predicatesMatch([{ path: 'score', equals: 70 }], { score: 70 })).toBe(true);
    expect(predicatesMatch([{ path: 'score', equals: 70 }], { score: 69 })).toBe(false);
  });
});
