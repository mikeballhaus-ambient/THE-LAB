import { afterAll, beforeAll, describe, expect, test } from '@jest/globals';
import betterSqlite3 from 'better-sqlite3';
import { randomUUID } from 'node:crypto';
import { createUsersTable } from '@/backend/db/Auth/auth-schema';
import { labEventsRepository } from '@/backend/db/LabEvents/lab-events-repository';
import { labCommsRepository } from '@/backend/db/Comms/lab-comms-repository';
import { labWorkflowsRepository } from '@/backend/db/LabWorkflows/lab-workflows-repository';
import { labWorkflowRunsRepository } from '@/backend/db/LabWorkflows/lab-workflow-runs-repository';
import {
  beginWorkflowRun,
  classifyStepStatus,
} from '@/backend/lab-workflows/lab-workflow-run-recorder';
import { evaluateWorkflowsForDomainEvent } from '@/backend/lab-workflows/lab-workflows-evaluator';
import { LAB_PLATFORM_SYSTEM_USER_ID } from '@/shared/config/lab-platform-system-user';
import { LAB_WORKFLOW_RUN_RETENTION_PER_WORKFLOW } from '@/shared/types/lab-workflow-run';
import type { LabDomainEventEnvelopeV1 } from '@/shared/types/lab-domain-event';
import {
  LAB_WORKFLOW_GRAPH_SCHEMA_VERSION,
  type LabWorkflowDefinitionV2,
} from '@/shared/types/lab-workflow-graph';
import { DEMO_WORKFLOW_ID } from '@/backend/db/PlatformCatalog/platform-catalog-demo-seed';

/**
 * W1 gate — every execution is observable.
 *
 * The plan's verify line is: *a domain event produces one run with one step per executed node;
 * disabled workflows produce none.* Both halves matter. Producing rows is easy; **not** producing
 * them for workflows that did not react is what keeps the table usable, because every event in the
 * lab is offered to every enabled workflow.
 */

// 2 is the reserved automation account; test recipients start at 3.
const ASSIGNEE_ID = 3;
const TASK_TITLE = 'Ship widgets';

/**
 * The W1 fixture: trigger → rule → notify → DM.
 *
 * Deliberately **not** the seeded demo. The demo (phase 26) is a branching triage graph whose rule
 * gates on `priority`, and this suite is about *run recording* — one run, one row per executed node,
 * the rule's verdict recorded. Coupling a recording test to a demo graph means every demo edit
 * rewrites the assertions; the fixture makes "which branch was taken" a fixed property.
 */
function recordingFixture(): LabWorkflowDefinitionV2 {
  const trigger = 'd4000002-0002-4002-8002-000000000001';
  const rule = 'd4000002-0002-4002-8002-000000000002';
  const notify = 'd4000002-0002-4002-8002-000000000003';
  const dm = 'd4000002-0002-4002-8002-000000000004';
  return {
    schemaVersion: LAB_WORKFLOW_GRAPH_SCHEMA_VERSION,
    nodes: [
      { id: trigger, kind: 'trigger', position: { x: 0, y: 0 }, eventType: 'app-lab-tasklist.task.created' },
      {
        id: rule,
        kind: 'rule',
        position: { x: 200, y: 0 },
        name: 'Assignee is me',
        conditions: [{ kind: 'payload_equals', path: 'assigneeId', value: '@me' }],
      },
      {
        id: notify,
        kind: 'action',
        position: { x: 400, y: 0 },
        step: { kind: 'notify_users', userIds: [], path: 'assigneeId' },
      },
      {
        id: dm,
        kind: 'action',
        position: { x: 600, y: 0 },
        step: { kind: 'comms_system_dm_payload_user', path: 'assigneeId' },
      },
    ],
    edges: [
      { id: 'd4000002-0002-4002-8002-000000000011', source: trigger, target: rule, when: 'always' },
      { id: 'd4000002-0002-4002-8002-000000000012', source: rule, target: notify, when: 'on_match' },
      { id: 'd4000002-0002-4002-8002-000000000013', source: notify, target: dm, when: 'always' },
    ],
  };
}

describe('lab workflow runs (W1)', () => {
  let db: betterSqlite3.Database;

  beforeAll(async () => {
    db = betterSqlite3(':memory:');
    db.exec(createUsersTable);
    db.prepare(
      `INSERT INTO users (id, email, name, role, status) VALUES (1, 'a@test', 'Admin', 'admin', 'active')`,
    ).run();
    db.prepare(
      `INSERT INTO users (id, email, name, role, status) VALUES (?, 'b@test', 'Bob', 'member', 'active')`,
    ).run(ASSIGNEE_ID);
    db.prepare(
      `INSERT INTO users (id, email, name, role, status) VALUES (?, 'system@the-lab.platform', 'THE-LAB', 'viewer', 'active')`,
    ).run(LAB_PLATFORM_SYSTEM_USER_ID);

    await labEventsRepository.bootstrap(db);
    await labWorkflowsRepository.bootstrap(db);
    await labWorkflowRunsRepository.bootstrap(db);
    await labCommsRepository.bootstrap(db);

    labWorkflowsRepository.insertWorkflow({
      id: DEMO_WORKFLOW_ID,
      name: 'Demo: notify assignee on new task',
      description: null,
      scope: 'global',
      ownerUserId: null,
      createdByUserId: 1,
      enabled: true,
      priority: 100,
      definitionJson: JSON.stringify(recordingFixture()),
    });
  });

  afterAll(() => {
    db.close();
  });

  function envelope(overrides: Partial<LabDomainEventEnvelopeV1> = {}): LabDomainEventEnvelopeV1 {
    return {
      schemaVersion: 1,
      id: randomUUID(),
      type: 'app-lab-tasklist.task.created',
      sourceAppId: 'app-lab-tasklist',
      occurredAt: new Date().toISOString(),
      actorUserId: 1,
      payload: { assigneeId: String(ASSIGNEE_ID), title: TASK_TITLE },
      ...overrides,
    };
  }

  test('a matching event opens exactly one run and records the trigger', async () => {
    const env = envelope();
    await labEventsRepository.publishEvent(
      env.id,
      env.type,
      env.sourceAppId,
      env.occurredAt,
      env.actorUserId ?? null,
      JSON.stringify(env.payload),
    );

    await evaluateWorkflowsForDomainEvent(env, {});

    const runs = labWorkflowRunsRepository.listRunsForWorkflow(DEMO_WORKFLOW_ID);
    expect(runs).toHaveLength(1);

    const [run] = runs;
    expect(run?.triggerType).toBe('event');
    expect(run?.eventId).toBe(env.id);
    expect(run?.status).toBe('succeeded');
    expect(run?.finishedAt).not.toBeNull();

    const steps = labWorkflowRunsRepository.listStepsForRun(run!.id);
    // Trigger + rule + notify + DM, in that order.
    expect(steps.map((s) => s.nodeKind)).toEqual(['trigger', 'rule', 'action', 'action']);
    // The first row must be the graph's actual trigger node, not a synthesised label — that is
    // what lets the designer highlight the node that fired.
    const triggerNode = recordingFixture().nodes.find((n) => n.kind === 'trigger');
    expect(steps[0]?.nodeId).toBe(triggerNode?.id);
    expect(steps[0]?.detail).toMatchObject({ matchedEventType: env.type });
  });

  test('step rows are sequential and the rule records its verdict', async () => {
    const [run] = labWorkflowRunsRepository.listRunsForWorkflow(DEMO_WORKFLOW_ID);
    const steps = labWorkflowRunsRepository.listStepsForRun(run!.id);

    expect(steps.map((s) => s.seq)).toEqual([1, 2, 3, 4]);
    const rule = steps.find((s) => s.nodeKind === 'rule');
    expect(rule?.detail).toMatchObject({ matched: true });
    expect(rule?.status).toBe('succeeded');

    // The action nodes name the step kind they ran, which is what the run panel shows.
    const actions = steps.filter((s) => s.nodeKind === 'action');
    expect(actions.map((s) => (s.detail as { stepKind: string }).stepKind)).toEqual([
      'notify_users',
      'comms_system_dm_payload_user',
    ]);
    expect(actions.every((s) => s.status === 'succeeded')).toBe(true);
  });

  test('the envelope is stored so a run can be explained after the fact', async () => {
    const [run] = labWorkflowRunsRepository.listRunsForWorkflow(DEMO_WORKFLOW_ID);
    const stored = JSON.parse(run!.envelopeJson ?? '{}') as {
      payload?: { title?: string };
    };
    expect(stored.payload?.title).toBe(TASK_TITLE);
  });

  test('a disabled workflow produces no run at all', async () => {
    labWorkflowsRepository.updateWorkflow({
      ...labWorkflowsRepository.getById(DEMO_WORKFLOW_ID)!,
      enabled: false,
    });
    const before = labWorkflowRunsRepository.listRecentRuns().length;

    const env = envelope();
    await labEventsRepository.publishEvent(
      env.id,
      env.type,
      env.sourceAppId,
      env.occurredAt,
      env.actorUserId ?? null,
      JSON.stringify(env.payload),
    );
    await evaluateWorkflowsForDomainEvent(env, {});

    expect(labWorkflowRunsRepository.listRecentRuns().length).toBe(before);

    labWorkflowsRepository.updateWorkflow({
      ...labWorkflowsRepository.getById(DEMO_WORKFLOW_ID)!,
      enabled: true,
    });
  });

  test('a rule that genuinely declines records the rule as skipped and stops the run', async () => {
    // A **user-scoped** workflow is what makes this rule meaningful: `@me` resolves to the owner id,
    // so an event assigned to someone else must not pass. The global demo copy resolves `@me` to the
    // value at the same payload path, which makes it a tautology — fine for a demo, useless as a
    // fixture proving a rule can decline.
    const ownerWorkflowId = 'user-scoped-assignee-workflow';
    labWorkflowsRepository.insertWorkflow({
      id: ownerWorkflowId,
      name: 'Notify me about my tasks',
      description: null,
      scope: 'user',
      ownerUserId: 1,
      createdByUserId: 1,
      enabled: true,
      priority: 50,
      definitionJson: JSON.stringify(recordingFixture()),
    });

    const env = envelope({ payload: { assigneeId: '999', title: 'Not mine' } });
    await labEventsRepository.publishEvent(
      env.id,
      env.type,
      env.sourceAppId,
      env.occurredAt,
      env.actorUserId ?? null,
      JSON.stringify(env.payload),
    );

    // The actor is user 1, so user 1's workflow is offered the event; the rule then declines.
    await evaluateWorkflowsForDomainEvent(env, {});

    const [run] = labWorkflowRunsRepository.listRunsForWorkflow(ownerWorkflowId);
    expect(run?.status).toBe('skipped');

    const steps = labWorkflowRunsRepository.listStepsForRun(run!.id);
    // Trigger + rule only — `on_match` prevented the notify and DM from running.
    expect(steps.map((s) => s.nodeKind)).toEqual(['trigger', 'rule']);
    expect(steps[1]?.status).toBe('skipped');
    expect(steps[1]?.detail).toMatchObject({ matched: false });

    const skippedRunNotifications = db
      .prepare('SELECT COUNT(*) AS c FROM lab_user_notifications WHERE user_id = 1')
      .get() as { c: number };
    expect(skippedRunNotifications.c).toBe(0);
  });

  test('a declining rule is skipped, not failed', () => {
    // The distinction is the whole point: a workflow that correctly declines must not look broken.
    expect(classifyStepStatus('rule_ref did not match')).toBe('skipped');
    expect(classifyStepStatus('rule_ref missing rule abc')).toBe('failed');
    expect(classifyStepStatus('boom')).toBe('failed');
  });

  test('one unresolvable recipient costs one notification, not the run', async () => {
    // Regression: `lab_user_notifications.user_id` is a FK. A payload naming a user who does not
    // exist used to raise a constraint error that escaped the node and marked the whole run
    // `failed`. The demo (global) rule is a tautology, so this event reaches the action nodes.
    const env = envelope({ payload: { assigneeId: '424242', title: 'Ghost assignee' } });
    await labEventsRepository.publishEvent(
      env.id,
      env.type,
      env.sourceAppId,
      env.occurredAt,
      env.actorUserId ?? null,
      JSON.stringify(env.payload),
    );

    await evaluateWorkflowsForDomainEvent(env, {});

    const [run] = labWorkflowRunsRepository.listRunsForWorkflow(DEMO_WORKFLOW_ID);
    expect(run?.status).not.toBe('failed');

    const steps = labWorkflowRunsRepository.listStepsForRun(run!.id);
    const notify = steps.find(
      (s) => (s.detail as { stepKind?: string } | null)?.stepKind === 'notify_users',
    );
    expect(notify?.status).toBe('succeeded');
    // notify_users reports recipient resolution separately from inbox inserts.
    expect(notify?.detail).toMatchObject({ recipients: 1, delivered: 0 });
  });

  test('recording a run never throws when the database is gone', () => {
    // Recording is diagnostic. A workflow must still notify if run tables are unavailable.
    const run = beginWorkflowRun({ workflowId: 'missing-workflow', triggerType: 'manual' });
    expect(() => {
      run.recordStep({
        nodeId: 'n1',
        nodeKind: 'action',
        status: 'succeeded',
        itemsInCount: 1,
        itemsOutCount: 1,
      });
      run.finish();
    }).not.toThrow();
  });

  test('retention prunes old runs per workflow but keeps the newest', () => {
    const workflowId = 'retention-test-workflow';
    labWorkflowsRepository.insertWorkflow({
      id: workflowId,
      name: 'Retention fixture',
      description: null,
      scope: 'global',
      ownerUserId: null,
      createdByUserId: 1,
      enabled: false,
      priority: 999,
      definitionJson: JSON.stringify(recordingFixture()),
    });

    const total = LAB_WORKFLOW_RUN_RETENTION_PER_WORKFLOW + 5;
    for (let i = 0; i < total; i += 1) {
      labWorkflowRunsRepository.startRun({
        id: `retention-run-${i}`,
        workflowId,
        triggerType: 'manual',
        eventId: null,
        envelope: null,
        // Ascending timestamps so "newest" is unambiguous and the prune target is deterministic.
        startedAt: new Date(Date.UTC(2026, 0, 1, 0, 0, i)).toISOString(),
      });
      labWorkflowRunsRepository.finishRun({
        runId: `retention-run-${i}`,
        status: 'succeeded',
        error: null,
        finishedAt: new Date(Date.UTC(2026, 0, 1, 0, 0, i)).toISOString(),
      });
    }

    labWorkflowRunsRepository.pruneRunsForWorkflow(workflowId);

    const kept = labWorkflowRunsRepository.listRunsForWorkflow(
      workflowId,
      LAB_WORKFLOW_RUN_RETENTION_PER_WORKFLOW + 50,
    );
    expect(kept).toHaveLength(LAB_WORKFLOW_RUN_RETENTION_PER_WORKFLOW);
    // The oldest five are gone; the newest survives.
    expect(kept.some((r) => r.id === 'retention-run-0')).toBe(false);
    expect(kept.some((r) => r.id === `retention-run-${total - 1}`)).toBe(true);
    // Pruning must not reach into another workflow's runs.
    expect(
      labWorkflowRunsRepository.listRunsForWorkflow(DEMO_WORKFLOW_ID).length,
    ).toBeGreaterThan(0);
  });
});
