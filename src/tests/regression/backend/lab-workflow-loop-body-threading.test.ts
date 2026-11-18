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
 * A loop body's output must seed the next pass.
 *
 * ## The bug this exists for
 *
 * `walkNode` returns `void` — it forwards items down edges but reports nothing back. `runLoopNode`
 * therefore had no way to see what its body produced, and reset `items` to the array it held *before*
 * walking the body on every pass.
 *
 * The failure mode is nasty because everything looks healthy: the loop iterates the right number of
 * times, each body node records `succeeded` with `itemCountOut: 1`, and only the *value* the body
 * accumulates stays frozen. It presents as "the Code node isn't incrementing" or "the loop isn't
 * passing its output", and is neither.
 *
 * The fixture is the webhook-loop demo in miniature: trigger → loop(while `stepValue < 3`) → code
 * that increments `stepValue` → back to the loop → done. With the bug, `stepValue` stays 1 forever
 * and the `done` branch sees 1; with the fix it reaches 3 and exits on the condition rather than the
 * cap.
 */

const WORKFLOW_ID = 'e6a00005-0005-4005-8005-0000000000d9';
const TRIGGER_EVENT = 'app-lab-tasklist.task.created';

describe('loop body output threads into the next iteration', () => {
  let db: betterSqlite3.Database;

  beforeAll(async () => {
    db = betterSqlite3(':memory:');
    db.exec(createUsersTable);
    db.prepare(
      `INSERT INTO users (id, email, name, role, status) VALUES (1, 'a@test', 'Admin', 'admin', 'active')`,
    ).run();

    await labEventsRepository.bootstrap(db);
    await labWorkflowsRepository.bootstrap(db);
    await labWorkflowRunsRepository.bootstrap(db);

    labWorkflowsRepository.insertWorkflow({
      id: WORKFLOW_ID,
      name: 'Loop body threading fixture',
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

  async function envelope(payload: Record<string, unknown>): Promise<LabDomainEventEnvelopeV1> {
    const env: LabDomainEventEnvelopeV1 = {
      schemaVersion: 1,
      id: randomUUID(),
      type: TRIGGER_EVENT,
      sourceAppId: 'app-lab-tasklist',
      occurredAt: new Date().toISOString(),
      actorUserId: 1,
      payload,
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
   * Trigger → loop(while `stepValue < 3`, max 10) → [body: code increment] → back → done.
   *
   * The cap is deliberately far above the number of passes needed, so reaching `done` early proves
   * the `while` condition was re-evaluated against the *incremented* value. Exiting at the cap would
   * mean the value never changed.
   */
  function definition(): LabWorkflowDefinitionV2 {
    return {
      schemaVersion: LAB_WORKFLOW_GRAPH_SCHEMA_VERSION,
      nodes: [
        { id: 'n-trigger', kind: 'trigger', position: { x: 0, y: 0 }, eventType: TRIGGER_EVENT },
        {
          id: 'n-loop',
          kind: 'action',
          position: { x: 0, y: 100 },
          step: {
            kind: 'loop',
            maxIterations: 10,
            while: [{ kind: 'payload_less_than', path: 'stepValue', value: 3 }],
          },
        },
        {
          id: 'n-inc',
          kind: 'action',
          position: { x: -100, y: 200 },
          step: {
            kind: 'code',
            source: '(items) => items.map((item) => ({ ...item, stepValue: (item.stepValue ?? 0) + 1 }))',
          },
        },
        {
          id: 'n-done',
          kind: 'action',
          position: { x: 100, y: 200 },
          step: { kind: 'notify_users', userIds: [1], message: { title: 'done' } },
        },
      ],
      edges: [
        { id: 'e1', source: 'n-trigger', target: 'n-loop', when: 'always' },
        { id: 'e2', source: 'n-loop', target: 'n-inc', when: 'always', outputIndex: 0 },
        { id: 'e4', source: 'n-inc', target: 'n-loop', when: 'always' },
        { id: 'e3', source: 'n-loop', target: 'n-done', when: 'always', outputIndex: 1 },
      ],
      viewport: { x: 0, y: 0, zoom: 1 },
    };
  }

  test('the incremented value drives the while condition, so the loop exits early', async () => {
    const env = await envelope({ stepValue: 1 });
    const run = beginWorkflowRun({ workflowId: WORKFLOW_ID, triggerType: 'manual', envelope: env });

    await evaluateWorkflowGraphForDomainEvent(definition(), env, 'loop-threading', 'global', null, {
      run,
    });
    run.finish();

    const steps = labWorkflowRunsRepository.listStepsForRun(run.id);
    const loopSteps = steps
      .filter((step) => step.nodeId === 'n-loop')
      .map((step) => step.detail as Record<string, unknown>);

    // With the bug the loop burned all 10 passes and reported `capReached: true`.
    expect(loopSteps.some((detail) => detail.capReached === true)).toBe(false);
    // Two body passes take 1 → 2 → 3, so the third decision sees `3 < 3` as false and exits.
    const bodyPasses = loopSteps.filter((detail) => detail.continueBody === true);
    expect(bodyPasses).toHaveLength(2);
  });

  test('the value handed to the done branch is the accumulated one', async () => {
    // Guards the second half of the bug: even the pass that finally exited carried the *original*
    // array, so a downstream condition on the incremented value could never be satisfied.
    const env = await envelope({ stepValue: 1 });
    const run = beginWorkflowRun({ workflowId: WORKFLOW_ID, triggerType: 'manual', envelope: env });
    await evaluateWorkflowGraphForDomainEvent(definition(), env, 'loop-threading-value', 'global', null, {
      run,
    });
    run.finish();

    const loopSteps = labWorkflowRunsRepository
      .listStepsForRun(run.id)
      .filter((step) => step.nodeId === 'n-loop');
    const finalDetail = loopSteps[loopSteps.length - 1]?.detail as Record<string, unknown>;
    expect(finalDetail.continueBody).toBe(false);
    // `whileSatisfied: false` means the condition saw 3, not 1.
    expect(finalDetail.whileSatisfied).toBe(false);
  });
});
