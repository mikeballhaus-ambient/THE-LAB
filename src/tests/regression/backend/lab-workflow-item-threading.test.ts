import { afterAll, beforeAll, describe, expect, test } from '@jest/globals';
import betterSqlite3 from 'better-sqlite3';
import { randomUUID } from 'node:crypto';
import { createUsersTable } from '@/backend/db/Auth/auth-schema';
import { labEventsRepository } from '@/backend/db/LabEvents/lab-events-repository';
import { labWorkflowsRepository } from '@/backend/db/LabWorkflows/lab-workflows-repository';
import { labWorkflowRunsRepository } from '@/backend/db/LabWorkflows/lab-workflow-runs-repository';
import { evaluateWorkflowGraphForDomainEvent } from '@/backend/lab-workflows/lab-workflow-graph-evaluator';
import { executeActionGroupMembers } from '@/backend/lab-workflows/lab-workflow-graph-group-runtime';
import { beginWorkflowRun } from '@/backend/lab-workflows/lab-workflow-run-recorder';
import type { LabDomainEventEnvelopeV1 } from '@/shared/types/lab-domain-event';
import type { LabWorkflowDefinitionV2 } from '@/shared/types/lab-workflow-graph';
import { LAB_WORKFLOW_GRAPH_SCHEMA_VERSION } from '@/shared/types/lab-workflow-graph';
import type { LabWorkflowItem } from '@/shared/types/lab-workflow-items';

/**
 * The test that would have caught D4.
 *
 * W0 adopted the item-array contract, and every test that exercised a node **directly** passed —
 * because those tests called `runWorkflowStep()` themselves and read `outcome.output.items`. The
 * graph evaluator, however, never passed items in and never forwarded them out, so a value written
 * by one node was unreadable by the next. A single-action-node demo graph could not reveal it.
 *
 * Three shapes are asserted, because they fail independently:
 *
 * 1. **End to end** — node 1 writes, node 2 and 3 read, through `evaluateWorkflowGraphForDomainEvent`.
 * 2. **Through a decision node** — a rule between two data nodes must pass items through unchanged,
 *    or every transform only works when it is first in the chain.
 * 3. **Per item** — an action group fed three items composes member by member, so the reading is
 *    genuinely per-row rather than "a single payload happened to carry the field".
 */

const WORKFLOW_ID = 'e6a00002-0002-4002-8002-0000000000a6';
const TRIGGER_EVENT = 'app-lab-tasklist.task.created';

describe('item threading through the graph evaluator (W6a)', () => {
  let db: betterSqlite3.Database;

  beforeAll(async () => {
    db = betterSqlite3(':memory:');
    db.exec(createUsersTable);
    db.prepare(
      `INSERT INTO users (id, email, name, role, status) VALUES (1, 'a@test', 'Admin', 'admin', 'active')`,
    ).run();
    for (const id of [2, 3, 4]) {
      db.prepare(
        `INSERT INTO users (id, email, name, role, status) VALUES (?, ?, ?, 'member', 'active')`,
      ).run(id, `u${id}@test`, `User ${id}`);
    }

    await labEventsRepository.bootstrap(db);
    await labWorkflowsRepository.bootstrap(db);
    await labWorkflowRunsRepository.bootstrap(db);

    labWorkflowsRepository.insertWorkflow({
      id: WORKFLOW_ID,
      name: 'Item threading fixture',
      description: null,
      scope: 'global',
      ownerUserId: null,
      createdByUserId: 1,
      enabled: true,
      priority: 100,
      // Stored so the evaluator's run handle has a workflow to record against; each test passes its
      // own definition directly, which is what the assertion is about.
      definitionJson: JSON.stringify({
        schemaVersion: LAB_WORKFLOW_GRAPH_SCHEMA_VERSION,
        nodes: [
          { id: 'n-trigger', kind: 'trigger', position: { x: 0, y: 0 }, eventType: TRIGGER_EVENT },
        ],
        edges: [],
      }),
    });
  });

  afterAll(() => {
    db.close();
  });

  /**
   * Build an envelope **and persist it**.
   *
   * `lab_user_notifications.event_id` is a foreign key into `lab_domain_events`, so a node-level
   * test that notifies must publish the event first — a trap already recorded in the handoff.
   */
  async function envelope(
    overrides: Partial<LabDomainEventEnvelopeV1['payload']> = {},
  ): Promise<LabDomainEventEnvelopeV1> {
    const env: LabDomainEventEnvelopeV1 = {
      schemaVersion: 1,
      id: randomUUID(),
      type: TRIGGER_EVENT,
      sourceAppId: 'app-lab-tasklist',
      occurredAt: new Date().toISOString(),
      actorUserId: 1,
      payload: { assigneeId: '2', title: 'Batch', ...overrides },
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

  function latestNotification(userId: number): { title: string } | undefined {
    return db
      .prepare('SELECT title FROM lab_user_notifications WHERE user_id = ? ORDER BY rowid DESC LIMIT 1')
      .get(userId) as { title: string } | undefined;
  }

  test('a field written by one node is readable by the next', async () => {
    const definition: LabWorkflowDefinitionV2 = {
      schemaVersion: LAB_WORKFLOW_GRAPH_SCHEMA_VERSION,
      nodes: [
        { id: 'n-trigger', kind: 'trigger', position: { x: 0, y: 0 }, eventType: TRIGGER_EVENT },
        {
          id: 'n-write',
          kind: 'action',
          position: { x: 0, y: 100 },
          step: {
            kind: 'set_fields',
            fields: [{ path: 'stamp', source: 'literal', value: 'from-node-1' }],
          },
        },
        {
          id: 'n-read',
          kind: 'action',
          position: { x: 0, y: 200 },
          // Copy `stamp` forward. Before W6a this resolved to undefined, because the evaluator
          // re-read the raw envelope payload at every node.
          step: {
            kind: 'set_fields',
            fields: [{ path: 'copy', source: 'from_payload', value: 'stamp' }],
          },
        },
        {
          id: 'n-notify',
          kind: 'action',
          position: { x: 0, y: 300 },
          step: {
            kind: 'notify_users',
            userIds: [],
            path: 'assigneeId',
            message: { title: 'Copy is {{payload.copy}}' },
          },
        },
      ],
      edges: [
        { id: 'e1', source: 'n-trigger', target: 'n-write', when: 'always' },
        { id: 'e2', source: 'n-write', target: 'n-read', when: 'always' },
        { id: 'e3', source: 'n-read', target: 'n-notify', when: 'always' },
      ],
    };

    const env = await envelope();
    const run = beginWorkflowRun({ workflowId: WORKFLOW_ID, triggerType: 'event', envelope: env });

    await evaluateWorkflowGraphForDomainEvent(
      definition,
      env,
      'threading',
      'global',
      null,
      { run },
    );
    run.finish();

    expect(latestNotification(2)?.title).toBe('Copy is from-node-1');
  });

  test('a rule between two data nodes passes the items through unchanged', async () => {
    const definition: LabWorkflowDefinitionV2 = {
      schemaVersion: LAB_WORKFLOW_GRAPH_SCHEMA_VERSION,
      nodes: [
        { id: 'n-trigger', kind: 'trigger', position: { x: 0, y: 0 }, eventType: TRIGGER_EVENT },
        {
          id: 'n-write',
          kind: 'action',
          position: { x: 0, y: 100 },
          step: {
            kind: 'set_fields',
            fields: [{ path: 'carried', source: 'literal', value: 'yes' }],
          },
        },
        {
          id: 'n-rule',
          kind: 'rule',
          position: { x: 0, y: 200 },
          name: 'Has an assignee',
          conditions: [{ kind: 'payload_exists', path: 'assigneeId' }],
        },
        {
          id: 'n-read',
          kind: 'action',
          position: { x: 0, y: 300 },
          step: {
            kind: 'set_fields',
            fields: [{ path: 'copied', source: 'from_payload', value: 'carried' }],
          },
        },
        {
          id: 'n-notify',
          kind: 'action',
          position: { x: 0, y: 400 },
          step: {
            kind: 'notify_users',
            userIds: [],
            path: 'assigneeId',
            message: { title: 'Carried: {{payload.copied}}' },
          },
        },
      ],
      edges: [
        { id: 'e1', source: 'n-trigger', target: 'n-write', when: 'always' },
        { id: 'e2', source: 'n-write', target: 'n-rule', when: 'always' },
        { id: 'e3', source: 'n-rule', target: 'n-read', when: 'on_match' },
        { id: 'e4', source: 'n-read', target: 'n-notify', when: 'always' },
      ],
    };

    await evaluateWorkflowGraphForDomainEvent(
      definition,
      await envelope({ assigneeId: '3' }),
      'threading-through-rule',
      'global',
      null,
      {},
    );

    // If the rule reset the array to the envelope payload, `carried` would be gone and the template
    // would render 'Carried: '.
    expect(latestNotification(3)?.title).toBe('Carried: yes');
  });

  test('a sequential action group composes per item — three items, three results', async () => {
    const definition: LabWorkflowDefinitionV2 = {
      schemaVersion: LAB_WORKFLOW_GRAPH_SCHEMA_VERSION,
      nodes: [
        { id: 'n-trigger', kind: 'trigger', position: { x: 0, y: 0 }, eventType: TRIGGER_EVENT },
        {
          id: 'g-actions',
          kind: 'group',
          position: { x: 0, y: 100 },
          label: 'Shape rows',
          groupType: 'actions',
          executionMode: 'sequential',
          failurePolicy: 'stop',
        },
        {
          id: 'a-stamp',
          kind: 'action',
          groupId: 'g-actions',
          position: { x: 0, y: 100 },
          step: {
            kind: 'set_fields',
            fields: [{ path: 'stamp', source: 'literal', value: 'v1' }],
          },
        },
        {
          id: 'a-copy',
          kind: 'action',
          groupId: 'g-actions',
          position: { x: 0, y: 120 },
          step: {
            kind: 'set_fields',
            fields: [{ path: 'copy', source: 'from_payload', value: 'stamp' }],
          },
        },
      ],
      edges: [
        { id: 'e1', source: 'n-trigger', target: 'g-actions', when: 'always' },
      ],
    };

    const inputItems: LabWorkflowItem[] = [
      { json: { id: 'row-1' }, pairedItem: { nodeId: 'n-trigger', itemIndex: 0 } },
      { json: { id: 'row-2' }, pairedItem: { nodeId: 'n-trigger', itemIndex: 1 } },
      { json: { id: 'row-3' }, pairedItem: { nodeId: 'n-trigger', itemIndex: 2 } },
    ];

    const group = definition.nodes.find((n) => n.kind === 'group');
    if (!group || group.kind !== 'group') {
      throw new Error('fixture is missing its group node');
    }

    const output = await executeActionGroupMembers(
      definition,
      group,
      await envelope(),
      'group-threading',
      {},
      inputItems,
    );

    expect(output.items).toHaveLength(3);
    // Per item: the second member read the first member's write, three times over.
    expect(output.items.map((item) => item.json.copy)).toEqual(['v1', 'v1', 'v1']);
    expect(output.items.map((item) => item.json.id)).toEqual(['row-1', 'row-2', 'row-3']);
  });

  test('a filter reduces what the next node sees', async () => {
    const definition: LabWorkflowDefinitionV2 = {
      schemaVersion: LAB_WORKFLOW_GRAPH_SCHEMA_VERSION,
      nodes: [
        { id: 'n-trigger', kind: 'trigger', position: { x: 0, y: 0 }, eventType: TRIGGER_EVENT },
        {
          id: 'n-filter',
          kind: 'action',
          position: { x: 0, y: 100 },
          step: {
            kind: 'filter_items',
            conditions: [{ kind: 'payload_equals', path: 'assigneeId', value: '2' }],
          },
        },
        {
          id: 'n-notify',
          kind: 'action',
          position: { x: 0, y: 200 },
          step: {
            kind: 'notify_users',
            userIds: [],
            path: 'assigneeId',
            message: { title: 'Survived' },
          },
        },
      ],
      edges: [
        { id: 'e1', source: 'n-trigger', target: 'n-filter', when: 'always' },
        { id: 'e2', source: 'n-filter', target: 'n-notify', when: 'always' },
      ],
    };

    const before = (db.prepare('SELECT COUNT(*) AS c FROM lab_user_notifications').get() as { c: number }).c;

    await evaluateWorkflowGraphForDomainEvent(
      definition,
      await envelope({ assigneeId: '4' }),
      'filter-drop',
      'global',
      null,
      {},
    );

    const after = (db.prepare('SELECT COUNT(*) AS c FROM lab_user_notifications').get() as { c: number }).c;
    // The filtered-out item must not reach the notify node: no new notification for user 4.
    expect(after).toBe(before);
    expect(latestNotification(4)).toBeUndefined();
  });

  test('the run row reports real item counts for the trigger', async () => {
    const run = db
      .prepare('SELECT id FROM lab_workflow_runs ORDER BY rowid DESC LIMIT 1')
      .get() as { id: string } | undefined;
    expect(run?.id).toBeTruthy();
    const trigger = db
      .prepare(
        'SELECT items_in_count, items_out_count FROM lab_workflow_run_steps WHERE run_id = ? AND node_id = ?',
      )
      .get(run?.id, 'n-trigger') as { items_in_count: number; items_out_count: number } | undefined;
    expect(trigger?.items_in_count).toBe(1);
    expect(trigger?.items_out_count).toBe(1);
  });
});
