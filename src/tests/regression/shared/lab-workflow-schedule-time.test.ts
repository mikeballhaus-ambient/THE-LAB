import { describe, expect, test } from '@jest/globals';
import { DateTime } from 'luxon';
import {
  computeNextFireAt,
  cronToRRuleBody,
  describeCronInPlainEnglish,
  describeSchedule,
  isScheduleDue,
  validateScheduleExpression,
} from '@/shared/utils/lab-workflow-schedule-time';
import { validateCronExpression } from '@/shared/utils/lab-workflow-schedule-expression';

/**
 * The designer imports the **rrule-free** module (`lab-workflow-schedule-expression.ts`). These two
 * assertions exist because that split is invisible at the type level: a shared helper that
 * accidentally moved into the `rrule` module would still type-check and would still pass a unit test,
 * but it would break `npm run build`.
 */
describe('rrule-free schedule helpers', () => {
  test('the designer module validates a cron without rrule', () => {
    expect(validateCronExpression('0 9 * * 1-5')).toBeNull();
    expect(validateCronExpression('0 25 * * *')).toMatch(/Hour/);
  });

  test('the rrule module and the designer module agree on the cron verdict', () => {
    for (const expression of ['0 9 * * 1-5', '0 25 * * *', '0 9 * * 1-5 2026', '0 9 1 * 1', '* * * * *']) {
      expect(validateCronExpression(expression)).toBe(
        validateScheduleExpression({ kind: 'cron', expression }),
      );
    }
  });
});

/**
 * W8 — the clock.
 *
 * Every case here is a date-arithmetic fact that a scheduler gets wrong in a way nobody notices until
 * a user complains, so they are asserted as **instants** rather than as readable dates. The three
 * that matter most:
 *
 * 1. a daily wall-clock schedule keeps its local time across a DST boundary;
 * 2. a monthly schedule on the 31st does what the author meant in February;
 * 3. a missed window does not produce a burst of backfilled runs.
 */

describe('cronToRRuleBody — translation', () => {
  test.each([
    ['every minute', '* * * * *', 'FREQ=MINUTELY;INTERVAL=1'],
    ['step minutes', '*/15 * * * *', 'FREQ=MINUTELY;INTERVAL=15'],
    ['hourly on the hour', '0 * * * *', 'FREQ=HOURLY;BYMINUTE=0'],
    ['daily at 09:00', '0 9 * * *', 'FREQ=DAILY;BYMINUTE=0;BYHOUR=9'],
    ['weekdays at 09:00', '0 9 * * 1-5', 'FREQ=WEEKLY;BYMINUTE=0;BYHOUR=9;BYDAY=MO,TU,WE,TH,FR'],
    ['monthly on the 1st', '0 8 1 * *', 'FREQ=MONTHLY;BYMONTHDAY=1;BYMINUTE=0;BYHOUR=8'],
    ['yearly in January', '0 8 1 1 *', 'FREQ=MONTHLY;BYMONTHDAY=1;BYMINUTE=0;BYHOUR=8;BYMONTH=1'],
  ])('translates %s', (_name, cron, expected) => {
    expect(cronToRRuleBody(cron).body).toBe(expected);
  });

  test.each([
    ['seconds field', '0 0 9 * * *', '5 fields'],
    ['minute out of range', '60 * * * *', 'outside 0-59'],
    ['hour out of range', '0 24 * * *', 'outside 0-23'],
    ['day of week out of range', '0 9 * * 7', 'outside 0-6'],
    ['inverted range', '0 9 * * 5-2', 'outside 0-6'],
    ['step in the month field', '0 9 * */2 *', 'step'],
    ['step in day-of-week', '0 9 * * */2', 'step'],
    [
      'both day fields restricted',
      '0 9 1 * 1',
      'cannot restrict both day-of-month and day-of-week',
    ],
  ])('rejects %s', (_name, cron, message) => {
    const result = cronToRRuleBody(cron);
    expect(result.body).toBeNull();
    expect(result.error).toContain(message);
  });
});

describe('computeNextFireAt — cron is wall-clock in the zone', () => {
  test('daily 09:00 in Denver is 16:00Z in winter', () => {
    // 2026-01-15 is MST (UTC-7).
    const result = computeNextFireAt({
      kind: 'cron',
      expression: '0 9 * * *',
      timezone: 'America/Denver',
      after: DateTime.fromISO('2026-01-15T08:00:00', { zone: 'America/Denver' }),
    });
    expect(result.nextFireAt).toBe('2026-01-15T16:00:00.000Z');
  });

  test('the same schedule is 15:00Z in summer', () => {
    // 2026-07-15 is MDT (UTC-6). This is the assertion that fails if the pattern were evaluated in
    // UTC instead of in the zone.
    const result = computeNextFireAt({
      kind: 'cron',
      expression: '0 9 * * *',
      timezone: 'America/Denver',
      after: DateTime.fromISO('2026-07-15T08:00:00', { zone: 'America/Denver' }),
    });
    expect(result.nextFireAt).toBe('2026-07-15T15:00:00.000Z');
  });

  test('crossing the spring-forward boundary keeps the local time', () => {
    // 2026-03-08 is the US spring-forward day (clocks jump 02:00 → 03:00 local).
    //
    // From 10:00 local on the 7th, the next 09:00 is on the 8th — already in MDT, so it is 15:00Z,
    // not 16:00Z. That one-day-apart shift is the whole point: a fixed-offset implementation would
    // keep emitting 16:00Z forever and the user's reminder would silently move to 08:00.
    const onSpringForwardDay = computeNextFireAt({
      kind: 'cron',
      expression: '0 9 * * *',
      timezone: 'America/Denver',
      after: DateTime.fromISO('2026-03-07T10:00:00', { zone: 'America/Denver' }),
    });
    expect(onSpringForwardDay.nextFireAt).toBe('2026-03-08T15:00:00.000Z');

    // And it stays 15:00Z the following day — 09:00 local is what is constant, not the offset.
    const dayAfter = computeNextFireAt({
      kind: 'cron',
      expression: '0 9 * * *',
      timezone: 'America/Denver',
      after: DateTime.fromISO('2026-03-08T10:00:00', { zone: 'America/Denver' }),
    });
    expect(dayAfter.nextFireAt).toBe('2026-03-09T15:00:00.000Z');
  });

  test('weekdays skip the weekend', () => {
    // Friday 2026-10-16 → next is Monday 2026-10-19, not Saturday.
    const result = computeNextFireAt({
      kind: 'cron',
      expression: '0 9 * * 1-5',
      timezone: 'UTC',
      after: DateTime.fromISO('2026-10-16T10:00:00', { zone: 'UTC' }),
    });
    expect(result.nextFireAt).toBe('2026-10-19T09:00:00.000Z');
  });

  test('a rejected cron expression yields no fire time and a warning', () => {
    const result = computeNextFireAt({
      kind: 'cron',
      expression: '0 9 1 * 1',
      timezone: 'UTC',
    });
    expect(result.nextFireAt).toBeNull();
    expect(result.warnings[0]).toContain('cannot restrict both');
  });
});

describe('computeNextFireAt — month end', () => {
  test('the 31st clamps into a shorter month rather than skipping it', () => {
    // RRULE's BYMONTHDAY=31 skips months without a 31st. Luxon-driven clamping is the behaviour a
    // user means: "monthly on the 31st" in a 30-day month is the last day, not "never".
    const result = computeNextFireAt({
      kind: 'recurrence',
      expression: 'FREQ=MONTHLY;BYMONTHDAY=-1',
      timezone: 'UTC',
      after: DateTime.fromISO('2026-02-10T00:00:00', { zone: 'UTC' }),
    });
    // `-1` is the last day of the month, which is what "end of month" resolves to.
    expect(result.nextFireAt).toBe('2026-02-28T00:00:00.000Z');
  });

  test('February in a leap year is the 29th', () => {
    const result = computeNextFireAt({
      kind: 'recurrence',
      expression: 'FREQ=MONTHLY;BYMONTHDAY=-1',
      timezone: 'UTC',
      after: DateTime.fromISO('2028-02-10T00:00:00', { zone: 'UTC' }),
    });
    expect(result.nextFireAt).toBe('2028-02-29T00:00:00.000Z');
  });

  test('a 31st schedule advances into the next month that has one', () => {
    const result = computeNextFireAt({
      kind: 'recurrence',
      expression: 'FREQ=MONTHLY;BYMONTHDAY=31',
      timezone: 'UTC',
      after: DateTime.fromISO('2026-01-31T12:00:00', { zone: 'UTC' }),
    });
    // February has no 31st, so the next occurrence is March 31st — the documented RRULE behaviour,
    // and the reason "end of month" must be authored as `-1`, not `31`.
    //
    // The time of day carries over from `after` (12:00): the rule bounds the day, not the hour. A
    // schedule that needs a specific hour must say so with `BYHOUR`.
    expect(result.nextFireAt).toBe('2026-03-31T12:00:00.000Z');
  });
});

describe('computeNextFireAt — interval', () => {
  test('anchors on the previous fire, not on now', () => {
    const result = computeNextFireAt({
      kind: 'interval',
      intervalMinutes: 60,
      timezone: 'UTC',
      after: DateTime.fromISO('2026-10-19T12:00:00', { zone: 'UTC' }),
      lastFiredAt: '2026-10-19T11:00:00.000Z',
    });
    expect(result.nextFireAt).toBe('2026-10-19T12:00:00.000Z');
  });

  test('a late tick does not accumulate drift', () => {
    // The tick ran 25 minutes late. The next fire is still anchored to the schedule, so the delay
    // does not push every later fire outwards.
    const result = computeNextFireAt({
      kind: 'interval',
      intervalMinutes: 60,
      timezone: 'UTC',
      after: DateTime.fromISO('2026-10-19T12:25:00', { zone: 'UTC' }),
      lastFiredAt: '2026-10-19T11:00:00.000Z',
    });
    expect(result.nextFireAt).toBe('2026-10-19T12:00:00.000Z');
  });

  test('no previous fire starts one interval from now', () => {
    const result = computeNextFireAt({
      kind: 'interval',
      intervalMinutes: 15,
      timezone: 'UTC',
      after: DateTime.fromISO('2026-10-19T12:00:00', { zone: 'UTC' }),
    });
    expect(result.nextFireAt).toBe('2026-10-19T12:15:00.000Z');
  });

  test('a non-positive interval is reported, not silently treated as one minute', () => {
    const result = computeNextFireAt({ kind: 'interval', intervalMinutes: 0, timezone: 'UTC' });
    expect(result.nextFireAt).toBeNull();
    expect(result.warnings[0]).toContain('positive interval');
  });
});

describe('computeNextFireAt — relative and staleness', () => {
  test('relative fires N days before the record date', () => {
    const result = computeNextFireAt({
      kind: 'relative',
      offsetDays: 3,
      recordDate: '2026-11-10T17:00:00.000Z',
      timezone: 'UTC',
    });
    expect(result.nextFireAt).toBe('2026-11-07T17:00:00.000Z');
  });

  test('staleness fires N days after the record date', () => {
    const result = computeNextFireAt({
      kind: 'staleness',
      offsetDays: 7,
      recordDate: '2026-11-01T09:00:00.000Z',
      timezone: 'UTC',
    });
    expect(result.nextFireAt).toBe('2026-11-08T09:00:00.000Z');
  });

  test('the offset respects the zone across a DST boundary', () => {
    // 2026-11-01 is the US fall-back day. Three days before a 9am-local deadline is still 9am local,
    // which is 16:00Z before the change and 15:00Z after it.
    const before = computeNextFireAt({
      kind: 'relative',
      offsetDays: 3,
      recordDate: '2026-10-25T09:00:00',
      timezone: 'America/Denver',
    });
    expect(before.nextFireAt).toBe('2026-10-22T15:00:00.000Z');

    const after = computeNextFireAt({
      kind: 'relative',
      offsetDays: 3,
      recordDate: '2026-11-10T09:00:00',
      timezone: 'America/Denver',
    });
    expect(after.nextFireAt).toBe('2026-11-07T16:00:00.000Z');
  });

  test('a missing record date is reported', () => {
    const result = computeNextFireAt({ kind: 'relative', offsetDays: 1, timezone: 'UTC' });
    expect(result.nextFireAt).toBeNull();
    expect(result.warnings.join(' ')).toContain('record date');
  });
});

describe('zones', () => {
  test('an unknown zone falls back to UTC and says so', () => {
    const result = computeNextFireAt({
      kind: 'cron',
      expression: '0 9 * * *',
      timezone: 'Mars/Olympus_Mons',
      after: DateTime.fromISO('2026-10-19T08:00:00', { zone: 'UTC' }),
    });
    expect(result.warnings.join(' ')).toContain('Unknown timezone');
    expect(result.nextFireAt).toBe('2026-10-19T09:00:00.000Z');
  });

  test('a missing zone means UTC', () => {
    const result = computeNextFireAt({
      kind: 'cron',
      expression: '0 9 * * *',
      after: DateTime.fromISO('2026-10-19T08:00:00', { zone: 'UTC' }),
    });
    expect(result.nextFireAt).toBe('2026-10-19T09:00:00.000Z');
  });
});

describe('isScheduleDue', () => {
  const now = DateTime.fromISO('2026-10-19T12:00:00', { zone: 'UTC' });

  test('a past instant is due', () => {
    expect(isScheduleDue('2026-10-19T11:59:00.000Z', now)).toBe(true);
  });

  test('exactly now is due', () => {
    expect(isScheduleDue('2026-10-19T12:00:00.000Z', now)).toBe(true);
  });

  test('a future instant is not due', () => {
    expect(isScheduleDue('2026-10-19T12:01:00.000Z', now)).toBe(false);
  });

  test('no next fire is never due', () => {
    // A bounded recurrence has finished; it must not fire forever.
    expect(isScheduleDue(null, now)).toBe(false);
  });

  test('an unparseable instant is not due', () => {
    expect(isScheduleDue('not-a-date', now)).toBe(false);
  });
});

describe('describeSchedule', () => {
  test.each([
    [{ kind: 'cron' as const, expression: '0 9 * * *', timezone: 'America/Denver' }, 'Cron "0 9 * * *" in America/Denver'],
    [{ kind: 'interval' as const, intervalMinutes: 30 }, 'Every 30 minutes'],
    [{ kind: 'relative' as const, offsetDays: 2 }, '2 days before the record date'],
    [{ kind: 'staleness' as const, offsetDays: 14 }, '14 days after the record date'],
  ])('describes %#', (params, expected) => {
    expect(describeSchedule(params)).toBe(expected);
  });
});

/**
 * Phase 34 — the authoring-side helpers.
 *
 * `validateScheduleExpression` is what makes a bad pattern a **save error** rather than a silent
 * no-fire, and `describeCronInPlainEnglish` is what makes a correct pattern legible. Both are pure,
 * so they are asserted exactly rather than through the editor.
 */
describe('validateScheduleExpression', () => {
  test('accepts a weekday cron', () => {
    expect(validateScheduleExpression({ kind: 'cron', expression: '0 9 * * 1-5' })).toBeNull();
  });

  test('rejects a 6-field cron rather than shifting the fields', () => {
    // Reading `0 9 * * 1-5 2026` as 5 fields would drop the year and produce a schedule that looks
    // right; the point of the phase is that it does not quietly happen.
    const problem = validateScheduleExpression({ kind: 'cron', expression: '0 9 * * 1-5 2026' });
    expect(problem).toMatch(/5 fields/);
  });

  test('rejects an out-of-range field', () => {
    expect(validateScheduleExpression({ kind: 'cron', expression: '0 25 * * *' })).toMatch(/Hour/);
  });

  test('rejects a cron restricting both day-of-month and day-of-week', () => {
    expect(validateScheduleExpression({ kind: 'cron', expression: '0 9 1 * 1' })).toMatch(/either/);
  });

  test('rejects a missing expression', () => {
    expect(validateScheduleExpression({ kind: 'cron', expression: '   ' })).toMatch(/needs an expression/);
    expect(validateScheduleExpression({ kind: 'recurrence' })).toMatch(/RRULE body/);
  });

  test('accepts a valid RRULE body and rejects a malformed one', () => {
    expect(validateScheduleExpression({ kind: 'recurrence', expression: 'FREQ=WEEKLY;BYDAY=MO' })).toBeNull();
    expect(
      validateScheduleExpression({ kind: 'recurrence', expression: 'FREQ=NOT_A_FREQ' }),
    ).toMatch(/could not be parsed/);
  });

  test('an interval needs no expression', () => {
    expect(validateScheduleExpression({ kind: 'interval' })).toBeNull();
  });
});

describe('describeCronInPlainEnglish', () => {
  test.each([
    ['0 9 * * 1-5', 'Every weekday at 09:00'],
    ['30 8 * * 1', 'Every Monday at 08:30'],
    ['0 12 * * *', 'Every day at 12:00'],
    ['0 9 1 * *', 'The 1st of every month at 09:00'],
    ['*/15 * * * *', 'Every 15 minutes'],
    ['0 * * * *', 'Every hour at :00'],
    ['0,30 9 * * 1,2', 'Custom schedule “0,30 9 * * 1,2”'],
    ['0 9 * * 0,6', 'Every weekend day at 09:00'],
  ])('%s → %s', (expression, expected) => {
    expect(describeCronInPlainEnglish(expression)).toBe(expected);
  });

  test('an unsupported shape is labelled Custom rather than guessed at', () => {
    expect(describeCronInPlainEnglish('0 9 1 6 *')).toMatch(/^Custom schedule/);
  });

  test('a non-5-field expression says so', () => {
    expect(describeCronInPlainEnglish('0 9 * *')).toBe('Not a 5-field cron expression');
  });
});
