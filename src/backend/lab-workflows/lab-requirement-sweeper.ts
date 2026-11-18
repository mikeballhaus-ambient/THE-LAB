import { randomUUID } from 'node:crypto';
import { DateTime } from 'luxon';
import type { Server as SocketIOServer } from 'socket.io';
import { authRepository } from '../db/Auth/auth-repository';
import { labEventsRepository } from '../db/LabEvents/lab-events-repository';
import { labRequirementSweepRepository } from '../db/LabWorkflows/lab-requirement-sweep-repository';
import { labWorkflowsService } from '../db/LabWorkflows/lab-workflows-service';
import { publishLabDomainEventPipeline } from '../lab-events/publish-lab-domain-event-pipeline';
import { listIntegrationRecords } from './lab-workflow-integration-connector-client';
import { LAB_REQUIREMENT_CATALOG } from '@/shared/config/lab-requirement-catalog';
import type { LabRequirementV1 } from '@/shared/types/lab-requirement';
import type { LabDomainEventEnvelopeV1 } from '@/shared/types/lab-domain-event';
import type { LabWorkflowRecord } from '@/shared/types/lab-workflow';
import type { User } from '@/shared/types/user';
import { LAB_PLATFORM_SYSTEM_USER_ID } from '@/shared/config/lab-platform-system-user';
import { getWorkflowTriggerEventType } from '@/shared/utils/lab-workflow-definition';
import { eventTypeMatches } from '@/shared/utils/lab-event-type-match';
import {
  isRequirementInWindow,
  predicatesMatch,
  readRecordPath,
  readRequirementRecordDay,
  todayInComparisonZone,
} from '@/shared/utils/lab-requirement-evaluation';

/**
 * The platform requirement sweep (phase 33).
 *
 * ## What it is
 *
 * One tick, every 60 seconds, that reads each entry in
 * [`LAB_REQUIREMENT_CATALOG`](../../shared/config/lab-requirement-catalog.ts), asks the owning app
 * for its records through the ordinary connector contract, and publishes the normal domain event
 * for each record whose date has entered its window.
 *
 * ## Why one sweep and not one timer per app
 *
 * The events this delivers (`maintenance.due`, `lease.expiring`, …) are time comparisons. An app
 * cannot publish them without running a clock, and N app processes each running a timer repeats the
 * exact anti-pattern the single platform tick exists to avoid. The sweep also gets **per-record**
 * semantics for free: a schedule row fires once per schedule, so "30 days before *each* lease's end
 * date" is not expressible that way, while a loop over records is.
 *
 * ## The three decisions that must not regress
 *
 * 1. **Dedupe by (requirement, record)** — `lab_requirement_sweep_state`. The sweep sees the same
 *    records every minute; without this, a "3 days before" reminder publishes ~4 320 times a day.
 * 2. **Fire on window entry, not every tick inside the window** — "expiring within 30 days" is a
 *    range, so a record qualifies for many ticks. The state row makes it one reminder, not thirty.
 * 3. **Persist the event row before publishing** — `lab_user_notifications.event_id` is a foreign
 *    key, so a notify node on a swept event would fail per recipient if the row were missing.
 *
 * ## Isolation and backoff
 *
 * Each requirement is its own try/catch: one unreachable app server must not silence the other
 * requirements. Repeated failures widen the retry interval, because re-reading a dead server every
 * minute is noise rather than resilience.
 */

/** Base delay after the first failure; doubles per consecutive failure. */
export const LAB_REQUIREMENT_BACKOFF_BASE_MS = 5 * 60_000;
/** Ceiling on backoff, so a fixed app is picked up within an hour without a restart. */
export const LAB_REQUIREMENT_BACKOFF_MAX_MS = 60 * 60_000;

export interface RequirementSweepDeps {
  /** "Now" — a factory for the tick loop, a value for a test. */
  now?: DateTime | (() => DateTime);
  io?: SocketIOServer;
  /** Overridable so a test can supply records without an app server. */
  lister?: typeof listIntegrationRecords;
  /** Restrict to named requirements — used by tests; the tick passes nothing. */
  onlyKeys?: readonly string[];
  /** Ignore backoff windows (a test asserting isolation should not wait five minutes). */
  ignoreBackoff?: boolean;
}

export interface RequirementSweepResult {
  requirements: number;
  /** Requirements not attempted: no listener, or backoff had not elapsed. */
  skipped: number;
  /** Records that entered their window and had an event published. */
  fired: number;
  failed: number;
}

interface WorkflowCandidate {
  workflow: LabWorkflowRecord;
  triggerType: string;
  /**
   * Actor to publish as.
   *
   * For a **user-scoped** workflow the actor *is* the owner — the event is worthless otherwise,
   * because `workflowMatchesEvent` refuses a user workflow whose actor is not its owner.
   */
  actorUserId: number;
}

/**
 * The platform publishes as itself, so it needs a `User` shape for the discovery entitlement check.
 *
 * Built from the constant rather than read from the database because the sweep must not fail when
 * the system account row is missing — the actor id is what actually travels on the envelope, and a
 * `viewer`-shaped caller would fail `canReadHostBindings`.
 */
function platformActor(now: DateTime): User {
  return {
    id: LAB_PLATFORM_SYSTEM_USER_ID,
    userId: LAB_PLATFORM_SYSTEM_USER_ID,
    role: 'admin',
    status: 'active',
    lastSeen: now.toISO() ?? '',
    createdAt: now.toISO() ?? '',
  };
}

function backoffDelayMs(consecutiveFailures: number): number {
  const exponent = Math.max(0, consecutiveFailures - 1);
  return Math.min(LAB_REQUIREMENT_BACKOFF_BASE_MS * 2 ** exponent, LAB_REQUIREMENT_BACKOFF_MAX_MS);
}

/**
 * Every enabled workflow that could react to a time-derived event, resolved **once per tick**.
 *
 * Doing this per requirement would re-read the same workflow rows seven times a minute for no gain.
 * The result is filtered per requirement by `triggerType`, which is cheap and already parsed.
 *
 * User-scoped workflows are only returned for the actor they were listed for, so the platform
 * account alone would miss them entirely. Enumerating owners is bounded by the user table and is
 * skipped for viewers: a viewer cannot own a workflow that an event could match.
 */
function collectCandidates(): WorkflowCandidate[] {
  const byId = new Map<string, WorkflowCandidate>();

  const addFrom = (actorUserId: number, workflows: LabWorkflowRecord[]): void => {
    for (const workflow of workflows) {
      if (byId.has(workflow.id)) {
        continue;
      }
      const triggerType = getWorkflowTriggerEventType(workflow.definition);
      if (!triggerType) {
        continue;
      }
      if (workflow.scope === 'user' && workflow.ownerUserId !== actorUserId) {
        continue;
      }
      byId.set(workflow.id, { workflow, triggerType, actorUserId });
    }
  };

  addFrom(
    LAB_PLATFORM_SYSTEM_USER_ID,
    labWorkflowsService.listEnabledForEvaluation(LAB_PLATFORM_SYSTEM_USER_ID),
  );

  // A user-scoped workflow is only returned for its own owner, so the platform pass above cannot
  // see it. The enumeration is best-effort and silent: if the user table is not readable (an early
  // boot, or a test that did not bootstrap auth) global workflows must still be delivered, and a
  // warning per tick for a condition that is not an error would drown the log.
  let ownerIds: number[] = [];
  try {
    ownerIds = authRepository
      .getUsers()
      .filter(
        (user) =>
          user.status === 'active' &&
          user.role !== 'viewer' &&
          user.userId !== LAB_PLATFORM_SYSTEM_USER_ID,
      )
      .map((user) => user.userId);
  } catch {
    ownerIds = [];
  }
  for (const ownerUserId of ownerIds) {
    addFrom(ownerUserId, labWorkflowsService.listEnabledForEvaluation(ownerUserId));
  }

  return [...byId.values()];
}

class LabRequirementSweeper {
  private ticking = false;

  async tick(deps: RequirementSweepDeps = {}): Promise<RequirementSweepResult> {
    const result: RequirementSweepResult = { requirements: 0, skipped: 0, fired: 0, failed: 0 };
    if (this.ticking) {
      return result;
    }
    this.ticking = true;
    try {
      const supplied = deps.now;
      const now = typeof supplied === 'function' ? supplied() : (supplied ?? DateTime.utc());
      const today = todayInComparisonZone(now);
      const requirements = deps.onlyKeys?.length
        ? LAB_REQUIREMENT_CATALOG.filter((row) => deps.onlyKeys?.includes(row.key))
        : LAB_REQUIREMENT_CATALOG;
      result.requirements = requirements.length;
      const candidates = collectCandidates();

      for (const requirement of requirements) {
        try {
          const outcome = await this.sweepOne(requirement, now, today, candidates, deps);
          if (outcome === 'skipped') {
            result.skipped += 1;
          } else {
            result.fired += outcome;
          }
        } catch (err) {
          result.failed += 1;
          this.recordFailure(requirement, err, now);
        }
      }
    } finally {
      this.ticking = false;
    }
    return result;
  }

  /** @returns `'skipped'`, or the number of events published. */
  private async sweepOne(
    requirement: LabRequirementV1,
    now: DateTime,
    today: string,
    allCandidates: readonly WorkflowCandidate[],
    deps: RequirementSweepDeps,
  ): Promise<'skipped' | number> {
    const health = labRequirementSweepRepository.getHealth(requirement.key);
    if (
      deps.ignoreBackoff !== true &&
      health?.nextAttemptAt != null &&
      Date.now() < health.nextAttemptAt
    ) {
      return 'skipped';
    }

    const candidates = allCandidates.filter((candidate) =>
      eventTypeMatches(candidate.triggerType, requirement.eventType),
    );
    if (!candidates.length) {
      // No listener: do not read the provider at all. Reading an app's table so a run nobody wants
      // can be discarded is pure cost, and the sweep's risk register names this as how cost grows.
      labRequirementSweepRepository.clearHealth(requirement.key);
      return 'skipped';
    }

    const lister = deps.lister ?? listIntegrationRecords;
    const listed = await lister(
      platformActor(now),
      requirement.providerAppId,
      requirement.serviceId,
    );
    labRequirementSweepRepository.clearHealth(requirement.key);

    if (listed.truncated) {
      console.warn(
        `[lab-workflows] requirement ${requirement.key} truncated its record list; records past the cap are not swept`,
      );
    }

    let published = 0;
    for (const record of listed.records) {
      const recordId = readRecordPath(record, requirement.recordIdPath ?? 'id');
      if (recordId == null) {
        continue;
      }
      if (!predicatesMatch(requirement.predicates, record)) {
        continue;
      }
      const dateRead = readRequirementRecordDay(
        readRecordPath(record, requirement.datePath),
        requirement.datePathFormat,
      );
      if (!dateRead.ok) {
        // A record with an unreadable date is skipped, not treated as qualifying: firing on a
        // missing date would notify about every draft row in the table.
        continue;
      }
      if (!isRequirementInWindow(requirement, dateRead.day, today)) {
        continue;
      }

      const state = labRequirementSweepRepository.getState(requirement.key, String(recordId));
      // Fire on **entry**. A record already fired for this same observed date is inside the window
      // it entered — not entering it again. If the date moved (a lease extension), it re-qualifies.
      if (state?.lastObservedDate === dateRead.day) {
        continue;
      }

      await this.publishForRecord(
        requirement,
        record,
        String(recordId),
        dateRead.day,
        candidates,
        deps,
        now,
      );
      published += 1;
    }
    return published;
  }

  /**
   * Persist the event, then publish it through the normal pipeline.
   *
   * The order is load-bearing: `lab_user_notifications.event_id` is a foreign key, so a workflow
   * whose node notifies would fail that insert per recipient — the run would report success and
   * nobody would be told. Recording first also makes the fire auditable.
   */
  private async publishForRecord(
    requirement: LabRequirementV1,
    record: Record<string, unknown>,
    recordId: string,
    observedDate: string,
    candidates: readonly WorkflowCandidate[],
    deps: RequirementSweepDeps,
    now: DateTime,
  ): Promise<void> {
    const actorUserId = candidates[0]?.actorUserId ?? LAB_PLATFORM_SYSTEM_USER_ID;
    const envelope: LabDomainEventEnvelopeV1 = {
      schemaVersion: 1,
      id: randomUUID(),
      type: requirement.eventType,
      // The **provider app**: the event is real and must be visible to the triggers an author built
      // for that app, not to a scheduler id they never picked.
      sourceAppId: requirement.providerAppId,
      occurredAt: now.toUTC().toISO() ?? new Date().toISOString(),
      actorUserId,
      payload: {
        recordId,
        ...Object.fromEntries(
          (requirement.payloadPaths ?? []).map((path) => [path, readRecordPath(record, path)]),
        ),
        // Named explicitly so a downstream node can show *why* it fired without re-deriving it.
        dueDate: readRecordPath(record, requirement.datePath),
        requirementKey: requirement.key,
      },
    };

    await labEventsRepository.publishEvent(
      envelope.id,
      envelope.type,
      envelope.sourceAppId,
      envelope.occurredAt,
      envelope.actorUserId ?? null,
      JSON.stringify(envelope.payload),
    );

    labRequirementSweepRepository.markFired({
      requirementKey: requirement.key,
      recordId,
      firedAt: now.toUTC().toISO() ?? new Date().toISOString(),
      observedDate,
    });

    // One event row, offered to every enabled workflow exactly as an app-published event is. A
    // user-scoped workflow belonging to someone else declines it in the evaluator, which is correct:
    // the row is a fact about the lab, not about one user.
    //
    // `persistEvent: false` because the row was just written above — the pipeline would otherwise
    // insert it a second time and violate the primary key.
    await publishLabDomainEventPipeline(envelope, actorUserId, deps.io, {
      persistEvent: false,
    });
  }

  private recordFailure(requirement: LabRequirementV1, err: unknown, now: DateTime): void {
    const message = err instanceof Error ? err.message : String(err);
    const previous = labRequirementSweepRepository.getHealth(requirement.key);
    const consecutive = (previous?.consecutiveFailures ?? 0) + 1;
    labRequirementSweepRepository.recordFailure(
      requirement.key,
      message,
      Date.now() + backoffDelayMs(consecutive),
      now.toUTC().toISO() ?? new Date().toISOString(),
    );
    console.error(
      `[lab-workflows] requirement sweep failed (${requirement.key}, attempt ${consecutive}):`,
      message,
    );
  }
}

export const labRequirementSweeper = new LabRequirementSweeper();
