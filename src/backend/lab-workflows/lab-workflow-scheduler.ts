import { randomUUID } from 'node:crypto';
import { DateTime } from 'luxon';
import type { Server as SocketIOServer } from 'socket.io';
import { labWorkflowSchedulesRepository } from '../db/LabWorkflows/lab-workflow-schedules-repository';
import { labWorkflowsRepository } from '../db/LabWorkflows/lab-workflows-repository';
import { labEventsRepository } from '../db/LabEvents/lab-events-repository';
import { evaluateWorkflowGraphForDomainEvent } from './lab-workflow-graph-evaluator';
import { beginWorkflowRun } from './lab-workflow-run-recorder';
import type { LabDomainEventEnvelopeV1 } from '@/shared/types/lab-domain-event';
import { isLabWorkflowDefinitionV2 } from '@/shared/utils/lab-workflow-definition';
import {
  LAB_WORKFLOW_SCHEDULE_MAX_PER_TICK,
  LAB_WORKFLOW_SCHEDULE_MIN_INTERVAL_MS,
  LAB_WORKFLOW_SCHEDULER_SOURCE_APP_ID,
  type LabWorkflowSchedule,
} from '@/shared/types/lab-workflow-schedule';
import {
  computeNextFireAt,
  isScheduleDue,
} from '@/shared/utils/lab-workflow-schedule-time';
import { LAB_PLATFORM_SYSTEM_USER_ID } from '@/shared/config/lab-platform-system-user';
import { resumeDueRuns } from './lab-workflow-resume-service';

/**
 * The platform clock (W8).
 *
 * ## One timer, not one per workflow
 *
 * A timer per schedule would mean N timers competing for the event loop, each with its own drift, and
 * no single place to answer "what is the platform doing right now". One interval that asks the
 * database "what is due?" gets the same result with bounded work, survives a restart (the due-ness
 * lives in `next_fire_at`, not in memory), and cannot double-fire after a redeploy.
 *
 * ## What a fire actually is
 *
 * A fire **synthesises an envelope** and feeds it to the same graph evaluator an event uses. There is
 * no second execution path: a scheduled workflow runs through exactly the code an event-driven one
 * does, records the same run rows, and honours the same retry and idempotency policy. That is why
 * `trigger_type` exists on the run row — the only thing that differs is where the envelope came from.
 *
 * ## Why a failed schedule cannot stop the clock
 *
 * `tick()` catches per schedule. A malformed cron, a graph that throws, or a workflow deleted
 * mid-flight skips that schedule and continues: the alternative is one bad row silently stopping
 * every other scheduled workflow in the lab, with no symptom except "nothing fires any more".
 */

/**
 * How often the platform asks "what is due?".
 *
 * A minute is the right resolution because the floor between two fires of the same workflow is also a
 * minute: a faster tick would only find the same rows again and be rejected by the floor.
 */
export const LAB_WORKFLOW_SCHEDULER_TICK_MS = 60_000;

export interface SchedulerDeps {
  /**
   * The instant to treat as "now".
   *
   * Accepts a value or a factory: the tick loop wants the factory (so a long tick does not reuse a
   * stale instant for every schedule), while a caller that already computed the instant — a test, or
   * a replay — has the value and should not have to wrap it.
   */
  now?: DateTime | (() => DateTime);
  io?: SocketIOServer;
  /** Overridable so a test can assert the floor without waiting a minute. */
  minIntervalMs?: number;
}

export interface TickResult {
  due: number;
  fired: number;
  skipped: number;
  failed: number;
  /** Runs resumed from a suspended `wait` this tick (phase 36). */
  resumed?: number;
  /** Suspensions another tick had already claimed. */
  resumeSkipped?: number;
  /** Suspensions whose resumed segment threw. */
  resumeFailed?: number;
}

class LabWorkflowScheduler {
  private timer: NodeJS.Timeout | null = null;
  private ticking = false;

  /**
   * Start the platform tick.
   *
   * `ticking` guards against overlap: a slow tick must not be re-entered by the next interval, which
   * would run the same schedule twice concurrently and double-fire it.
   */
  start(intervalMs: number, deps: SchedulerDeps = {}): void {
    if (this.timer) {
      return;
    }
    this.timer = setInterval(() => {
      void this.tick(deps);
    }, intervalMs);
    // Do not hold the process open for a timer that only reads the database.
    this.timer.unref?.();
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async tick(deps: SchedulerDeps = {}): Promise<TickResult> {
    if (this.ticking) {
      return { due: 0, fired: 0, skipped: 0, failed: 0 };
    }
    this.ticking = true;
    const result: TickResult = { due: 0, fired: 0, skipped: 0, failed: 0 };
    try {
      const supplied = deps.now;
      const now = typeof supplied === 'function'
        ? supplied()
        : (supplied ?? DateTime.utc());
      const nowIso = now.toUTC().toISO() ?? '';
      const due = labWorkflowSchedulesRepository.listDue(
        nowIso,
        LAB_WORKFLOW_SCHEDULE_MAX_PER_TICK,
      );
      result.due = due.length;

      for (const schedule of due) {
        try {
          const outcome = await this.fireOne(schedule, now, deps);
          if (outcome === 'fired') {
            result.fired += 1;
          } else {
            result.skipped += 1;
          }
        } catch (err) {
          result.failed += 1;
          console.error('[lab-workflows] schedule fire failed', schedule.id, err);
        }
      }

      // Resumes run **after** schedules: a scheduled trigger is time-critical (its floor is a
      // minute), while a resume tolerates one tick of latency. Resuming inside the schedule loop
      // would also let a slow resumed graph delay every subsequent schedule in this tick.
      const resumed = await resumeDueRuns(nowIso, deps.io);
      result.resumed = resumed.resumed;
      result.resumeSkipped = resumed.skipped;
      result.resumeFailed = resumed.failed;
    } finally {
      this.ticking = false;
    }
    return result;
  }

  /**
   * Fire one schedule.
   *
   * Returns `skipped` when the schedule is not actually due (a race with another tick), when its
   * workflow is disabled or gone, or when the floor has not elapsed. `skipped` still **advances**
   * `next_fire_at`, which is the important part: a disabled workflow whose schedule kept its old
   * `next_fire_at` would fire the entire backlog the moment it was re-enabled.
   */
  private async fireOne(
    schedule: LabWorkflowSchedule,
    now: DateTime,
    deps: SchedulerDeps,
  ): Promise<'fired' | 'skipped'> {
    if (!isScheduleDue(schedule.nextFireAt, now)) {
      return 'skipped';
    }

    const workflow = labWorkflowsRepository.getById(schedule.workflowId);
    const enabled = workflow?.enabled === true;
    const minIntervalMs = deps.minIntervalMs ?? LAB_WORKFLOW_SCHEDULE_MIN_INTERVAL_MS;

    // The floor is checked against the *previous* fire rather than the interval expression, because
    // two different schedules can point at the same workflow and only one of them needs to be abusive
    // for the platform to suffer.
    const tooSoon = schedule.lastFiredAt != null
      && now.toUTC().toMillis() - DateTime.fromISO(schedule.lastFiredAt, { zone: 'utc' }).toMillis()
        < minIntervalMs;

    const advance = (): void => {
      const next = computeNextFireAt({
        kind: schedule.kind,
        expression: schedule.expression,
        timezone: schedule.timezone,
        intervalMinutes: schedule.intervalMinutes,
        offsetDays: schedule.offsetDays,
        lastFiredAt: now.toUTC().toISO(),
        after: now,
      });
      if (next.warnings.length > 0) {
        console.warn('[lab-workflows] schedule computed with warnings', schedule.id, next.warnings);
      }
      labWorkflowSchedulesRepository.markFired(
        schedule.id,
        now.toUTC().toISO() ?? '',
        next.nextFireAt,
      );
    };

    if (!workflow || !enabled || tooSoon) {
      advance();
      return 'skipped';
    }

    if (!isLabWorkflowDefinitionV2(workflow.definition)) {
      // V1 definitions have no graph to evaluate and no trigger node to name. Advancing rather than
      // retrying prevents a permanently-stuck schedule.
      advance();
      return 'skipped';
    }

    const triggerNode = workflow.definition.nodes.find((node) => node.id === schedule.triggerNodeId);
    if (!triggerNode || triggerNode.kind !== 'trigger') {
      // The trigger the schedule points at was deleted or renamed by an edit. Advancing keeps the
      // clock moving; the editor is where the user should see and fix this.
      advance();
      return 'skipped';
    }

    const envelope: LabDomainEventEnvelopeV1 = {
      schemaVersion: 1,
      id: randomUUID(),
      type: triggerNode.eventType,
      sourceAppId: LAB_WORKFLOW_SCHEDULER_SOURCE_APP_ID,
      occurredAt: now.toUTC().toISO() ?? new Date().toISOString(),
      actorUserId: workflow.ownerUserId ?? LAB_PLATFORM_SYSTEM_USER_ID,
      payload: {
        scheduleId: schedule.id,
        scheduleKind: schedule.kind,
        firedAt: now.toUTC().toISO(),
        timezone: schedule.timezone,
      },
    };

    // Advance **before** executing, in the same statement as the last-fired stamp. Advancing after
    // execution would re-fire the window if the graph threw, and a graph that throws deterministically
    // would then re-fire it on every tick forever.
    advance();

    // Persist the synthesised envelope before running.
    //
    // `lab_user_notifications.event_id` is a foreign key into `lab_domain_events`, so a scheduled
    // workflow whose node notifies would hit a constraint failure — caught per recipient, which means
    // the run reports success and **nobody is notified**. Recording the row first also makes the fire
    // auditable: "the clock produced this event" is a fact about the lab, not an ephemeral detail.
    //
    // `publishEvent` only inserts; it does not feed the evaluator, so this cannot loop back into
    // event-driven workflows (which would turn one schedule into a fan-out of unrelated runs).
    await labEventsRepository.publishEvent(
      envelope.id,
      envelope.type,
      envelope.sourceAppId,
      envelope.occurredAt,
      envelope.actorUserId ?? null,
      JSON.stringify(envelope.payload),
    );

    const run = beginWorkflowRun({
      workflowId: workflow.id,
      triggerType: 'schedule',
      envelope,
    });
    try {
      await evaluateWorkflowGraphForDomainEvent(
        workflow.definition,
        envelope,
        workflow.name,
        workflow.scope,
        workflow.ownerUserId,
        { run, io: deps.io },
      );
      run.finish();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'scheduled workflow threw';
      console.error('[lab-workflows] scheduled execution failed', workflow.id, err);
      run.finish('failed', message);
      throw err;
    }
    return 'fired';
  }
}

export const labWorkflowScheduler = new LabWorkflowScheduler();
