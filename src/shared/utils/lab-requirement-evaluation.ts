import { DateTime } from 'luxon';
import type {
  LabRequirementPredicate,
  LabRequirementV1,
} from '@/shared/types/lab-requirement';

/**
 * The pure half of the requirement sweep: does this record qualify, and on which day?
 *
 * Kept separate from the sweep service because every bug worth having here is an arithmetic bug —
 * an off-by-one in the window, a predicate that matched a `null`, a `YYYY-MM` that resolved to the
 * first of the month instead of the first of the next. Those are testable with a fixture and a
 * date, and none of them need a connector, a database or the clock.
 */

/** The platform's comparison zone. Stated once, not derived per record. */
export const LAB_REQUIREMENT_COMPARISON_ZONE = 'utc';

/** Result of reading a record's date field. */
export type RequirementDateRead =
  | { ok: true; /** Calendar day the requirement is measured against, `YYYY-MM-DD`. */ day: string }
  | { ok: false; reason: string };

/**
 * Read a `YYYY-MM` period as the first day of the **following** month.
 *
 * A rent payment for `2026-10` is due by the end of October; the period is only definitively
 * elapsed on 1 November. Resolving to the 1st of October would mark every payment late on the day
 * the month began.
 */
function readYearMonthDay(raw: string): RequirementDateRead {
  const match = /^(\d{4})-(\d{2})/.exec(raw.trim());
  if (!match) {
    return { ok: false, reason: `Not a YYYY-MM period: ${raw}` };
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) {
    return { ok: false, reason: `Month out of range: ${raw}` };
  }
  const firstOfPeriod = DateTime.fromObject({ year, month, day: 1 }, { zone: 'utc' });
  if (!firstOfPeriod.isValid) {
    return { ok: false, reason: `Invalid period: ${raw}` };
  }
  return { ok: true, day: firstOfPeriod.plus({ months: 1 }).toISODate() ?? '' };
}

/**
 * Reduce a record's date value to a calendar day.
 *
 * A date-only string keeps its own day (shifting it into a zone would move the boundary for no
 * reason); a timestamp is read as an instant and expressed as a UTC day.
 */
export function readRequirementRecordDay(
  value: unknown,
  format: LabRequirementV1['datePathFormat'] = 'date',
): RequirementDateRead {
  if (value == null) {
    return { ok: false, reason: 'Date field is empty' };
  }
  if (value instanceof Date) {
    const day = DateTime.fromJSDate(value, { zone: 'utc' }).toISODate();
    return day ? { ok: true, day } : { ok: false, reason: 'Invalid Date value' };
  }
  if (typeof value === 'number') {
    const day = DateTime.fromMillis(value, { zone: 'utc' }).toISODate();
    return day ? { ok: true, day } : { ok: false, reason: 'Invalid numeric timestamp' };
  }
  if (typeof value !== 'string' || value.trim() === '') {
    return { ok: false, reason: 'Date field is not a string' };
  }
  const text = value.trim();
  if (format === 'year-month') {
    return readYearMonthDay(text);
  }

  // A bare `YYYY-MM-DD` is a calendar date already; reading it as an instant would let a zone
  // conversion move it to the previous day.
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (dateOnly) {
    const parsed = DateTime.fromISO(text, { zone: 'utc' });
    return parsed.isValid
      ? { ok: true, day: text }
      : { ok: false, reason: `Invalid date: ${text}` };
  }

  const parsed = DateTime.fromISO(text, { zone: 'utc' });
  if (!parsed.isValid) {
    // SQLite `datetime('now')` writes `YYYY-MM-DD HH:MM:SS`, which ISO parsing rejects but which is
    // perfectly readable. Accepting it prevents an app's default timestamp from silently disabling
    // a requirement.
    const spaceForm = DateTime.fromSQL(text, { zone: 'utc' });
    if (!spaceForm.isValid) {
      return { ok: false, reason: `Unreadable date: ${text}` };
    }
    return { ok: true, day: spaceForm.toISODate() ?? '' };
  }
  return { ok: true, day: parsed.toISODate() ?? '' };
}

/** Whole days from `fromDay` to `toDay` (positive when `toDay` is later). */
export function daysBetweenDays(fromDay: string, toDay: string): number | null {
  const from = DateTime.fromISO(fromDay, { zone: 'utc' });
  const to = DateTime.fromISO(toDay, { zone: 'utc' });
  if (!from.isValid || !to.isValid) {
    return null;
  }
  return Math.round(to.startOf('day').diff(from.startOf('day'), 'days').days);
}

/**
 * Is the record inside its requirement window **today**?
 *
 * `before`  — `today >= date - offsetDays` and `today <= date`
 * `after`   — `today >= date + offsetDays` and `today <= date + offsetDays + horizonDays`
 *
 * Window membership is not the same as "should fire": the sweep's state table decides that, and it
 * fires on **entry**. This function answers only the date question.
 */
export function isRequirementInWindow(
  requirement: Pick<LabRequirementV1, 'relation' | 'offsetDays' | 'horizonDays'>,
  recordDay: string,
  todayDay: string,
): boolean {
  const fromRecord = daysBetweenDays(recordDay, todayDay);
  if (fromRecord == null) {
    return false;
  }
  if (requirement.relation === 'before') {
    // `fromRecord` is negative when today precedes the record date.
    return fromRecord <= 0 && -fromRecord <= requirement.offsetDays;
  }
  const horizon = requirement.horizonDays ?? 0;
  return fromRecord >= requirement.offsetDays && fromRecord <= requirement.offsetDays + horizon;
}

function normalizeScalar(value: unknown): string {
  if (value == null) {
    return '';
  }
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  return String(value);
}

function predicateValuesMatch(predicate: LabRequirementPredicate, actual: string): boolean {
  const candidates =
    predicate.values?.map(normalizeScalar) ??
    (predicate.equals === undefined ? [] : [normalizeScalar(predicate.equals)]);
  switch (predicate.operator ?? 'equals') {
    case 'in':
    case 'equals':
      return candidates.includes(actual);
    case 'not_in':
    case 'not_equals':
      return !candidates.includes(actual);
    default:
      return false;
  }
}

/**
 * Read a dotted path off a record.
 *
 * A missing field yields `undefined` — deliberately not an error, because a predicate on an
 * optional property should exclude the record, not break the sweep.
 */
export function readRecordPath(record: Record<string, unknown>, path: string): unknown {
  if (!path) {
    return undefined;
  }
  let cursor: unknown = record;
  for (const segment of path.split('.')) {
    if (cursor == null || typeof cursor !== 'object') {
      return undefined;
    }
    cursor = (cursor as Record<string, unknown>)[segment];
  }
  return cursor;
}

/**
 * All predicates must pass.
 *
 * A predicate naming a missing field evaluates **false**, not true. The alternative would let a
 * renamed column quietly make `lease.expiring` fire for ended leases — the exact failure the
 * predicate exists to prevent.
 */
export function predicatesMatch(
  predicates: readonly LabRequirementPredicate[] | undefined,
  record: Record<string, unknown>,
): boolean {
  if (!predicates?.length) {
    return true;
  }
  for (const predicate of predicates) {
    const raw = readRecordPath(record, predicate.path);
    if (raw == null) {
      return false;
    }
    if (!predicateValuesMatch(predicate, normalizeScalar(raw))) {
      return false;
    }
  }
  return true;
}

/** Today's calendar day in the platform's comparison zone. */
export function todayInComparisonZone(now: DateTime = DateTime.utc()): string {
  return now.setZone(LAB_REQUIREMENT_COMPARISON_ZONE).toISODate() ?? '';
}
