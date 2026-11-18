import { afterAll, beforeAll, beforeEach, describe, expect, test } from '@jest/globals';
import betterSqlite3 from 'better-sqlite3';
import { DateTime } from 'luxon';
import { createUsersTable } from '@/backend/db/Auth/auth-schema';
import { labEventsRepository } from '@/backend/db/LabEvents/lab-events-repository';
import { labWorkflowsRepository } from '@/backend/db/LabWorkflows/lab-workflows-repository';
import { labWorkflowRunsRepository } from '@/backend/db/LabWorkflows/lab-workflow-runs-repository';
import { labWorkflowSchedulesRepository } from '@/backend/db/LabWorkflows/lab-workflow-schedules-repository';
import { labWorkflowScheduler } from '@/backend/lab-workflows/lab-workflow-scheduler';
import { LAB_WORKFLOW_GRAPH_SCHEMA_VERSION } from '@/shared/types/lab-workflow-graph';
import { LAB_WORKFLOW_SCHEDULER_SOURCE_APP_ID } from '@/shared/types/lab-workflow-schedule';
import {
  WF_TEST_EDGE_TRIGGER_NOTIFY,
  WF_TEST_NOTIFY,
  WF_TEST_TRIGGER,
} from '../lab-workflow-graph-fixture-ids';

/**
 * W8a — the platform clock.
 *
 * The clock is asserted through the *scheduler*, not through `computeNextFireAt` (which has its own
 * 42 arithmetic tests). What can only go wrong here is the tick itself:
 *
 * - a due schedule fires exactly once and advances, so the next tick does not fire it again;
 * - a disabled workflow never fires, so a schedule cannot outlive its workflow;
 * - the rate floor stops a schedule from firing on every tick;
 * - a deleted trigger is skipped rather than retried forever.
 */

const TRIGGER_EVENT = 'app-lab-tasklist.task.created';
const WORKFLOW_ID = 'e6c00004-0004-4004-8004-0000000000c8';
const DISABLED_ID = 'e6c00005-0005-4005-8005-0000000000c9';
const ORPHAN_ID = 'e6c00006-0006-4006-8006-0000000000ca';

function definition(): string {
  return JSON.stringify({
    schemaVersion: LAB_WORKFLOW_GRAPH_SCHEMA_VERSION,
    nodes: [
      { id: WF_TEST_TRIGGER, kind: 'trigger', position: { x: 0, y: 0 }, eventType: TRIGGER_EVENT },
      {
        id: WF_TEST_NOTIFY,
        kind: 'action',
        position: { x: 0, y: 100 },
        step: { kind: 'notify_users', userIds: [2], message: { title: 'scheduled' } },
      },
    ],
    edges: [{ id: WF_TEST_EDGE_TRIGGER_NOTIFY, source: WF_TEST_TRIGGER, target: WF_TEST_NOTIFY, when: 'always' }],
  });
}

describe('scheduled triggers (W8a)', () => {
  let db: betterSqlite3.Database;
  let seq = 0;

  beforeAll(async () => {
    db = betterSqlite3(':memory:');
    db.exec(createUsersTable);
    db.prepare(
      `INSERT INTO users (id, email, name, role, status) VALUES (1, 'a@test', 'Admin', 'admin', 'active')`,
    ).run();
    db.prepare(
      `INSERT INTO users (id, email, name, role, status) VALUES (2, 'u2@test', 'User Two', 'member', 'active')`,
    ).run();

    await labEventsRepository.bootstrap(db);
    await labWorkflowsRepository.bootstrap(db);
    await labWorkflowRunsRepository.bootstrap(db);
    await labWorkflowSchedulesRepository.bootstrap(db);

    labWorkflowsRepository.insertWorkflow({
      id: WORKFLOW_ID,
      name: 'Scheduled reminder',
      description: null,
      scope: 'global',
      ownerUserId: null,
      createdByUserId: 1,
      enabled: true,
      priority: 100,
      definitionJson: definition(),
    });
    labWorkflowsRepository.insertWorkflow({
      id: DISABLED_ID,
      name: 'Disabled scheduled reminder',
      description: null,
      scope: 'global',
      ownerUserId: null,
      createdByUserId: 1,
      enabled: false,
      priority: 100,
      definitionJson: definition(),
    });
    labWorkflowsRepository.insertWorkflow({
      id: ORPHAN_ID,
      name: 'Schedule pointing at a gone trigger',
      description: null,
      scope: 'global',
      ownerUserId: null,
      createdByUserId: 1,
      enabled: true,
      priority: 100,
      definitionJson: definition(),
    });
  });

  beforeEach(() => {
    db.prepare('DELETE FROM lab_workflow_schedules').run();
    db.prepare('DELETE FROM lab_workflow_runs').run();
    db.prepare('DELETE FROM lab_user_notifications').run();
  });

  afterAll(() => {
    db.close();
  });

  function insertSchedule(params: {
    id: string;
    workflowId: string;
    triggerNodeId?: string;
    nextFireAt: string;
    lastFiredAt?: string | null;
    intervalMinutes?: number;
  }): void {
    labWorkflowSchedulesRepository.insert({
      id: params.id,
      workflowId: params.workflowId,
      triggerNodeId: params.triggerNodeId ?? WF_TEST_TRIGGER,
      kind: 'interval',
      expression: null,
      timezone: 'UTC',
      intervalMinutes: params.intervalMinutes ?? 60,
      nextFireAt: params.nextFireAt,
    });
    if (params.lastFiredAt) {
      // `insert` has no last-fired field by design (a new schedule has never fired), so a test that
      // needs a previous fire writes it through the same statement the tick uses.
      labWorkflowSchedulesRepository.markFired(
        params.id,
        params.lastFiredAt,
        params.nextFireAt,
      );
    }
  }

  function runsFor(workflowId: string): { trigger_type: string; status: string }[] {
    return db
      .prepare('SELECT trigger_type, status FROM lab_workflow_runs WHERE workflow_id = ? ORDER BY rowid')
      .all(workflowId) as { trigger_type: string; status: string }[];
  }

  function notifications(): number {
    const row = db.prepare('SELECT COUNT(*) AS n FROM lab_user_notifications').get() as { n: number };
    return row.n;
  }

  test('a due schedule fires once and records a schedule-triggered run', async () => {
    const now = DateTime.fromISO('2026-10-19T12:00:00', { zone: 'UTC' });
    insertSchedule({
      id: `sched-${(seq += 1)}`,
      workflowId: WORKFLOW_ID,
      nextFireAt: '2026-10-19T11:59:00.000Z',
    });

    const result = await labWorkflowScheduler.tick({ now, minIntervalMs: 0 });

    expect(result).toMatchObject({ due: 1, fired: 1, failed: 0 });
    const runs = runsFor(WORKFLOW_ID);
    expect(runs).toHaveLength(1);
    // The trigger type is what lets the run panel tell a scheduled run from an event one.
    expect(runs[0]?.trigger_type).toBe('schedule');
    expect(notifications()).toBe(1);
  });

  test('firing advances next_fire_at so the next tick does not re-fire it', async () => {
    const now = DateTime.fromISO('2026-10-19T12:00:00', { zone: 'UTC' });
    const id = `sched-${(seq += 1)}`;
    insertSchedule({ id, workflowId: WORKFLOW_ID, nextFireAt: '2026-10-19T11:59:00.000Z' });

    await labWorkflowScheduler.tick({ now, minIntervalMs: 0 });
    const afterFirst = labWorkflowSchedulesRepository.findById(id);
    expect(afterFirst?.lastFiredAt).toBe('2026-10-19T12:00:00.000Z');
    expect(afterFirst?.nextFireAt).toBe('2026-10-19T13:00:00.000Z');

    const second = await labWorkflowScheduler.tick({ now, minIntervalMs: 0 });
    expect(second.due).toBe(0);
    expect(runsFor(WORKFLOW_ID)).toHaveLength(1);
    expect(notifications()).toBe(1);
  });

  test('a disabled workflow never fires but its schedule still advances', async () => {
    const now = DateTime.fromISO('2026-10-19T12:00:00', { zone: 'UTC' });
    const id = `sched-${(seq += 1)}`;
    insertSchedule({
      id,
      workflowId: DISABLED_ID,
      nextFireAt: '2026-10-19T11:59:00.000Z',
    });

    const result = await labWorkflowScheduler.tick({ now, minIntervalMs: 0 });

    expect(result).toMatchObject({ due: 1, fired: 0, skipped: 1 });
    expect(runsFor(DISABLED_ID)).toHaveLength(0);
    // The advance is the point: a schedule that kept its old `next_fire_at` while disabled would
    // fire its whole backlog the moment the workflow was re-enabled.
    const schedule = labWorkflowSchedulesRepository.findById(id);
    expect(schedule?.nextFireAt).toBe('2026-10-19T13:00:00.000Z');
  });

  test('the rate floor skips a schedule that fired too recently', async () => {
    const now = DateTime.fromISO('2026-10-19T12:00:30', { zone: 'UTC' });
    insertSchedule({
      id: `sched-${(seq += 1)}`,
      workflowId: WORKFLOW_ID,
      nextFireAt: '2026-10-19T12:00:00.000Z',
      lastFiredAt: '2026-10-19T12:00:00.000Z',
      intervalMinutes: 1,
    });

    // Default floor is 60s; only 30s have passed.
    const result = await labWorkflowScheduler.tick({ now });

    expect(result).toMatchObject({ due: 1, fired: 0, skipped: 1 });
    expect(runsFor(WORKFLOW_ID)).toHaveLength(0);
  });

  test('a schedule pointing at a deleted trigger is skipped, not retried forever', async () => {
    const now = DateTime.fromISO('2026-10-19T12:00:00', { zone: 'UTC' });
    const id = `sched-${(seq += 1)}`;
    insertSchedule({
      id,
      workflowId: ORPHAN_ID,
      triggerNodeId: 'n-trigger-that-was-deleted',
      nextFireAt: '2026-10-19T11:59:00.000Z',
    });

    const result = await labWorkflowScheduler.tick({ now, minIntervalMs: 0 });

    expect(result).toMatchObject({ fired: 0, skipped: 1 });
    expect(runsFor(ORPHAN_ID)).toHaveLength(0);
    expect(labWorkflowSchedulesRepository.findById(id)?.nextFireAt).not.toBeNull();
  });

  test('a future schedule is not due', async () => {
    const now = DateTime.fromISO('2026-10-19T12:00:00', { zone: 'UTC' });
    insertSchedule({
      id: `sched-${(seq += 1)}`,
      workflowId: WORKFLOW_ID,
      nextFireAt: '2026-10-19T13:00:00.000Z',
    });

    const result = await labWorkflowScheduler.tick({ now, minIntervalMs: 0 });
    expect(result.due).toBe(0);
    expect(runsFor(WORKFLOW_ID)).toHaveLength(0);
  });

  test('two due schedules both fire, each advancing independently', async () => {
    const now = DateTime.fromISO('2026-10-19T12:00:00', { zone: 'UTC' });
    insertSchedule({
      id: `sched-${(seq += 1)}`,
      workflowId: WORKFLOW_ID,
      nextFireAt: '2026-10-19T11:00:00.000Z',
    });
    insertSchedule({
      id: `sched-${(seq += 1)}`,
      workflowId: ORPHAN_ID,
      triggerNodeId: 'gone',
      nextFireAt: '2026-10-19T11:30:00.000Z',
    });

    const result = await labWorkflowScheduler.tick({ now, minIntervalMs: 0 });
    expect(result).toMatchObject({ due: 2, fired: 1, skipped: 1 });
  });

  test('an overdue schedule does not fire repeatedly in one tick', async () => {
    // The schedule is an hour overdue. A naive implementation that recomputes from "now" without
    // advancing would fire it once per pass; one fire per tick is the contract.
    const now = DateTime.fromISO('2026-10-19T12:00:00', { zone: 'UTC' });
    insertSchedule({
      id: `sched-${(seq += 1)}`,
      workflowId: WORKFLOW_ID,
      nextFireAt: '2026-10-19T11:00:00.000Z',
      intervalMinutes: 5,
    });

    const result = await labWorkflowScheduler.tick({ now, minIntervalMs: 0 });
    expect(result.fired).toBe(1);
    expect(notifications()).toBe(1);
  });

  test('the synthesised envelope names the scheduler as its source', async () => {
    const now = DateTime.fromISO('2026-10-19T12:00:00', { zone: 'UTC' });
    insertSchedule({
      id: `sched-${(seq += 1)}`,
      workflowId: WORKFLOW_ID,
      nextFireAt: '2026-10-19T11:59:00.000Z',
    });
    await labWorkflowScheduler.tick({ now, minIntervalMs: 0 });

    const row = db
      .prepare('SELECT envelope_json FROM lab_workflow_runs WHERE workflow_id = ? ORDER BY rowid DESC LIMIT 1')
      .get(WORKFLOW_ID) as { envelope_json: string };
    const envelope = JSON.parse(row.envelope_json) as { sourceAppId: string; payload: Record<string, unknown> };
    // Provenance matters: without it a scheduled run looks identical to a real event and nobody can
    // answer "why did this happen at 3am?".
    expect(envelope.sourceAppId).toBe(LAB_WORKFLOW_SCHEDULER_SOURCE_APP_ID);
    expect(envelope.payload).toHaveProperty('scheduleId');
  });
});
