import { afterAll, beforeAll, describe, expect, test } from '@jest/globals';
import betterSqlite3 from 'better-sqlite3';
import { randomUUID } from 'node:crypto';
import { createUsersTable } from '@/backend/db/Auth/auth-schema';
import { labEventsRepository } from '@/backend/db/LabEvents/lab-events-repository';
import { labWorkflowsRepository } from '@/backend/db/LabWorkflows/lab-workflows-repository';
import { labWorkflowRunsRepository } from '@/backend/db/LabWorkflows/lab-workflow-runs-repository';
import { evaluateWorkflowGraphForDomainEvent } from '@/backend/lab-workflows/lab-workflow-graph-evaluator';
import { beginWorkflowRun } from '@/backend/lab-workflows/lab-workflow-run-recorder';
import type { LabDomainEventEnvelopeV1 } from '@/shared/types/lab-domain-event';
import type { LabWorkflowDefinitionV2 } from '@/shared/types/lab-workflow-graph';
import { LAB_WORKFLOW_GRAPH_SCHEMA_VERSION } from '@/shared/types/lab-workflow-graph';

/**
 * The walker must actually take a branch out of an IF node.
 *
 * ## The bug this exists for
 *
 * An IF's edges encode their branch **twice**: `outputIndex` (0/1) and `when` (`on_true`/`on_false`).
 * The step runner sets both, but `runActionNode` built its traversal context with only
 * `{ outputIndex: port }` — and `edgeWhenAllows` reads `when`, requiring `conditionPass` to be
 * exactly true/false for `on_true`/`on_false`.
 *
 * With `conditionPass` left `undefined`, *every* edge out of an IF failed the `when` test. The run
 * stopped at the first IF while the node itself recorded `succeeded` with `matched: true` — so the
 * history said the condition passed and simply showed nothing after it. No unit test caught this
 * because the routing-node tests call `runWorkflowStep()` directly and assert on `outputIndex`; the
 * walker was never in the loop.
 *
 * These tests go through `evaluateWorkflowGraphForDomainEvent`, so they assert on the *effect* of
 * the traversal (a notification) rather than on the shape of an intermediate object.
 */

const WORKFLOW_ID = 'e6a00003-0003-4003-8003-0000000000b7';
const TRIGGER_EVENT = 'app-lab-tasklist.task.created';

describe('IF branch traversal through the graph walker', () => {
  let db: betterSqlite3.Database;

  beforeAll(async () => {
    db = betterSqlite3(':memory:');
    db.exec(createUsersTable);
    db.prepare(
      `INSERT INTO users (id, email, name, role, status) VALUES (1, 'a@test', 'Admin', 'admin', 'active')`,
    ).run();
    for (const id of [2, 3]) {
      db.prepare(
        `INSERT INTO users (id, email, name, role, status) VALUES (?, ?, ?, 'member', 'active')`,
      ).run(id, `u${id}@test`, `User ${id}`);
    }

    await labEventsRepository.bootstrap(db);
    await labWorkflowsRepository.bootstrap(db);
    await labWorkflowRunsRepository.bootstrap(db);

    labWorkflowsRepository.insertWorkflow({
      id: WORKFLOW_ID,
      name: 'IF branch fixture',
      description: null,
      scope: 'global',
      ownerUserId: null,
      createdByUserId: 1,
      enabled: true,
      priority: 100,
      definitionJson: JSON.stringify({
        schemaVersion: LAB_WORKFLOW_GRAPH_SCHEMA_VERSION,
        nodes: [
          { id: 'n-trigger', kind: 'trigger', position: { x: 0, y: 0 }, eventType: TRIGGER_EVENT },
        ],
        edges: [],
        viewport: { x: 0, y: 0, zoom: 1 },
      }),
    });
  });

  afterAll(() => {
    db.close();
  });

  /**
   * Build an envelope **and persist it**.
   *
   * `lab_user_notifications.event_id` is a FK into `lab_domain_events`, so a notify node can only
   * write a row once the event exists. Skipping this makes the assertion fail for a reason unrelated
   * to the branch logic under test.
   */
  async function envelope(
    overrides: Record<string, unknown> = {},
  ): Promise<LabDomainEventEnvelopeV1> {
    const env: LabDomainEventEnvelopeV1 = {
      schemaVersion: 1,
      id: randomUUID(),
      type: TRIGGER_EVENT,
      sourceAppId: 'app-lab-tasklist',
      occurredAt: new Date().toISOString(),
      actorUserId: 1,
      payload: { taskId: 't-1', stepValue: 1, assigneeId: '2', ...overrides },
    } as LabDomainEventEnvelopeV1;
    await labEventsRepository.publishEvent(
      env.id,
      env.type,
      env.sourceAppId,
      env.occurredAt,
      env.actorUserId ?? null,
      JSON.stringify(env.payload),
    );
    return env;
  }

  /**
   * Trigger → IF(`stepValue` present) → notify user 2 on true / user 3 on false.
   *
   * Both branches end in a notification so the assertion is about which one ran, not about an
   * internal counter.
   */
  function ifDefinition(): LabWorkflowDefinitionV2 {
    return {
      schemaVersion: LAB_WORKFLOW_GRAPH_SCHEMA_VERSION,
      nodes: [
        { id: 'n-trigger', kind: 'trigger', position: { x: 0, y: 0 }, eventType: TRIGGER_EVENT },
        {
          id: 'n-if',
          kind: 'action',
          position: { x: 0, y: 100 },
          step: {
            kind: 'if_condition',
            conditions: [{ kind: 'payload_exists', path: 'stepValue' }],
          },
        },
        {
          id: 'n-true',
          kind: 'action',
          position: { x: -100, y: 200 },
          step: {
            kind: 'notify_users',
            userIds: [2],
            message: { title: 'true branch' },
          },
        },
        {
          id: 'n-false',
          kind: 'action',
          position: { x: 100, y: 200 },
          step: {
            kind: 'notify_users',
            userIds: [3],
            message: { title: 'false branch' },
          },
        },
      ],
      edges: [
        { id: 'e1', source: 'n-trigger', target: 'n-if', when: 'always' },
        { id: 'e2', source: 'n-if', target: 'n-true', when: 'on_true', outputIndex: 0 },
        { id: 'e3', source: 'n-if', target: 'n-false', when: 'on_false', outputIndex: 1 },
      ],
      viewport: { x: 0, y: 0, zoom: 1 },
    };
  }

  function notificationsFor(userId: number): { title: string }[] {
    return db
      .prepare('SELECT title FROM lab_user_notifications WHERE user_id = ? ORDER BY rowid DESC')
      .all(userId) as { title: string }[];
  }

  test('a passing condition walks the on_true branch', async () => {
    const env = await envelope();
    const run = beginWorkflowRun({ workflowId: WORKFLOW_ID, triggerType: 'event', envelope: env });
    await evaluateWorkflowGraphForDomainEvent(ifDefinition(), env, 'if-true', 'global', null, {
      run,
    });
    run.finish();

    // Before the fix this was empty: the IF succeeded, then every branch failed the `when` check.
    expect(notificationsFor(2).map((row) => row.title)).toContain('true branch');
    expect(notificationsFor(3).map((row) => row.title)).not.toContain('false branch');
  });

  test('a failing condition walks the on_false branch', async () => {
    const env = await envelope();
    // Remove the field the IF tests, so the false port is the one that emits.
    (env.payload as Record<string, unknown>).stepValue = undefined;
    delete (env.payload as Record<string, unknown>).stepValue;

    const run = beginWorkflowRun({ workflowId: WORKFLOW_ID, triggerType: 'event', envelope: env });
    await evaluateWorkflowGraphForDomainEvent(ifDefinition(), env, 'if-false', 'global', null, {
      run,
    });
    run.finish();

    expect(notificationsFor(3).map((row) => row.title)).toContain('false branch');
  });

  test('the IF node records its step so the stall is visible in history', async () => {
    // Guards the diagnostic half of the bug: the node reported success with no successor step, which
    // reads as "nothing after this ran" rather than "the traversal broke".
    const env = await envelope();
    const run = beginWorkflowRun({ workflowId: WORKFLOW_ID, triggerType: 'event', envelope: env });
    await evaluateWorkflowGraphForDomainEvent(ifDefinition(), env, 'if-steps', 'global', null, {
      run,
    });
    run.finish();

    const steps = labWorkflowRunsRepository.listStepsForRun(run.id);
    expect(steps.map((step) => step.nodeId)).toContain('n-if');
    // The regression was precisely that n-if appeared and its targets did not.
    expect(steps.map((step) => step.nodeId)).toContain('n-true');
  });
});
