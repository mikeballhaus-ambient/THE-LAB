/**
 * Scheduled triggers (W8).
 *
 * A schedule is stored apart from the workflow definition because it is **state**, not structure:
 * `next_fire_at` changes on every tick, and rewriting the graph JSON on every fire would churn the
 * one column the editor treats as the authoritative document.
 *
 * The row is keyed to the **trigger node**, not just the workflow, for the same reason mock samples
 * are: a graph may later hold more than one trigger, and "which trigger fired" has to survive.
 */

/**
 * How a schedule decides its next occurrence.
 *
 * `cron` and `recurrence` both describe a *repeating wall-clock pattern*; `interval` describes
 * elapsed time between fires; `relative` and `staleness` derive their instant from the record they
 * are about. Keeping them in one union means one tick loop and one place where `next_fire_at` is
 * computed, which is the only way the DST rules stay consistent across variants.
 */
export type LabWorkflowScheduleKind =
  | 'cron'
  | 'recurrence'
  | 'interval'
  | 'relative'
  | 'staleness';

export interface LabWorkflowSchedule {
  id: string;
  workflowId: string;
  /** The trigger node this schedule drives. */
  triggerNodeId: string;
  kind: LabWorkflowScheduleKind;
  /** Cron expression (5-field) or an RRULE body. Empty for the non-expression kinds. */
  expression: string | null;
  /** IANA zone the wall-clock is read in. Never an offset: a fixed offset breaks at DST. */
  timezone: string;
  /** `interval`: minutes between fires. */
  intervalMinutes: number | null;
  /** `relative` / `staleness`: whole days added to or subtracted from the record's own date. */
  offsetDays: number | null;
  /** The path on the record holding the date the offset applies to. */
  recordDatePath: string | null;
  /** ISO instant of the next due fire, or null when the schedule has run out (e.g. bounded RRULE). */
  nextFireAt: string | null;
  lastFiredAt: string | null;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * The floor between two fires of the same workflow.
 *
 * A schedule is user-authored data, so `* * * * *` on a graph that writes 200 notifications is
 * cheap to type and expensive to run. The floor is enforced at the **tick**, not at save time,
 * because a cron expression that is legitimate on one graph (a reminder) is abusive on another
 * (a fan-out); the runtime is the only place that knows what the graph does.
 */
export const LAB_WORKFLOW_SCHEDULE_MIN_INTERVAL_MS = 60_000;

/** Upper bound on schedules handled per tick, so one bad minute cannot stall the timer. */
export const LAB_WORKFLOW_SCHEDULE_MAX_PER_TICK = 25;

/** Source app id stamped on a synthesised envelope, so a run is attributable to the clock. */
export const LAB_WORKFLOW_SCHEDULER_SOURCE_APP_ID = 'platform-scheduler';
