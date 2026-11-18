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
import type { LabWorkflowRunStepStreamEvent } from '@/shared/types/lab-events-socket-events';

/**
 * The canvas is driven **only** by the run stream, so every node that reports a final status must
 * also emit a terminal stream event. A node that records a step without streaming one is left
 * painted `running` — permanently blue — even though the run completed.
 *
 * The loop's cap-reached exit did exactly that: it recorded its step and walked the `done` branch,
 * but never called `streamNode`. The run history looked perfect, which is why it read as a cosmetic
 * glitch rather than a missing event.
 */

const WORKFLOW_ID = 'e6a00004-0004-4004-8004-0000000000c8';
const TRIGGER_EVENT = 'app-lab-tasklist.task.created';

describe('loop node emits a terminal stream event on every exit', () => {
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
      name: 'Loop stream fixture',
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

  async function envelope(
    payload: Record<string, unknown>,
  ): Promise<LabDomainEventEnvelopeV1> {
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
   * Trigger → loop(max 2) → body → back to loop → done.
   *
   * The `while` **always** passes, so the loop walks its body every pass and then exits through the
   * **cap-reached** branch at the end of `runLoopNode` — the exit that used to skip `streamNode`.
   * (A `while` that fails on the first decision exits through the `!continueBody` branch instead,
   * which always streamed correctly, so that shape would not reproduce the bug.)
   */
  function cappedLoopDefinition(): LabWorkflowDefinitionV2 {
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
            maxIterations: 2,
            // `stepValue` is present, so this stays true and the loop runs to its cap.
            while: [{ kind: 'payload_exists', path: 'stepValue' }],
          },
        },
        {
          id: 'n-body',
          kind: 'action',
          position: { x: -100, y: 200 },
          // A `code` node rather than a notify: it passes items through without a side effect, so the
          // body can run repeatedly without writing rows for every pass.
          step: { kind: 'code', source: '(items) => items' },
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
        { id: 'e2', source: 'n-loop', target: 'n-body', when: 'always', outputIndex: 0 },
        // The back-edge is what makes iteration real: the body returns to the loop, which re-drives
        // its own passes rather than the ordinary walk re-entering it.
        { id: 'e4', source: 'n-body', target: 'n-loop', when: 'always' },
        { id: 'e3', source: 'n-loop', target: 'n-done', when: 'always', outputIndex: 1 },
      ],
      viewport: { x: 0, y: 0, zoom: 1 },
    };
  }

  test('a cap-bounded loop streams a settled status for its own node', async () => {
    const env = await envelope({ stepValue: 1 });
    const run = beginWorkflowRun({ workflowId: WORKFLOW_ID, triggerType: 'manual', envelope: env });
    const streamed: LabWorkflowRunStepStreamEvent[] = [];

    await evaluateWorkflowGraphForDomainEvent(
      cappedLoopDefinition(),
      env,
      'loop-stream',
      'global',
      null,
      {
        run,
        streamUserId: 1,
        io: {
          // Capture emits instead of opening a socket — the assertion is about which events the
          // evaluator produces, not about delivery. `emitWorkflowRunStep` goes through
          // `io.of(namespace).to(room).emit(...)`, so the mock mirrors that chain.
          of: () => ({
            to: () => ({
              emit: (_event: string, payload: LabWorkflowRunStepStreamEvent) => streamed.push(payload),
            }),
          }),
        } as never,
      },
    );
    run.finish();

    const loopEvents = streamed.filter((event) => event.nodeId === 'n-loop');
    expect(loopEvents.some((event) => event.status === 'running')).toBe(true);
    // The regression: without the terminal emit the node stayed blue forever.
    expect(loopEvents.some((event) => event.status === 'succeeded')).toBe(true);
  });
});
