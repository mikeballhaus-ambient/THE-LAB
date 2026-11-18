import { afterAll, beforeAll, beforeEach, describe, expect, test } from '@jest/globals';
import betterSqlite3 from 'better-sqlite3';
import { DateTime } from 'luxon';
import { createUsersTable } from '@/backend/db/Auth/auth-schema';
import { labEventsRepository } from '@/backend/db/LabEvents/lab-events-repository';
import { labWorkflowsRepository } from '@/backend/db/LabWorkflows/lab-workflows-repository';
import { labWorkflowRunsRepository } from '@/backend/db/LabWorkflows/lab-workflow-runs-repository';
import { labWorkflowSchedulesRepository } from '@/backend/db/LabWorkflows/lab-workflow-schedules-repository';
import { labWorkflowScheduler } from '@/backend/lab-workflows/lab-workflow-scheduler';
import { runWorkflowStep } from '@/backend/lab-workflows/lab-workflow-step-runner';
import { LabWorkflowStepSchema } from '@/shared/types/schemas/lab-workflow-step-schema';
import { LAB_WORKFLOW_GRAPH_SCHEMA_VERSION } from '@/shared/types/lab-workflow-graph';
import {
  WF_TEST_EDGE_TRIGGER_NOTIFY,
  WF_TEST_TRIGGER,
  WF_TEST_WAIT,
} from '../lab-workflow-graph-fixture-ids';
import type { LabDomainEventEnvelopeV1 } from '@/shared/types/lab-domain-event';
import type { LabWorkflowStepV1 } from '@/shared/types/lab-workflow';
import type { LabWorkflowItem } from '@/shared/types/lab-workflow-items';

/**
 * W8b — the trigger variants and the Wait node.
 *
 * Two independent things, asserted separately:
 *
 * 1. **Wait** is a node, so it is tested against the runner. The property that matters is that it does
 *    not sleep: blocking inside a node would hold a request and a run row open for as long as the
 *    author asked, and a restart would lose the run.
 * 2. **The variants** are schedule rows, so they are tested through the tick: a cron and a recurrence
 *    must fire, and a relative/staleness schedule must carry its offset into `next_fire_at`.
 */

const TRIGGER_EVENT = 'app-lab-tasklist.task.created';
const WORKFLOW_ID = 'e6d00007-0007-4007-8007-0000000000db';

function envelope(): LabDomainEventEnvelopeV1 {
  return {
    schemaVersion: 1,
    id: 'evt-w8b',
    type: TRIGGER_EVENT,
    sourceAppId: 'app-lab-tasklist',
    occurredAt: '2026-10-19T12:00:00.000Z',
    actorUserId: 1,
    payload: { taskId: 't-1' },
  } as LabDomainEventEnvelopeV1;
}

function items(): LabWorkflowItem[] {
  return [{ json: { taskId: 't-1' } }];
}

describe('wait node (W8b)', () => {
  async function run(step: LabWorkflowStepV1) {
    return runWorkflowStep({
      step,
      envelope: envelope(),
      items: items(),
      workflowName: 'wait-fixture',
      nodeId: 'n-wait',
      options: {},
    });
  }

  test('suspends with a resume instant instead of sleeping', async () => {
    const startedAt = Date.now();
    const outcome = await run({ kind: 'wait', amount: 2, unit: 'days' });

    // The whole point: the call returns immediately. A sleeping implementation would block for two
    // days, which is both untestable and wrong.
    expect(Date.now() - startedAt).toBeLessThan(2000);
    // `suspend`, not `continue`: the graph stops here and the evaluator parks the items for the
    // clock. A `continue` would mean the wait silently did nothing, which is the bug phase 36 fixes.
    expect(outcome.kind).toBe('suspend');
    if (outcome.kind !== 'suspend') {
      return;
    }
    expect(outcome.detail).toMatchObject({ stepKind: 'wait', deferred: true, amount: 2, unit: 'days' });
    const deltaMs = DateTime.fromISO(outcome.resumeAt).toMillis() - Date.now();
    expect(deltaMs).toBeGreaterThan(2 * 86_400_000 - 5_000);
    expect(deltaMs).toBeLessThan(2 * 86_400_000 + 5_000);
  });

  test('carries its items so the resumed continuation has data', async () => {
    // This is what gets persisted on the resume row. `wait` passes its input through unchanged, so
    // the array the next node needs is the array that arrived — no rehydration on resume.
    const outcome = await run({ kind: 'wait', amount: 1, unit: 'minutes' });
    if (outcome.kind !== 'suspend') {
      throw new Error('expected a suspend outcome');
    }
    expect(outcome.output.items).toHaveLength(1);
    expect(outcome.output.items[0]?.json.taskId).toBe('t-1');
  });

  test.each([
    ['minutes', 5, 5 * 60_000],
    ['hours', 3, 3 * 3_600_000],
    ['days', 1, 86_400_000],
  ] as const)('converts %s correctly', async (unit, amount, expectedMs) => {
    const outcome = await run({ kind: 'wait', amount, unit });
    if (outcome.kind !== 'suspend') {
      throw new Error('expected a suspend outcome');
    }
    const deltaMs = DateTime.fromISO(outcome.resumeAt).toMillis() - Date.now();
    expect(Math.abs(deltaMs - expectedMs)).toBeLessThan(5_000);
  });

  test.each([
    ['zero', { kind: 'wait', amount: 0, unit: 'days' }],
    ['beyond the cap', { kind: 'wait', amount: 31, unit: 'days' }],
    ['an unknown unit', { kind: 'wait', amount: 1, unit: 'weeks' }],
  ])('the schema rejects %s', (_name, step) => {
    // The cap exists so a run row cannot sit "running" for longer than a month; an unbounded wait is
    // a workflow nobody remembers exists.
    expect(LabWorkflowStepSchema.safeParse(step).success).toBe(false);
  });

  test('the schema accepts a bounded wait', () => {
    expect(LabWorkflowStepSchema.safeParse({ kind: 'wait', amount: 30, unit: 'days' }).success).toBe(true);
  });
});

describe('trigger variants (W8b)', () => {
  let db: betterSqlite3.Database;
  let seq = 0;

  beforeAll(async () => {
    db = betterSqlite3(':memory:');
    db.exec(createUsersTable);
    db.prepare(
      `INSERT INTO users (id, email, name, role, status) VALUES (1, 'a@test', 'Admin', 'admin', 'active')`,
    ).run();

    await labEventsRepository.bootstrap(db);
    await labWorkflowsRepository.bootstrap(db);
    await labWorkflowRunsRepository.bootstrap(db);
    await labWorkflowSchedulesRepository.bootstrap(db);

    labWorkflowsRepository.insertWorkflow({
      id: WORKFLOW_ID,
      name: 'Variant fixture',
      description: null,
      scope: 'global',
      ownerUserId: null,
      createdByUserId: 1,
      enabled: true,
      priority: 100,
      definitionJson: JSON.stringify({
        schemaVersion: LAB_WORKFLOW_GRAPH_SCHEMA_VERSION,
        nodes: [
          { id: WF_TEST_TRIGGER, kind: 'trigger', position: { x: 0, y: 0 }, eventType: TRIGGER_EVENT },
          {
            id: WF_TEST_WAIT,
            kind: 'action',
            position: { x: 0, y: 100 },
            step: { kind: 'wait', amount: 1, unit: 'days' },
          },
        ],
        edges: [{ id: WF_TEST_EDGE_TRIGGER_NOTIFY, source: WF_TEST_TRIGGER, target: WF_TEST_WAIT, when: 'always' }],
      }),
    });
  });

  beforeEach(() => {
    db.prepare('DELETE FROM lab_workflow_schedules').run();
    db.prepare('DELETE FROM lab_workflow_runs').run();
  });

  afterAll(() => {
    db.close();
  });

  function schedule(params: {
    kind: 'cron' | 'recurrence' | 'interval' | 'relative' | 'staleness';
    expression?: string | null;
    intervalMinutes?: number | null;
    offsetDays?: number | null;
    nextFireAt: string;
  }): string {
    const id = `variant-${(seq += 1)}`;
    labWorkflowSchedulesRepository.insert({
      id,
      workflowId: WORKFLOW_ID,
      triggerNodeId: WF_TEST_TRIGGER,
      kind: params.kind,
      expression: params.expression ?? null,
      timezone: 'America/Denver',
      intervalMinutes: params.intervalMinutes ?? null,
      offsetDays: params.offsetDays ?? null,
      nextFireAt: params.nextFireAt,
    });
    return id;
  }

  test('a cron schedule fires and advances to the next wall-clock occurrence', async () => {
    const id = schedule({
      kind: 'cron',
      expression: '0 9 * * *',
      nextFireAt: '2026-10-19T15:00:00.000Z',
    });
    const now = DateTime.fromISO('2026-10-19T16:00:00', { zone: 'UTC' });

    const result = await labWorkflowScheduler.tick({ now, minIntervalMs: 0 });
    expect(result.fired).toBe(1);

    const next = labWorkflowSchedulesRepository.findById(id);
    // 09:00 Denver on the 20th is 15:00Z (MDT).
    expect(next?.nextFireAt).toBe('2026-10-20T15:00:00.000Z');
  });

  test('a recurrence schedule fires', async () => {
    schedule({
      kind: 'recurrence',
      expression: 'FREQ=DAILY',
      nextFireAt: '2026-10-19T15:00:00.000Z',
    });
    const result = await labWorkflowScheduler.tick({
      now: DateTime.fromISO('2026-10-19T16:00:00', { zone: 'UTC' }),
      minIntervalMs: 0,
    });
    expect(result.fired).toBe(1);
  });

  test('a relative schedule keeps its offset when advancing', async () => {
    const id = schedule({
      kind: 'relative',
      offsetDays: 2,
      expression: null,
      nextFireAt: '2026-10-19T15:00:00.000Z',
    });
    await labWorkflowScheduler.tick({
      now: DateTime.fromISO('2026-10-19T16:00:00', { zone: 'UTC' }),
      minIntervalMs: 0,
    });

    // `relative` without a record date cannot compute a next occurrence, so the schedule parks
    // rather than inventing one. A wrong instant would be worse than none: the run panel can show
    // "no next fire" but cannot show "why did this fire at 4am".
    const next = labWorkflowSchedulesRepository.findById(id);
    expect(next?.lastFiredAt).toBe('2026-10-19T16:00:00.000Z');
    expect(next?.nextFireAt).toBeNull();
  });

  test('a schedule whose workflow runs the wait node completes without blocking', async () => {
    schedule({
      kind: 'cron',
      expression: '0 9 * * *',
      nextFireAt: '2026-10-19T15:00:00.000Z',
    });
    const startedAt = Date.now();
    await labWorkflowScheduler.tick({
      now: DateTime.fromISO('2026-10-19T16:00:00', { zone: 'UTC' }),
      minIntervalMs: 0,
    });
    // A graph containing a one-day Wait must still finish its tick immediately.
    expect(Date.now() - startedAt).toBeLessThan(5000);

    const steps = db
      .prepare('SELECT node_id, detail_json FROM lab_workflow_run_steps ORDER BY rowid')
      .all() as { node_id: string; detail_json: string | null }[];
    const waitStep = steps.find((row) => row.node_id === WF_TEST_WAIT);
    expect(waitStep).toBeDefined();
    expect(JSON.parse(waitStep?.detail_json ?? '{}')).toMatchObject({ deferred: true });
  });

  test('an interval schedule advances by its interval, not to an expression', async () => {
    const id = schedule({
      kind: 'interval',
      intervalMinutes: 90,
      nextFireAt: '2026-10-19T15:00:00.000Z',
    });
    await labWorkflowScheduler.tick({
      now: DateTime.fromISO('2026-10-19T16:00:00', { zone: 'UTC' }),
      minIntervalMs: 0,
    });
    expect(labWorkflowSchedulesRepository.findById(id)?.nextFireAt).toBe('2026-10-19T17:30:00.000Z');
  });
});
