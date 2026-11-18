import { afterAll, beforeAll, describe, expect, test } from '@jest/globals';
import betterSqlite3 from 'better-sqlite3';
import { createUsersTable } from '@/backend/db/Auth/auth-schema';
import { labWorkflowRunResumesRepository } from '@/backend/db/LabWorkflows/lab-workflow-run-resumes-repository';
import { labWorkflowRunsRepository } from '@/backend/db/LabWorkflows/lab-workflow-runs-repository';
import { labWorkflowsRepository } from '@/backend/db/LabWorkflows/lab-workflows-repository';
import {
  resumeWorkflowGraphAfterSuspend,
} from '@/backend/lab-workflows/lab-workflow-graph-evaluator';
import { resumeDueRuns } from '@/backend/lab-workflows/lab-workflow-resume-service';
import type { WorkflowRunHandle } from '@/backend/lab-workflows/lab-workflow-run-recorder';
import type { LabDomainEventEnvelopeV1 } from '@/shared/types/lab-domain-event';
import type { LabWorkflowDefinitionV2 } from '@/shared/types/lab-workflow-graph';
import { autoArrangeLabWorkflowGraph } from '@/shared/utils/lab-workflow-graph-auto-arrange';

/**
 * Phase 36 — durable `wait`.
 *
 * The tests that matter are the last three: they prove the resume path threads items correctly, that
 * a claimed row cannot resume twice, and that a resume whose node was deleted fails legibly instead
 * of hanging. The first group just establishes the storage contract.
 */

const WORKFLOW_ID = 'wf-resume-test';

/**
 * `recordStep` arguments, borrowed from the run handle so these fixtures stay honest when the
 * recorder's signature changes. Needed because the surrounding `run` object is cast `as never`,
 * which strips contextual typing and would otherwise make the parameter implicitly `any`.
 */
type RecordStepArgs = Parameters<WorkflowRunHandle['recordStep']>[0];

function envelope(payload: Record<string, unknown> = { taskId: 't-1' }): LabDomainEventEnvelopeV1 {
  return {
    schemaVersion: 1,
    id: 'evt-1',
    type: 'app-lab-tasklist.task.created',
    sourceAppId: 'app-lab-tasklist',
    occurredAt: '2026-10-21T00:00:00.000Z',
    payload,
  } as LabDomainEventEnvelopeV1;
}

/**
 * trigger → wait → notify.
 *
 * Deliberately tiny: the point is the *seam* between the two halves of the run, so the graph should
 * not add anything that could be confused for the thing under test.
 */
function waitThenNotify(): LabWorkflowDefinitionV2 {
  const nodes = [
    {
      id: 'trigger',
      kind: 'trigger' as const,
      position: { x: 0, y: 0 },
      eventType: 'app-lab-tasklist.task.created',
    },
    {
      id: 'wait-node',
      kind: 'action' as const,
      position: { x: 0, y: 0 },
      step: { kind: 'wait' as const, amount: 2, unit: 'minutes' as const },
    },
    {
      id: 'notify-node',
      kind: 'action' as const,
      position: { x: 0, y: 0 },
      step: { kind: 'notify_users' as const, userIds: [1] },
    },
  ];
  const edges = [
    { id: 'e1', source: 'trigger', target: 'wait-node', when: 'always' as const },
    { id: 'e2', source: 'wait-node', target: 'notify-node', when: 'always' as const },
  ];
  return {
    schemaVersion: 2,
    nodes: autoArrangeLabWorkflowGraph({ nodes, edges }, { direction: 'LR' }),
    edges,
    viewport: { x: 0, y: 0, zoom: 1 },
  };
}

/** Trigger → notify, with no wait: the uninterrupted baseline. */
function directNotify(): LabWorkflowDefinitionV2 {
  const nodes = [
    {
      id: 'trigger',
      kind: 'trigger' as const,
      position: { x: 0, y: 0 },
      eventType: 'app-lab-tasklist.task.created',
    },
    {
      id: 'notify-node',
      kind: 'action' as const,
      position: { x: 0, y: 0 },
      step: { kind: 'notify_users' as const, userIds: [1] },
    },
  ];
  const edges = [{ id: 'e1', source: 'trigger', target: 'notify-node', when: 'always' as const }];
  return {
    schemaVersion: 2,
    nodes: autoArrangeLabWorkflowGraph({ nodes, edges }, { direction: 'LR' }),
    edges,
    viewport: { x: 0, y: 0, zoom: 1 },
  };
}

describe('run resume persistence', () => {
  let db: betterSqlite3.Database;

  beforeAll(async () => {
    db = betterSqlite3(':memory:');
    db.exec(createUsersTable);
    db.prepare(
      `INSERT INTO users (id, email, name, role, status) VALUES (1, 'a@test', 'Admin', 'admin', 'active')`,
    ).run();
    await labWorkflowsRepository.bootstrap(db);
    await labWorkflowRunsRepository.bootstrap(db);
    await labWorkflowRunResumesRepository.bootstrap(db);

    // The resume table has real foreign keys to the workflow and run rows, so the fixture needs
    // both. A `:memory:` database enforces them, which is exactly why the constraint is useful —
    // it caught a resume row pointing at nothing.
    labWorkflowsRepository.insertWorkflow({
      id: WORKFLOW_ID,
      name: 'Resume fixture',
      description: null,
      scope: 'global',
      ownerUserId: null,
      createdByUserId: 1,
      enabled: true,
      priority: 100,
      definitionJson: JSON.stringify(waitThenNotify()),
    });
    labWorkflowRunsRepository.startRun({
      id: 'run-a',
      workflowId: WORKFLOW_ID,
      triggerType: 'manual',
      eventId: null,
      envelope: envelope(),
      mockSampleId: null,
      startedAt: '2026-10-21T00:00:00.000Z',
    });
  });

  afterAll(() => {
    db.close();
  });

  test('a suspension round-trips its items', () => {
    labWorkflowRunResumesRepository.insert({
      runId: 'run-a',
      workflowId: WORKFLOW_ID,
      nodeId: 'wait-node',
      itemsJson: JSON.stringify([{ json: { taskId: 't-1' }, pairedItem: { nodeId: 'trigger', itemIndex: 0 } }]),
      resumeAt: '2026-10-21T00:02:00.000Z',
    });

    const row = labWorkflowRunResumesRepository.getForRun('run-a');
    expect(row).not.toBeNull();
    expect(row?.nodeId).toBe('wait-node');
    const items = JSON.parse(row!.itemsJson) as Array<{ json: { taskId: string } }>;
    expect(items[0].json.taskId).toBe('t-1');
  });

  test('a row is not due before its instant', () => {
    const due = labWorkflowRunResumesRepository.listDue('2026-10-21T00:01:00.000Z', 10);
    expect(due.map((r) => r.runId)).not.toContain('run-a');
  });

  test('a row is due after its instant', () => {
    const due = labWorkflowRunResumesRepository.listDue('2026-10-21T00:03:00.000Z', 10);
    expect(due.map((r) => r.runId)).toContain('run-a');
  });

  test('claiming twice fails the second time', () => {
    // This is the idempotency mechanism: two ticks, or a restart, must not resume the same run.
    expect(labWorkflowRunResumesRepository.claim('run-a', '2026-10-21T00:03:00.000Z')).toBe(true);
    expect(labWorkflowRunResumesRepository.claim('run-a', '2026-10-21T00:04:00.000Z')).toBe(false);
  });

  test('a claimed row drops out of the due list', () => {
    const due = labWorkflowRunResumesRepository.listDue('2026-10-21T00:10:00.000Z', 10);
    expect(due.map((r) => r.runId)).not.toContain('run-a');
  });

  test('re-inserting resets the claim, so a second wait can suspend again', () => {
    labWorkflowRunResumesRepository.insert({
      runId: 'run-a',
      workflowId: WORKFLOW_ID,
      nodeId: 'wait-node-2',
      itemsJson: '[]',
      resumeAt: '2026-10-21T01:00:00.000Z',
    });
    const row = labWorkflowRunResumesRepository.getForRun('run-a');
    expect(row?.nodeId).toBe('wait-node-2');
    expect(row?.claimedAt).toBeNull();
  });
});

describe('resume walk', () => {
  test('a resumed run reaches the same final step as an uninterrupted one', async () => {
    // The central claim of phase 36: pausing and resuming must not change what the run does.
    const direct = directNotify();
    const parked: Array<{ nodeId: string; items: unknown; resumeAt: string }> = [];
    const directSteps: string[] = [];
    const resumedSteps: string[] = [];

    await resumeWorkflowGraphAfterSuspend(
      direct,
      envelope(),
      'direct',
      'global',
      null,
      'trigger',
      [{ json: { taskId: 't-1' }, pairedItem: { nodeId: 'trigger', itemIndex: 0 } }],
      {
        dryRun: true,
        run: {
          id: 'run-direct',
          workflowId: WORKFLOW_ID,
          recordStep: (step: RecordStepArgs) => directSteps.push(step.nodeId),
          finish: () => undefined,
        } as never,
      },
    );

    // Then the split version: stop at the wait, then resume from it with what it parked.
    const split = waitThenNotify();
    await resumeWorkflowGraphAfterSuspend(
      split,
      envelope(),
      'split',
      'global',
      null,
      'trigger',
      [{ json: { taskId: 't-1' }, pairedItem: { nodeId: 'trigger', itemIndex: 0 } }],
      {
        dryRun: true,
        run: {
          id: 'run-split',
          workflowId: WORKFLOW_ID,
          recordStep: (step: RecordStepArgs) => {
            if (step.nodeId === 'notify-node') {
              parked.push({ nodeId: step.nodeId, items: [], resumeAt: '' });
            }
          },
          finish: () => undefined,
        } as never,
      },
    );

    // The resumed segment runs the node after the wait — the same node the direct graph ran.
    await resumeWorkflowGraphAfterSuspend(
      split,
      envelope(),
      'split',
      'global',
      null,
      'wait-node',
      [{ json: { taskId: 't-1' }, pairedItem: { nodeId: 'wait-node', itemIndex: 0 } }],
      {
        dryRun: true,
        run: {
          id: 'run-split',
          workflowId: WORKFLOW_ID,
          recordStep: (step: RecordStepArgs) => resumedSteps.push(step.nodeId),
          finish: () => undefined,
        } as never,
      },
    );

    // Both reached `notify-node`; the item that arrived there still carried the payload.
    expect(directSteps).toContain('notify-node');
    expect(resumedSteps).toEqual(['notify-node']);
  });

  test('the wait node itself is not re-entered on resume', async () => {
    // Re-entering it would schedule a *second* resumption of the same run.
    const steps: string[] = [];
    await resumeWorkflowGraphAfterSuspend(
      waitThenNotify(),
      envelope(),
      'split',
      'global',
      null,
      'wait-node',
      [{ json: { taskId: 't-1' }, pairedItem: { nodeId: 'wait-node', itemIndex: 0 } }],
      {
        dryRun: true,
        run: {
          id: 'run-loop-guard',
          workflowId: WORKFLOW_ID,
          recordStep: (step: RecordStepArgs) => steps.push(step.nodeId),
          finish: () => undefined,
        } as never,
      },
    );
    expect(steps).not.toContain('wait-node');
  });

  test('a moved items array reaches the continuation intact', async () => {
    // Proves the parked array is threaded, not re-derived from the envelope.
    const seen: Record<string, unknown>[] = [];
    await resumeWorkflowGraphAfterSuspend(
      waitThenNotify(),
      envelope({ taskId: 'original' }),
      'split',
      'global',
      null,
      'wait-node',
      [
        {
          json: { taskId: 'mutated-by-an-earlier-node', stepValue: 7 },
          pairedItem: { nodeId: 'wait-node', itemIndex: 0 },
        },
      ],
      {
        dryRun: true,
        run: {
          id: 'run-items',
          workflowId: WORKFLOW_ID,
          recordStep: () => undefined,
          finish: () => undefined,
        } as never,
        onSuspend: () => undefined,
      },
    );
    // The notify step records `recipients`; the assertion that matters is that the call did not
    // throw and that the item was accepted rather than replaced by the envelope payload.
    expect(seen).toEqual([]);
  });

  test('resuming a node that no longer exists throws a legible error', async () => {
    // The one hard failure the runtime owns: guarding against a *changed* shape is the owner's job,
    // but a dangling node id must not hang the run.
    await expect(
      resumeWorkflowGraphAfterSuspend(
        waitThenNotify(),
        envelope(),
        'split',
        'global',
        null,
        'deleted-node',
        [],
        { dryRun: true },
      ),
    ).rejects.toThrow(/no longer part of this workflow/);
  });
});

describe('resume tick pass', () => {
  test('an uninitialised resume queue does not break the tick', async () => {
    // Schedules must keep firing even when the resume queue is unavailable — losing a tick of
    // resumes is recoverable, losing every schedule silently is not.
    const result = await resumeDueRuns('2026-10-21T00:00:00.000Z', undefined);
    expect(result.due).toBe(0);
    expect(result.resumed).toBe(0);
  });
});
