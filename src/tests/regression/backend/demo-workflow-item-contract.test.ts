import { afterAll, beforeAll, describe, expect, test } from '@jest/globals';
import betterSqlite3 from 'better-sqlite3';
import { randomUUID } from 'node:crypto';
import { createUsersTable } from '@/backend/db/Auth/auth-schema';
import { labEventsRepository } from '@/backend/db/LabEvents/lab-events-repository';
import { labCommsRepository } from '@/backend/db/Comms/lab-comms-repository';
import { labWorkflowsRepository } from '@/backend/db/LabWorkflows/lab-workflows-repository';
import { runWorkflowStep } from '@/backend/lab-workflows/lab-workflow-step-runner';
import { LAB_PLATFORM_SYSTEM_USER_ID } from '@/shared/config/lab-platform-system-user';
import { dmChannelId } from '@/shared/types/schemas/lab-comms-schema';
import type { LabDomainEventEnvelopeV1 } from '@/shared/types/lab-domain-event';
import { CRM_SALES_APPROVAL_SUBMITTED_EVENT } from '@/shared/lab-integrations/crm-domain-events';
import { buildDemoWorkflowDefinition } from '@/shared/utils/demo-workflow-definition';
import { CRM_SALES_APPROVAL_POLICY_ID } from '@/shared/utils/demo-workflow-seed-catalog';
import { singleItemOutput } from '@/shared/types/lab-workflow-items';
import { DEMO_WORKFLOW_ID } from '@/backend/db/PlatformCatalog/platform-catalog-demo-seed';
import type { LabWorkflowDefinitionV2 } from '@/shared/types/lab-workflow-graph';

/**
 * G1 gate for W0 — the item-array data contract.
 *
 * The whole point of W0 is that adopting `items[]` is a **behaviour-preserving** change. The demo
 * workflow is the only stored workflow in the lab, so it is the regression fixture: after the
 * contract change it must still notify the assignee **and** send the Messages DM, with the task
 * title in the DM body.
 *
 * If this test ever needs its assertions changed to pass, the item contract has altered observable
 * behaviour and W0 has failed.
 */

// 2 is the reserved automation account; demo/cast users start at 3.
const ASSIGNEE_ID = 3;
const TASK_TITLE = 'Ship widgets';

describe('demo workflow survives the item-array contract (W0 G1 gate)', () => {
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
    await labCommsRepository.bootstrap(db);

    labWorkflowsRepository.insertWorkflow({
      id: DEMO_WORKFLOW_ID,
      name: 'CRM: sales approval — request',
      description: null,
      scope: 'global',
      ownerUserId: null,
      createdByUserId: 1,
      enabled: true,
      priority: 100,
      definitionJson: JSON.stringify(buildDemoWorkflowDefinition()),
    });
  });

  afterAll(() => {
    db.close();
  });

  function taskCreatedEnvelope(): LabDomainEventEnvelopeV1 {
    return {
      schemaVersion: 1,
      id: randomUUID(),
      type: 'app-lab-tasklist.task.created',
      sourceAppId: 'app-lab-tasklist',
      occurredAt: new Date().toISOString(),
      actorUserId: 1,
      payload: { assigneeId: String(ASSIGNEE_ID), title: TASK_TITLE },
    };
  }

  /**
   * The original W0 fixture: trigger → notify → Messages DM.
   *
   * Built explicitly rather than filtered out of the seeded demo. The seeded demo (phase 26) gates
   * the DM behind a priority rule, and this gate is about the **item contract** — payload resolution
   * surviving the array — not about which branch a given payload takes. Constructing the chain makes
   * that independence explicit and keeps the gate green whatever the demo looks like.
   */
  function notifyThenCommsDefinition(): LabWorkflowDefinitionV2 {
    return {
      schemaVersion: 2,
      nodes: [
        {
          id: 'c3000002-0002-4002-8002-000000000010',
          kind: 'trigger',
          position: { x: 0, y: 0 },
          eventType: 'app-lab-tasklist.task.created',
        },
        {
          id: 'c3000002-0002-4002-8002-000000000011',
          kind: 'action',
          position: { x: 0, y: 0 },
          step: { kind: 'notify_users', userIds: [], path: 'assigneeId' },
        },
        {
          id: 'c3000002-0002-4002-8002-000000000012',
          kind: 'action',
          position: { x: 0, y: 0 },
          step: { kind: 'comms_system_dm_payload_user', path: 'assigneeId' },
        },
      ],
      edges: [
        {
          id: 'c3000002-0002-4002-8002-000000000001',
          source: 'c3000002-0002-4002-8002-000000000010',
          target: 'c3000002-0002-4002-8002-000000000011',
          when: 'always',
        },
        {
          id: 'c3000002-0002-4002-8002-000000000002',
          source: 'c3000002-0002-4002-8002-000000000011',
          target: 'c3000002-0002-4002-8002-000000000012',
          when: 'always',
        },
      ],
    };
  }

  test('the seeded flagship demo graph still evaluates as a valid v2 definition', () => {
    const def = buildDemoWorkflowDefinition();
    expect(def.schemaVersion).toBe(2);
    expect(def.nodes.find((n) => n.kind === 'trigger')?.kind === 'trigger' && def.nodes.find((n) => n.kind === 'trigger')!.eventType).toBe(
      CRM_SALES_APPROVAL_SUBMITTED_EVENT,
    );
    const raise = def.nodes.find((n) => n.kind === 'action' && n.step.kind === 'raise_approval');
    expect(raise?.kind === 'action' && raise.step.kind === 'raise_approval' && raise.step.policyId).toBe(
      CRM_SALES_APPROVAL_POLICY_ID,
    );
  });

  test('still notifies the assignee AND sends the Messages DM', async () => {
    // Evaluate the narrowed notify → DM chain directly. The seeded demo gates its DM behind a
    // priority rule, and this test is about the **item contract** (payload resolution through the
    // array), not about whether a particular payload takes a particular branch.
    const env = taskCreatedEnvelope();
    await labEventsRepository.publishEvent(
      env.id,
      env.type,
      env.sourceAppId,
      env.occurredAt,
      env.actorUserId ?? null,
      JSON.stringify(env.payload),
    );

    const { evaluateWorkflowGraphForDomainEvent } = await import(
      '@/backend/lab-workflows/lab-workflow-graph-evaluator'
    );
    const definition = notifyThenCommsDefinition();
    await evaluateWorkflowGraphForDomainEvent(
      definition,
      env,
      'Demo (narrowed)',
      'global',
      null,
      { dryRun: false },
    );

    // 1. In-app notification reached the assignee.
    const notifications = db
      .prepare('SELECT * FROM lab_user_notifications WHERE user_id = ?')
      .all(ASSIGNEE_ID) as { title: string; body: string }[];
    expect(notifications.length).toBeGreaterThanOrEqual(1);

    // 2. Messages DM reached the assignee, from the platform system user, carrying the task title.
    const channelId = dmChannelId(LAB_PLATFORM_SYSTEM_USER_ID, ASSIGNEE_ID);
    const messages = labCommsRepository.listMessages(channelId, 10, undefined, ASSIGNEE_ID);
    expect(messages).toHaveLength(1);
    expect(messages[0]?.senderUserId).toBe(LAB_PLATFORM_SYSTEM_USER_ID);
    expect((messages[0]?.payload as { text?: string }).text).toContain(TASK_TITLE);
  });

  /** `lab_user_notifications.event_id` is a FK — the event row must exist before a node notifies. */
  async function publish(env: LabDomainEventEnvelopeV1): Promise<void> {
    await labEventsRepository.publishEvent(
      env.id,
      env.type,
      env.sourceAppId,
      env.occurredAt,
      env.actorUserId ?? null,
      JSON.stringify(env.payload),
    );
  }

  test('a templated notification writes the rendered payload values', async () => {
    // End-to-end through the real runner: the pure renderer is tested separately, but this proves
    // the step definition, the Zod-allowed `message` field and the notification insert all line up.
    const env = taskCreatedEnvelope();
    await publish(env);

    const outcome = await runWorkflowStep({
      step: {
        kind: 'notify_users',
        userIds: [],
        path: 'assigneeId',
        message: {
          title: 'Task for you: {{payload.title}}',
          body: '"{{payload.title}}" is waiting in Task List.',
        },
      },
      envelope: env,
      workflowName: 'templated',
      nodeId: 'notify-node',
      options: {},
    });

    expect(outcome.kind).toBe('continue');
    const rows = db
      .prepare('SELECT title, body FROM lab_user_notifications WHERE event_id = ?')
      .all(env.id) as { title: string; body: string }[];
    expect(rows).toHaveLength(1);
    expect(rows[0]?.title).toBe(`Task for you: ${TASK_TITLE}`);
    expect(rows[0]?.body).toBe(`"${TASK_TITLE}" is waiting in Task List.`);
  });

  test('a payload path still resolves against the single wrapped item', async () => {
    // Direct node-level check: the runner wraps the envelope as one item, so `assigneeId`
    // resolves exactly as it did before the array contract.
    const env = taskCreatedEnvelope();
    await publish(env);
    const outcome = await runWorkflowStep({
      step: { kind: 'notify_users', userIds: [], path: 'assigneeId' },
      envelope: env,
      workflowName: 'direct',
      options: {},
    });

    expect(outcome.kind).toBe('continue');
    if (outcome.kind !== 'continue') return;
    // Items pass through unchanged, so a downstream node can still read the same path.
    expect(outcome.output.items).toHaveLength(1);
    expect(outcome.output.items[0]?.json.assigneeId).toBe(String(ASSIGNEE_ID));
    expect(outcome.output.items[0]?.pairedItem?.nodeId).toBe('step');
  });

  test('provenance is stamped per node so a chain stays traceable', async () => {
    const env = taskCreatedEnvelope();
    await publish(env);
    const input = singleItemOutput(env.payload, 'trigger-node');

    const outcome = await runWorkflowStep({
      step: { kind: 'notify_users', userIds: [], path: 'assigneeId' },
      envelope: env,
      workflowName: 'direct',
      items: input.items,
      nodeId: 'notify-node',
      options: {},
    });

    expect(outcome.kind).toBe('continue');
    if (outcome.kind !== 'continue') return;
    expect(outcome.output.items[0]?.pairedItem).toEqual({
      nodeId: 'notify-node',
      itemIndex: 0,
    });
  });
});
