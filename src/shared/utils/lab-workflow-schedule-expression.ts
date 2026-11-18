/**
 * Pure schedule **text** helpers — no `rrule`, no `luxon`.
 *
 * This module exists so the designer can describe and check a cron pattern **without** pulling
 * `rrule` into the browser bundle. `rrule` ships CommonJS only (`dist/esm/index.js` has no default
 * export), and Vite's browser build fails on it — so anything a `.vue` file imports must live here.
 *
 * The arithmetic stays in [`lab-workflow-schedule-time.ts`](./lab-workflow-schedule-time.ts), which
 * re-exports the helpers below for the server. Splitting on the **dependency**, not on the feature,
 * is what keeps one description of a cron expression rather than two that can drift.
 */

export type LabWorkflowScheduleTimeKind =
  | 'cron'
  | 'recurrence'
  | 'interval'
  | 'relative'
  | 'staleness';

export const DEFAULT_SCHEDULE_ZONE = 'UTC';

/** Cron weekday numbers are 0=Sunday; RRULE day tokens are names, so this is cron's order. */
const CRON_WEEKDAY_TOKENS = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'] as const;

const CRON_WEEKDAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

interface CronFieldSpec {
  label: string;
  value: string;
  min: number;
  max: number;
  allowStep: boolean;
}

function validateCronField(spec: CronFieldSpec): string | null {
  const { label, value, min, max, allowStep } = spec;
  if (value === '*') {
    return null;
  }
  const stepMatch = /^\*\/(\d+)$/.exec(value);
  if (stepMatch) {
    if (!allowStep) {
      return `A step (\`*/n\`) is only meaningful in the minute and hour fields, not ${label.toLowerCase()}.`;
    }
    const step = Number(stepMatch[1]);
    if (!Number.isInteger(step) || step < 1 || step > max) {
      return `${label} step must be between 1 and ${max}.`;
    }
    return null;
  }
  for (const token of value.split(',')) {
    const rangeMatch = /^(\d+)-(\d+)$/.exec(token);
    if (rangeMatch) {
      const from = Number(rangeMatch[1]);
      const to = Number(rangeMatch[2]);
      if (from < min || to > max || from > to) {
        return `${label} range ${from}-${to} is outside ${min}-${max}.`;
      }
      continue;
    }
    const parsed = Number(token);
    if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
      return `${label} value "${token}" is outside ${min}-${max}.`;
    }
  }
  return null;
}

/** Expand `1-3` / `1,2,3` into the individual values a `BY*` part needs. */
export function expandCronValues(value: string): number[] {
  const out: number[] = [];
  for (const token of value.split(',')) {
    const rangeMatch = /^(\d+)-(\d+)$/.exec(token);
    if (rangeMatch) {
      for (let n = Number(rangeMatch[1]); n <= Number(rangeMatch[2]); n += 1) {
        out.push(n);
      }
      continue;
    }
    out.push(Number(token));
  }
  return out;
}

/**
 * Translate a 5-field cron expression into an RRULE body.
 *
 * Cron is the format users already know and RRULE is the library that gets the arithmetic right, so
 * cron support is a **translation**, not a second scheduler. Hand-rolling cron next-time maths would
 * mean reimplementing DST, which the programme rules out.
 *
 * Two cron constructs are rejected rather than guessed at:
 *
 * - a 6-field expression (seconds) — reading it as 5 shifts every field by one, producing a
 *   plausible-looking schedule that is simply wrong;
 * - day-of-month **and** day-of-week both restricted — cron ORs the two, RRULE ANDs them, so any
 *   translation would change the meaning. Rejecting keeps the stored schedule honest.
 */
export function cronToRRuleBody(expression: string): { body: string | null; error?: string } {
  const fields = expression.trim().split(/\s+/).filter(Boolean);
  if (fields.length !== 5) {
    return {
      body: null,
      error: `Cron needs 5 fields (minute hour day-of-month month day-of-week); got ${fields.length}.`,
    };
  }
  const [minute, hour, dom, month, dow] = fields as [string, string, string, string, string];

  const problems = [
    validateCronField({ label: 'Minute', value: minute, min: 0, max: 59, allowStep: true }),
    validateCronField({ label: 'Hour', value: hour, min: 0, max: 23, allowStep: true }),
    validateCronField({ label: 'Day of month', value: dom, min: 1, max: 31, allowStep: false }),
    validateCronField({ label: 'Month', value: month, min: 1, max: 12, allowStep: false }),
    validateCronField({ label: 'Day of week', value: dow, min: 0, max: 6, allowStep: false }),
  ].filter((problem): problem is string => problem != null);
  if (problems.length > 0) {
    return { body: null, error: problems[0] };
  }

  if (dom !== '*' && dow !== '*') {
    return {
      body: null,
      error: 'Cron cannot restrict both day-of-month and day-of-week: cron treats them as "either", a recurrence as "both".',
    };
  }

  const parts: string[] = [];
  const minuteStep = /^\*\/(\d+)$/.exec(minute);

  if (minuteStep) {
    // `*/n` minutes is the only pattern whose frequency is minutes, so it sets FREQ outright.
    parts.push('FREQ=MINUTELY', `INTERVAL=${minuteStep[1]}`);
  } else if (dow !== '*') {
    parts.push('FREQ=WEEKLY');
    if (minute !== '*') {
      parts.push(`BYMINUTE=${expandCronValues(minute).join(',')}`);
    }
    if (hour !== '*') {
      parts.push(`BYHOUR=${expandCronValues(hour).join(',')}`);
    }
    parts.push(
      `BYDAY=${expandCronValues(dow).map((day) => CRON_WEEKDAY_TOKENS[day] ?? 'SU').join(',')}`,
    );
  } else if (dom !== '*') {
    parts.push('FREQ=MONTHLY', `BYMONTHDAY=${expandCronValues(dom).join(',')}`);
    if (minute !== '*') {
      parts.push(`BYMINUTE=${expandCronValues(minute).join(',')}`);
    }
    if (hour !== '*') {
      parts.push(`BYHOUR=${expandCronValues(hour).join(',')}`);
    }
    if (month !== '*') {
      parts.push(`BYMONTH=${expandCronValues(month).join(',')}`);
    }
  } else if (month !== '*') {
    parts.push('FREQ=YEARLY', `BYMONTH=${expandCronValues(month).join(',')}`);
    if (minute !== '*') {
      parts.push(`BYMINUTE=${expandCronValues(minute).join(',')}`);
    }
    if (hour !== '*') {
      parts.push(`BYHOUR=${expandCronValues(hour).join(',')}`);
    }
  } else if (hour !== '*') {
    parts.push('FREQ=DAILY');
    if (minute !== '*') {
      parts.push(`BYMINUTE=${expandCronValues(minute).join(',')}`);
    }
    parts.push(`BYHOUR=${expandCronValues(hour).join(',')}`);
  } else if (minute !== '*') {
    parts.push('FREQ=HOURLY', `BYMINUTE=${expandCronValues(minute).join(',')}`);
  } else {
    parts.push('FREQ=MINUTELY', 'INTERVAL=1');
  }

  return { body: parts.join(';') };
}

/** Is this cron expression well formed? `null` when it is. */
export function validateCronExpression(expression: string): string | null {
  const trimmed = expression.trim();
  if (!trimmed) {
    return 'A cron schedule needs an expression, for example "0 9 * * 1-5".';
  }
  return cronToRRuleBody(trimmed).error ?? null;
}

function pad2(value: string): string {
  const n = Number(value);
  return Number.isInteger(n) && n >= 0 && n <= 9 ? `0${n}` : value;
}

/**
 * Plain-English render of a cron expression, for the editor.
 *
 * `describeSchedule` is deliberately terse — it is a machine-ish summary for logs and MCP output.
 * This one is the text an **author** reads under the input box, because `0 9 * * 1-5` is not
 * self-explanatory and a wrong-but-plausible schedule fires at 09:00 on the wrong days for months
 * without anyone noticing.
 *
 * Only the shapes that can be expressed unambiguously are described; anything else falls back to the
 * cron text prefixed with "Custom", which is honest about what the editor could not summarise.
 */
export function describeCronInPlainEnglish(expression: string): string {
  const fields = expression.trim().split(/\s+/).filter(Boolean);
  if (fields.length !== 5) {
    return 'Not a 5-field cron expression';
  }
  const [minute, hour, dom, month, dow] = fields as [string, string, string, string, string];

  const minuteStep = /^\*\/(\d+)$/.exec(minute);
  if (minuteStep && hour === '*' && dom === '*' && month === '*' && dow === '*') {
    return `Every ${minuteStep[1]} minutes`;
  }
  if (minute === '*' && hour === '*' && dom === '*' && month === '*' && dow === '*') {
    return 'Every minute';
  }
  if (minute !== '*' && hour === '*' && dom === '*' && month === '*' && dow === '*') {
    return `Every hour at :${pad2(minute)}`;
  }

  // A list in the minute or hour field is several times a day, not one time — describing it as
  // "at 09:00,30" would be wrong, so it falls through to Custom.
  if (hour === '*' || minute === '*' || month !== '*' || hour.includes(',') || minute.includes(',')) {
    return `Custom schedule “${expression.trim()}”`;
  }

  const time = `${pad2(hour)}:${pad2(minute)}`;

  if (dom === '*' && dow !== '*') {
    const days = expandCronValues(dow).map((day) => CRON_WEEKDAY_NAMES[day] ?? String(day));
    if (dow === '1-5') {
      return `Every weekday at ${time}`;
    }
    if (dow === '0,6' || dow === '6,0') {
      return `Every weekend day at ${time}`;
    }
    if (days.length === 1) {
      return `Every ${days[0]} at ${time}`;
    }
    return `Every ${days.slice(0, -1).join(', ')} and ${days[days.length - 1]} at ${time}`;
  }
  if (dom === '1' && dow === '*') {
    return `The 1st of every month at ${time}`;
  }
  if (dom !== '*' && dow === '*') {
    const days = expandCronValues(dom);
    if (days.length === 1) {
      return `Day ${days[0]} of every month at ${time}`;
    }
    return `Days ${days.join(', ')} of every month at ${time}`;
  }
  if (dom === '*' && dow === '*') {
    return `Every day at ${time}`;
  }
  return `Custom schedule “${expression.trim()}”`;
}

/** One-line description for the editor, so a schedule is auditable at a glance. */
export function describeSchedule(params: {
  kind: LabWorkflowScheduleTimeKind;
  expression?: string | null;
  timezone?: string | null;
  intervalMinutes?: number | null;
  offsetDays?: number | null;
}): string {
  const zone = params.timezone ?? DEFAULT_SCHEDULE_ZONE;
  switch (params.kind) {
    case 'cron':
      return `Cron "${params.expression ?? '—'}" in ${zone}`;
    case 'recurrence':
      return `Repeats "${params.expression ?? '—'}" in ${zone}`;
    case 'interval':
      return `Every ${params.intervalMinutes ?? '—'} minutes`;
    case 'relative':
      return `${params.offsetDays ?? 0} days before the record date`;
    case 'staleness':
      return `${params.offsetDays ?? 0} days after the record date`;
    default:
      return 'Schedule';
  }
}
