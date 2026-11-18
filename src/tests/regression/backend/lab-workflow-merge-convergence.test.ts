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
import type {
  LabWorkflowDefinitionV2,
  LabWorkflowGraphEdgeV2,
  LabWorkflowGraphNodeV2,
} from '@/shared/types/lab-workflow-graph';
import { LAB_WORKFLOW_GRAPH_SCHEMA_VERSION } from '@/shared/types/lab-workflow-graph';
import type { LabWorkflowStepV1 } from '@/shared/types/lab-workflow';
import {
  WF_MERGE_EDGE,
  WF_MERGE_GATE,
  WF_MERGE_LEFT,
  WF_MERGE_MERGE,
  WF_MERGE_RIGHT,
  WF_MERGE_SINK,
  WF_MERGE_SPLIT,
  WF_MERGE_TRIGGER,
} from '../lab-workflow-graph-fixture-ids';

/**
 * W7b — the convergence pass, end to end.
 *
 * The walker is depth-first and carries one item array down one path, so a merge cannot run when the
 * first branch arrives: it would see one branch and call it a join. These tests are the ones that
 * fail if the buffer is removed, because each asserts something only the **union** of branches can
 * produce.
 *
 * The graph under test is the canonical one — three rows, split into kept and dropped halves,
 * enriched separately, then rejoined. The observable is the number of notifications the sink sends,
 * because a notification is one per item: N notifications means N merged rows, which is exactly the
 * question a merge has to answer.
 *
 * The final test is the one that matters most in production: a branch that never runs must not hang
 * the walk. A hang inside a workflow is invisible — no timeout, no error row, just a run that never
 * finishes.
 */

const WORKFLOW_ID = 'e6b00003-0003-4003-8003-0000000000b7';
const TRIGGER_EVENT = 'app-lab-tasklist.task.created';
const RECIPIENT = 2;

const NODE = {
  trigger: WF_MERGE_TRIGGER,
  split: WF_MERGE_SPLIT,
  gate: WF_MERGE_GATE,
  left: WF_MERGE_LEFT,
  right: WF_MERGE_RIGHT,
  merge: WF_MERGE_MERGE,
  sink: WF_MERGE_SINK,
};

describe('merge convergence in the graph walker (W7b)', () => {
  let db: betterSqlite3.Database;

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

    labWorkflowsRepository.insertWorkflow({
      id: WORKFLOW_ID,
      name: 'Merge convergence fixture',
      description: null,
      scope: 'global',
      ownerUserId: null,
      createdByUserId: 1,
      enabled: true,
      priority: 100,
      definitionJson: JSON.stringify({
        schemaVersion: LAB_WORKFLOW_GRAPH_SCHEMA_VERSION,
        nodes: [
          { id: NODE.trigger, kind: 'trigger', position: { x: 0, y: 0 }, eventType: TRIGGER_EVENT },
        ],
        edges: [],
      }),
    });
  });

  afterAll(() => {
    db.close();
  });

  function notificationCount(eventId: string): number {
    const row = db
      .prepare('SELECT COUNT(*) AS n FROM lab_user_notifications WHERE event_id = ? AND user_id = ?')
      .get(eventId, RECIPIENT) as { n: number };
    return row.n;
  }

  async function envelope(rows: Record<string, unknown>[]): Promise<LabDomainEventEnvelopeV1> {
    const env: LabDomainEventEnvelopeV1 = {
      schemaVersion: 1,
      id: randomUUID(),
      type: TRIGGER_EVENT,
      sourceAppId: 'app-lab-tasklist',
      occurredAt: new Date().toISOString(),
      actorUserId: 1,
      payload: { rows },
    };
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
   * trigger → split out → IF (2 ports) → enrich each half → merge → notify per merged row.
   *
   * `merge` sits behind two incoming edges, which is the only shape that exercises the buffer.
   */
  function graph(mergeStep: LabWorkflowStepV1): LabWorkflowDefinitionV2 {
    const nodes: LabWorkflowGraphNodeV2[] = [
      { id: NODE.trigger, kind: 'trigger', position: { x: 0, y: 0 }, eventType: TRIGGER_EVENT },
      {
        id: NODE.split,
        kind: 'action',
        position: { x: 1, y: 0 },
        step: {
          kind: 'split_out',
          path: 'rows',
          targetPath: undefined,
          includeOtherFields: false,
        },
      },
      {
        id: NODE.gate,
        kind: 'action',
        position: { x: 2, y: 0 },
        step: {
          kind: 'if_condition',
          conditions: [{ kind: 'payload_equals', path: 'keep', value: true }],
        },
      },
      {
        id: NODE.left,
        kind: 'action',
        position: { x: 3, y: -60 },
        step: { kind: 'set_fields', fields: [{ path: 'side', source: 'literal', value: 'kept' }] },
      },
      {
        id: NODE.right,
        kind: 'action',
        position: { x: 3, y: 60 },
        step: { kind: 'set_fields', fields: [{ path: 'side', source: 'literal', value: 'dropped' }] },
      },
      { id: NODE.merge, kind: 'action', position: { x: 4, y: 0 }, step: mergeStep },
      {
        id: NODE.sink,
        kind: 'action',
        position: { x: 5, y: 0 },
        step: { kind: 'notify_users', userIds: [], path: 'assigneeId', message: { title: 'merged' } },
      },
    ];
    const edges: LabWorkflowGraphEdgeV2[] = [
      { id: WF_MERGE_EDGE.triggerSplit, source: NODE.trigger, target: NODE.split, when: 'always' },
      { id: WF_MERGE_EDGE.splitGate, source: NODE.split, target: NODE.gate, when: 'always' },
      { id: WF_MERGE_EDGE.gateLeft, source: NODE.gate, target: NODE.left, when: 'always', outputIndex: 0 },
      { id: WF_MERGE_EDGE.gateRight, source: NODE.gate, target: NODE.right, when: 'always', outputIndex: 1 },
      { id: WF_MERGE_EDGE.leftMerge, source: NODE.left, target: NODE.merge, when: 'always' },
      { id: WF_MERGE_EDGE.rightMerge, source: NODE.right, target: NODE.merge, when: 'always' },
      { id: WF_MERGE_EDGE.mergeSink, source: NODE.merge, target: NODE.sink, when: 'always' },
    ];
    return { schemaVersion: LAB_WORKFLOW_GRAPH_SCHEMA_VERSION, nodes, edges };
  }

  /** Three rows: two kept, one dropped. */
  function threeRows(): Record<string, unknown>[] {
    return [
      { id: 'a', keep: true, assigneeId: String(RECIPIENT) },
      { id: 'b', keep: false, assigneeId: String(RECIPIENT) },
      { id: 'c', keep: true, assigneeId: String(RECIPIENT) },
    ];
  }

  async function runGraph(
    definition: LabWorkflowDefinitionV2,
    env: LabDomainEventEnvelopeV1,
  ): Promise<{ runId: string }> {
    const run = beginWorkflowRun({ workflowId: WORKFLOW_ID, triggerType: 'event', envelope: env });
    await evaluateWorkflowGraphForDomainEvent(definition, env, 'merge', 'global', null, { run });
    run.finish();
    return { runId: run.id };
  }

  function stepRows(runId: string): {
    node_id: string;
    items_in_count: number;
    items_out_count: number;
    detail_json: string | null;
  }[] {
    // `detail_json`, not `detail`: the repository stores the node's report as JSON text and parses it
    // on read, so a direct SQL assertion has to parse it too.
    return db
      .prepare(
        'SELECT node_id, items_in_count, items_out_count, detail_json FROM lab_workflow_run_steps WHERE run_id = ? ORDER BY rowid',
      )
      .all(runId) as {
        node_id: string;
        items_in_count: number;
        items_out_count: number;
        detail_json: string | null;
      }[];
  }

  test('split out feeds three rows into the IF, which fans them onto both ports', async () => {
    const env = await envelope(threeRows());
    const { runId } = await runGraph(graph({ kind: 'merge_items', mode: 'append' }), env);
    const rows = stepRows(runId);

    // Split Out: 1 envelope item → 3 rows. Without this, later counts would be meaningless.
    expect(rows.find((row) => row.node_id === NODE.split)?.items_out_count).toBe(3);
    // Both branches run, each with its own subset — 2 kept, 1 dropped.
    expect(rows.find((row) => row.node_id === NODE.left)?.items_in_count).toBe(2);
    expect(rows.find((row) => row.node_id === NODE.right)?.items_in_count).toBe(1);
  });

  test('append rejoins both branches and runs exactly once', async () => {
    const env = await envelope(threeRows());
    const { runId } = await runGraph(graph({ kind: 'merge_items', mode: 'append' }), env);
    const mergeRows = stepRows(runId).filter((row) => row.node_id === NODE.merge);

    // Once, not once per arrival: the second arrival must not re-run the node with only its branch.
    expect(mergeRows).toHaveLength(1);
    expect(mergeRows[0]?.items_in_count).toBe(3);
    expect(mergeRows[0]?.items_out_count).toBe(3);
    // Same assignee on every row: notify_users unions path recipients, so one person → one notification.
    expect(notificationCount(env.id)).toBe(1);
  });

  test('by_index pairs the two branches and drops the unpairable row by default', async () => {
    const env = await envelope(threeRows());
    const { runId } = await runGraph(graph({ kind: 'merge_items', mode: 'by_index' }), env);
    const merge = stepRows(runId).find((row) => row.node_id === NODE.merge);

    // Left has 2 rows, right has 1: one pair, one orphan dropped.
    expect(merge?.items_out_count).toBe(1);
    expect(merge?.detail_json).toContain('unmatched');
    // Notifications are **not** asserted here. A by-index row is nested per branch
    // (`{"0": {...}, "1": {...}}`) so `assigneeId` is one level down and the sink's path resolves
    // nothing — which is the intended shape, not a bug: nesting is what stops two branches with a
    // shared field name from overwriting each other. The row count is the assertion that matters.
    expect(notificationCount(env.id)).toBe(0);
  });

  test('by_index with includeUnpaired keeps the orphan', async () => {
    const env = await envelope(threeRows());
    const { runId } = await runGraph(
      graph({ kind: 'merge_items', mode: 'by_index', includeUnpaired: true }),
      env,
    );
    expect(stepRows(runId).find((row) => row.node_id === NODE.merge)?.items_out_count).toBe(2);
  });

  test('by_key that matches nothing produces no rows and reports the unmatched count', async () => {
    // The branches hold disjoint ids by construction (a/c on one side, b on the other), so an inner
    // join is empty. A run panel that only said "succeeded" would hide a join that never worked.
    const env = await envelope(threeRows());
    const { runId } = await runGraph(
      graph({ kind: 'merge_items', mode: 'by_key', keyPath: 'id' }),
      env,
    );
    const merge = stepRows(runId).find((row) => row.node_id === NODE.merge);
    expect(merge?.items_out_count).toBe(0);
    expect(notificationCount(env.id)).toBe(0);
    const detail = JSON.parse(merge?.detail_json ?? '{}') as { unmatched?: number; pairs?: number };
    expect(detail.unmatched).toBe(2);
    expect(detail.pairs).toBe(0);
  });

  test('by_key with includeUnpaired keeps both base rows', async () => {
    const env = await envelope(threeRows());
    const { runId } = await runGraph(
      graph({ kind: 'merge_items', mode: 'by_key', keyPath: 'id', includeUnpaired: true }),
      env,
    );
    expect(stepRows(runId).find((row) => row.node_id === NODE.merge)?.items_out_count).toBe(2);
  });

  test('a branch that never runs does not hang the run', async () => {
    // Every row fails the IF, so port 0 is never taken, `n-left` never runs and edge `e5` never
    // delivers. If the walker waited for it, this test would time out rather than fail.
    const env = await envelope([
      { id: 'x', keep: false, assigneeId: String(RECIPIENT) },
      { id: 'y', keep: false, assigneeId: String(RECIPIENT) },
    ]);
    const startedAt = Date.now();
    const { runId } = await runGraph(graph({ kind: 'merge_items', mode: 'append' }), env);
    expect(Date.now() - startedAt).toBeLessThan(5000);

    const merge = stepRows(runId).find((row) => row.node_id === NODE.merge);
    expect(merge?.items_out_count).toBe(2);
    expect(notificationCount(env.id)).toBe(1);
  });

  test('the node after the merge runs only after it', async () => {
    const env = await envelope(threeRows());
    const { runId } = await runGraph(graph({ kind: 'merge_items', mode: 'append' }), env);
    const ids = stepRows(runId).map((row) => row.node_id);
    expect(ids.indexOf(NODE.merge)).toBeGreaterThan(-1);
    expect(ids.indexOf(NODE.sink)).toBeGreaterThan(ids.indexOf(NODE.merge));
  });
});
