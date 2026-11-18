/**
 * When does a schedule fire next?
 *
 * This is a **pure** module on purpose: every DST and month-end bug in a scheduler is an arithmetic
 * bug, and arithmetic is testable without a database, a timer or a workflow. The tick service's only
 * job is to ask this function and persist the answer.
 *
 * ## The one rule everything else follows
 *
 * A schedule is a **wall-clock** pattern in a named zone, and an instant is what gets stored. The two
 * are not interchangeable: "09:00 every weekday in America/Denver" is 16:00Z in winter and 15:00Z in
 * summer. Storing an offset instead of a zone name would make every schedule drift by an hour twice a
 * year — the failure a user notices but cannot explain.
 *
 * So the pattern is evaluated in **floating wall-clock time** and only then converted to an instant.
 * Concretely: `RRULE` is given a `DTSTART` with no `Z`, and its result is re-read as a wall-clock in
 * the target zone. Giving `RRULE` the UTC instant instead would silently pin the pattern to UTC and
 * break on the first DST boundary.
 */

import { DateTime, Duration, IANAZone } from 'luxon';
// `rrule` is CommonJS-only, so a named ESM import fails under Jest's VM modules with
// "does not provide an export named 'RRule'". The default import works in both the CJS and ESM
// builds, and the typed surface is identical.
//
// **This module must never be imported by a `.vue` file.** The browser build cannot resolve
// `rrule`'s default export, so the designer imports the rrule-free helpers in
// [`lab-workflow-schedule-expression.ts`](./lab-workflow-schedule-expression.ts) instead.
import rrulePkg from 'rrule';
import {
  DEFAULT_SCHEDULE_ZONE,
  cronToRRuleBody,
  type LabWorkflowScheduleTimeKind,
} from '@/shared/utils/lab-workflow-schedule-expression';

const RRule = rrulePkg.RRule;
type RRule = InstanceType<typeof rrulePkg.RRule>;

// Re-exported so a server-side caller needs one import, and so the pure helpers are tested through
// the module that used to own them.
export {
  DEFAULT_SCHEDULE_ZONE,
  cronToRRuleBody,
  describeCronInPlainEnglish,
  describeSchedule,
  expandCronValues,
} from '@/shared/utils/lab-workflow-schedule-expression';
export type { LabWorkflowScheduleTimeKind };

export interface NextFireAtParams {
  kind: LabWorkflowScheduleTimeKind;
  /** Cron expression or RRULE body. Required for `cron` and `recurrence`. */
  expression?: string | null;
  /** IANA zone name, e.g. `America/Denver`. Invalid or absent falls back to UTC with a warning. */
  timezone?: string | null;
  /** `interval`: minutes between fires. */
  intervalMinutes?: number | null;
  /** `relative` / `staleness`: whole days applied to the record date. */
  offsetDays?: number | null;
  /** `relative` / `staleness`: the date the offset applies to. */
  recordDate?: string | Date | null;
  /** The instant to compute *from*. Defaults to now. */
  after?: DateTime;
  /** `interval`: the previous fire, so the next one is `lastFired + interval`, not `now + interval`. */
  lastFiredAt?: string | null;
}

export interface NextFireAtResult {
  /** ISO instant, or `null` when the schedule has no further occurrence. */
  nextFireAt: string | null;
  /** Non-fatal problems, surfaced in the editor so a bad zone is not silently UTC. */
  warnings: string[];
}

function resolveZone(zone: string | null | undefined, warnings: string[]): string {
  const candidate = (zone ?? '').trim();
  if (!candidate) {
    return DEFAULT_SCHEDULE_ZONE;
  }
  if (!IANAZone.isValidZone(candidate)) {
    warnings.push(`Unknown timezone "${candidate}" — using ${DEFAULT_SCHEDULE_ZONE}.`);
    return DEFAULT_SCHEDULE_ZONE;
  }
  return candidate;
}

/**
 * Is this authored pattern well-formed?
 *
 * Returns `null` when the pattern parses, or a one-line reason when it does not. This is used by the
 * **validator** at save time, which is the only place an author can still fix it: a stored schedule
 * that cannot be parsed parks at `next_fire_at = null` and never fires, with no symptom other than
 * silence. Cron is translated rather than parsed directly, so `0 9 * * 1-5` is accepted and
 * `0 9 * * 1-5 2026` (a 6-field expression) is rejected with the reason rather than shifted by one
 * field into a plausible-looking but wrong schedule.
 *
 * Deliberately does **not** require a future occurrence: a bounded RRULE that has genuinely finished
 * parses fine, and refusing to save it would make an existing schedule unauthorable.
 */
export function validateScheduleExpression(params: {
  kind: LabWorkflowScheduleTimeKind;
  expression?: string | null;
}): string | null {
  const expression = (params.expression ?? '').trim();

  if (params.kind === 'cron') {
    if (!expression) {
      return 'A cron schedule needs an expression, for example "0 9 * * 1-5".';
    }
    return cronToRRuleBody(expression).error ?? null;
  }

  if (params.kind === 'recurrence') {
    if (!expression) {
      return 'A recurrence schedule needs an RRULE body, for example "FREQ=WEEKLY;BYDAY=MO".';
    }
    try {
      RRule.fromString(`DTSTART:19700101T000000\nRRULE:${expression}`);
      return null;
    } catch (err) {
      return `Recurrence could not be parsed: ${(err as Error).message}`;
    }
  }

  return null;
}

/**
 * Compute the next fire instant.
 *
 * Every variant resolves to one ISO string so the tick loop has a single comparison to make. A
 * `null` result is meaningful: a bounded recurrence has genuinely finished, and the tick must skip it
 * rather than fire it forever.
 */
export function computeNextFireAt(params: NextFireAtParams): NextFireAtResult {
  const warnings: string[] = [];
  const zone = resolveZone(params.timezone, warnings);
  const after = (params.after ?? DateTime.utc()).setZone(zone);

  if (params.kind === 'interval') {
    const minutes = params.intervalMinutes;
    if (minutes == null || !Number.isFinite(minutes) || minutes <= 0) {
      warnings.push('Interval schedule has no positive interval.');
      return { nextFireAt: null, warnings };
    }
    // Anchored to the previous fire, not to "now": anchoring to now would push a 60-minute schedule
    // forward by however late the tick was, forever, and the drift would never recover.
    const base = params.lastFiredAt
      ? DateTime.fromISO(params.lastFiredAt, { zone }).plus(Duration.fromObject({ minutes }))
      : after.plus(Duration.fromObject({ minutes }));
    if (!base.isValid) {
      warnings.push('Previous fire time could not be parsed.');
      return { nextFireAt: null, warnings };
    }
    return { nextFireAt: base.toUTC().toISO(), warnings };
  }

  if (params.kind === 'relative' || params.kind === 'staleness') {
    const offset = params.offsetDays ?? 0;
    if (params.recordDate == null) {
      warnings.push('Schedule needs a record date to offset from.');
      return { nextFireAt: null, warnings };
    }
    const record = typeof params.recordDate === 'string'
      ? DateTime.fromISO(params.recordDate, { zone })
      : DateTime.fromJSDate(params.recordDate, { zone });
    if (!record.isValid) {
      warnings.push('Record date could not be parsed.');
      return { nextFireAt: null, warnings };
    }
    // `relative` fires **before** the record's date ("3 days ahead of the due date"), so the offset is
    // subtracted. `staleness` fires once the record has been sitting for N days, so it is added.
    // Reversing this sign still produces a plausible future instant, which is why the test asserts an
    // exact instant rather than "is in the future".
    const sign = params.kind === 'relative' ? -1 : 1;
    const target = record.plus(Duration.fromObject({ days: sign * offset }));
    return { nextFireAt: target.toUTC().toISO(), warnings };
  }

  const expression = (params.expression ?? '').trim();
  if (!expression) {
    warnings.push('Schedule has no expression.');
    return { nextFireAt: null, warnings };
  }

  let rruleBody = expression;
  if (params.kind === 'cron') {
    const translated = cronToRRuleBody(expression);
    if (!translated.body) {
      warnings.push(translated.error ?? 'Cron expression could not be parsed.');
      return { nextFireAt: null, warnings };
    }
    rruleBody = translated.body;
  }

  let rule: RRule;
  try {
    // Floating `DTSTART` (no `Z`): the pattern is wall-clock in `zone`, converted to an instant only
    // after the occurrence is chosen.
    rule = RRule.fromString(`DTSTART:${toFloatingInstant(after)}\nRRULE:${rruleBody}`);
  } catch (err) {
    warnings.push(`Recurrence could not be parsed: ${(err as Error).message}`);
    return { nextFireAt: null, warnings };
  }

  const next = rule.after(floatingAnchor(after), false);
  if (!next) {
    return { nextFireAt: null, warnings };
  }
  return { nextFireAt: fromFloatingInstant(next, zone), warnings };
}

/** `RRULE` wants `YYYYMMDDTHHMMSS`, without a zone designator. */
function toFloatingInstant(value: DateTime): string {
  return value.toFormat("yyyyLLdd'T'HHmmss");
}

/**
 * The anchor handed to `RRule.after`.
 *
 * `rrule` compares JavaScript `Date`s, so the floating wall-clock has to be parked in a UTC-shaped
 * `Date` whose UTC fields are the wall-clock fields. `fromFloatingInstant` reverses exactly that.
 */
function floatingAnchor(value: DateTime): Date {
  return new Date(Date.UTC(
    value.year,
    value.month - 1,
    value.day,
    value.hour,
    value.minute,
    value.second,
  ));
}

/** Read a floating `Date` back as a wall-clock in `zone`, then take its instant. */
function fromFloatingInstant(value: Date, zone: string): string | null {
  const wallClock = DateTime.fromObject(
    {
      year: value.getUTCFullYear(),
      month: value.getUTCMonth() + 1,
      day: value.getUTCDate(),
      hour: value.getUTCHours(),
      minute: value.getUTCMinutes(),
      second: value.getUTCSeconds(),
    },
    { zone },
  );
  if (!wallClock.isValid) {
    return null;
  }
  // A spring-forward gap (`02:30` on a DST day) does not exist. Luxon shifts it to the next valid
  // instant, which is what a scheduler should do: fire at 03:30 rather than skip the day entirely.
  return wallClock.toUTC().toISO();
}

/**
 * Is this schedule due at `now`?
 *
 * **Missed windows are not backfilled.** A scheduler that fires five times because the process was
 * asleep for five minutes turns a reminder into a burst, and the second through fifth runs have
 * nothing useful to say. Advancing `next_fire_at` past now is the tick's job, so this stays a pure
 * comparison.
 */
export function isScheduleDue(nextFireAt: string | null, now: DateTime): boolean {
  if (!nextFireAt) {
    return false;
  }
  const due = DateTime.fromISO(nextFireAt, { zone: 'utc' });
  if (!due.isValid) {
    return false;
  }
  return due.toMillis() <= now.toUTC().toMillis();
}

