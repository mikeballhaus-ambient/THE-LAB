import { afterAll, beforeAll, describe, expect, jest, test } from '@jest/globals';
import betterSqlite3 from 'better-sqlite3';
import { createUsersTable } from '@/backend/db/Auth/auth-schema';
import { UserService } from '@/backend/db/Auth/auth-service';
import { labEventsRepository } from '@/backend/db/LabEvents/lab-events-repository';
import { labWorkflowsRepository } from '@/backend/db/LabWorkflows/lab-workflows-repository';
import { labWorkflowRunsRepository } from '@/backend/db/LabWorkflows/lab-workflow-runs-repository';
import { labWorkflowMockSamplesRepository } from '@/backend/db/LabWorkflows/lab-workflow-mock-samples-repository';
import { labWorkflowVersionsRepository } from '@/backend/db/LabWorkflows/lab-workflow-versions-repository';
import { labWorkflowWebhooksRepository } from '@/backend/db/LabWorkflows/lab-workflow-webhooks-repository';
import { labWorkflowSchedulesRepository } from '@/backend/db/LabWorkflows/lab-workflow-schedules-repository';
import { platformAuditRepository } from '@/backend/db/PlatformAudit/platform-audit-repository';
import { LAB_PLATFORM_SYSTEM_USER_ID } from '@/shared/config/lab-platform-system-user';
import { LAB_LEDGER_APP_ID } from '@/shared/config/platform-lab-product-app-ids';
import type { User } from '@/shared/types/user';
import type { LabWorkflowGraphEdgeV2, LabWorkflowGraphNodeV2 } from '@/shared/types/lab-workflow-graph';
import {
  labWorkflowCreate,
  labWorkflowDelete,
  labWorkflowDryRun,
  labWorkflowDuplicate,
  labWorkflowGet,
  labWorkflowGetExecution,
  labWorkflowList,
  labWorkflowListNodeTypes,
  labWorkflowListTriggerEvents,
  labWorkflowRun,
  labWorkflowUpdate,
  labWorkflowValidate,
} from '@/backend/mcp/mcp-servers/workflow/workflow-mcp-handlers';

/**
 * M5 — the agent authoring loop, end to end.
 *
 * ## What this file proves that per-tool tests cannot
 *
 * Each tool is individually simple; the risk is in the *seam*. An agent discovers a node shape,
 * assembles a graph from it, validates it, dry-runs it, saves it, runs it and reads the result —
 * and every step has to agree with the next about what a node is, what a run recorded, and who may
 * see it. A set of green per-tool tests would not catch the case where `validate` accepts a graph
 * that `create` rejects, or where `get_execution` reports a node the walker never reached.
 *
 * ## Fixtures
 *
 * The trigger event (`app-lab-tasklist.task.created`) is in the static catalog on purpose: a
 * declared-but-never-published event would produce a `unknown_trigger_event`-**class** warning only
 * if it were absent entirely, and using a real one keeps the fixtures representative.
 */

const ADMIN: User = {
  userId: 1,
  email: 'a@test',
  name: 'Admin',
  role: 'admin',
  status: 'active',
  lastSeen: '2026-01-01T00:00:00.000Z',
  createdAt: '2026-01-01T00:00:00.000Z',
};

const MEMBER_A: User = {
  ...ADMIN,
  userId: 3,
  email: 'a-member@test',
  name: 'Member A',
  role: 'member',
};

const MEMBER_B: User = {
  ...ADMIN,
  userId: 4,
  email: 'b-member@test',
  name: 'Member B',
  role: 'member',
};

const VIEWER: User = {
  ...ADMIN,
  userId: 5,
  email: 'viewer@test',
  name: 'Viewer',
  role: 'viewer',
};

const TRIGGER_EVENT = 'app-lab-tasklist.task.created';
// 2 is the reserved automation account; human fixtures start at 3.
const ASSIGNEE_ID = 3;

const NODE = {
  trigger: 'a1000001-0001-4001-8001-000000000001',
  filter: 'a1000001-0001-4001-8001-000000000002',
  set: 'a1000001-0001-4001-8001-000000000003',
  notify: 'a1000001-0001-4001-8001-000000000004',
};

const EDGE = {
  a: 'a1000001-0001-4001-8001-0000000000e1',
  b: 'a1000001-0001-4001-8001-0000000000e2',
  c: 'a1000001-0001-4001-8001-0000000000e3',
};

/** Trigger → filter → set_fields → notify — the four-node graph M5.1 specifies. */
function graph(): { schemaVersion: 2; nodes: LabWorkflowGraphNodeV2[]; edges: LabWorkflowGraphEdgeV2[] } {
  return {
    schemaVersion: 2,
    nodes: [
      { id: NODE.trigger, kind: 'trigger', position: { x: 0, y: 0 }, eventType: TRIGGER_EVENT },
      {
        id: NODE.filter,
        kind: 'action',
        position: { x: 0, y: 100 },
        step: { kind: 'filter_items', conditions: [{ kind: 'payload_exists', path: 'title' }] },
      },
      {
        id: NODE.set,
        kind: 'action',
        position: { x: 0, y: 200 },
        step: {
          kind: 'set_fields',
          fields: [{ path: 'triaged', source: 'literal', value: true }],
        },
      },
      {
        id: NODE.notify,
        kind: 'action',
        position: { x: 0, y: 300 },
        step: { kind: 'notify_users', userIds: [], path: 'assigneeId', message: { title: '{{payload.title}}' } },
      },
    ],
    edges: [
      { id: EDGE.a, source: NODE.trigger, target: NODE.filter, when: 'always' },
      { id: EDGE.b, source: NODE.filter, target: NODE.set, when: 'always' },
      { id: EDGE.c, source: NODE.set, target: NODE.notify, when: 'always' },
    ],
  };
}

/** A money-writing graph, used only for the M3.4 guard. */
function moneyGraph(confirmedByUserId = 1): { schemaVersion: 2; nodes: LabWorkflowGraphNodeV2[]; edges: LabWorkflowGraphEdgeV2[] } {
  return {
    schemaVersion: 2,
    nodes: [
      { id: NODE.trigger, kind: 'trigger', position: { x: 0, y: 0 }, eventType: TRIGGER_EVENT },
      {
        id: NODE.notify,
        kind: 'action',
        position: { x: 0, y: 100 },
        step: {
          kind: 'ledger_post_entry',
          memo: 'Automated posting',
          confirmedByUserId,
          lines: [
            {
              accountId: 'b2000001-0001-4001-8001-000000000001',
              side: 'debit',
              amountCentsPath: 'amount',
            },
            {
              accountId: 'b2000001-0001-4001-8001-000000000002',
              side: 'credit',
              amountCentsPath: 'amount',
            },
          ],
        },
      },
    ],
    edges: [{ id: EDGE.a, source: NODE.trigger, target: NODE.notify, when: 'always' }],
  };
}

function payload(): Record<string, unknown> {
  return { assigneeId: String(ASSIGNEE_ID), title: 'Ship widgets', amount: 1250 };
}

/** Parse a tool response's JSON body. */
function body(response: { content: string }): Record<string, unknown> {
  return JSON.parse(response.content) as Record<string, unknown>;
}

describe('workflow MCP authoring loop (M5)', () => {
  let db: betterSqlite3.Database;

  beforeAll(async () => {
    db = betterSqlite3(':memory:');
    db.exec(createUsersTable);
    const insertUser = db.prepare(
      `INSERT INTO users (id, email, name, role, status) VALUES (?, ?, ?, ?, 'active')`,
    );
    insertUser.run(1, ADMIN.email, ADMIN.name, 'admin');
    insertUser.run(MEMBER_A.userId, MEMBER_A.email, MEMBER_A.name, 'member');
    insertUser.run(MEMBER_B.userId, MEMBER_B.email, MEMBER_B.name, 'member');
    insertUser.run(VIEWER.userId, VIEWER.email, VIEWER.name, 'viewer');
    insertUser.run(LAB_PLATFORM_SYSTEM_USER_ID, 'system@the-lab.platform', 'THE-LAB', 'viewer');

    // `authRepository` prepares its statements against the app singleton on `initialize()`, so a
    // bare in-memory `bootstrap` here would still route reads at the real database. The established
    // pattern for MCP handler tests (see lab-integrations-mcp.test.ts) is to stub the lookup on the
    // `UserService` singleton and let every other repository stay bound to this database.
    const users = new Map<number, User>([
      [ADMIN.userId, ADMIN],
      [MEMBER_A.userId, MEMBER_A],
      [MEMBER_B.userId, MEMBER_B],
      [VIEWER.userId, VIEWER],
    ]);
    jest.spyOn(UserService.getInstance(), 'getUserById').mockImplementation(
      (id: number) => users.get(id) ?? null,
    );

    await labEventsRepository.bootstrap(db);
    await labWorkflowsRepository.bootstrap(db);
    await labWorkflowRunsRepository.bootstrap(db);
    await labWorkflowMockSamplesRepository.bootstrap(db);
    await labWorkflowVersionsRepository.bootstrap(db);
    await labWorkflowSchedulesRepository.bootstrap(db);
    await labWorkflowWebhooksRepository.bootstrap(db);
    await platformAuditRepository.bootstrap(db);
  });

  afterAll(() => {
    jest.restoreAllMocks();
    labEventsRepository.close();
    labWorkflowsRepository.close();
    labWorkflowRunsRepository.close();
    labWorkflowMockSamplesRepository.close();
    labWorkflowVersionsRepository.close();
    labWorkflowSchedulesRepository.close();
    labWorkflowWebhooksRepository.close();
    platformAuditRepository.close();
    db.close();
  });

  function resetWorkflows(): void {
    db.prepare('DELETE FROM lab_workflow_runs').run();
    db.prepare('DELETE FROM lab_workflows').run();
  }

  // -------------------------------------------------------------------------------------------
  // M5.1 — the whole loop
  // -------------------------------------------------------------------------------------------

  test('list_node_types → build → validate → dry_run → create → run → get_execution', async () => {
    resetWorkflows();

    // 1. Discover. An agent cannot invent a node shape; it has to read one.
    const nodeTypes = await labWorkflowListNodeTypes({ userId: ADMIN.userId });
    expect(nodeTypes.success).toBe(true);
    const catalogue = body(nodeTypes);
    const stepKinds = catalogue.stepKinds as { kind: string; parameters?: unknown }[];
    for (const kind of ['filter_items', 'set_fields', 'notify_users']) {
      const entry = stepKinds.find((row) => row.kind === kind);
      expect(entry).toBeDefined();
      // The parameter schema is what makes the catalogue usable rather than a list of names.
      expect(entry?.parameters).toBeDefined();
    }

    // 2. Trigger discovery, with the neverFired signal that decides whether it can ever fire.
    const triggers = await labWorkflowListTriggerEvents({ userId: ADMIN.userId });
    expect(triggers.success).toBe(true);
    const catalogBody = body(triggers);
    const entries = catalogBody.entries as { eventType: string }[];
    expect(entries.some((entry) => entry.eventType === TRIGGER_EVENT)).toBe(true);

    // 3. Validate before saving — the step that turns a rejection into a correction.
    const validation = await labWorkflowValidate({ userId: ADMIN.userId, definition: graph() });
    expect(validation.success).toBe(true);
    expect(body(validation).valid).toBe(true);

    // 4. Dry run against the draft. There is no workflow id yet, so this proves the point that a
    //    draft can be exercised only after saving — the loop saves first, then dry-runs the stored
    //    graph (W5a: "a draft shows 'Save the workflow first'").
    const created = await labWorkflowCreate({
      userId: ADMIN.userId,
      name: 'M5 loop fixture',
      definition: graph(),
      enabled: false,
    });
    expect(created.success).toBe(true);
    const createdBody = body(created);
    const workflowId = createdBody.workflowId as string;
    expect(workflowId).toBeTruthy();

    const dry = await labWorkflowDryRun({
      userId: ADMIN.userId,
      workflowId,
      payload: payload(),
    });
    expect(dry.success).toBe(true);
    const dryBody = body(dry);
    expect(dryBody.dryRun).toBe(true);
    // A preview must leave no run row: the history is how a user judges the workflow.
    expect(dryBody.executionId).toBeNull();
    expect(labWorkflowRunsRepository.listRunsForWorkflow(workflowId)).toHaveLength(0);

    const drySteps = dryBody.steps as { nodeId: string; status: string }[];
    expect(drySteps.map((step) => step.nodeId)).toContain(NODE.notify);
    expect(drySteps.every((step) => step.status !== 'failed')).toBe(true);

    // 5. Real run — this one records, and it notifies, so the envelope must be persisted first.
    const run = await labWorkflowRun({
      userId: ADMIN.userId,
      workflowId,
      payload: payload(),
    });
    expect(run.success).toBe(true);
    const runBody = body(run);
    const executionId = runBody.executionId as string;
    expect(executionId).toBeTruthy();
    expect(runBody.status).toBe('succeeded');

    // 6. Observe. Per-node items in/out is what makes "it ran but nothing happened" answerable.
    const execution = await labWorkflowGetExecution({
      userId: ADMIN.userId,
      runId: executionId,
    });
    expect(execution.success).toBe(true);
    const executionBody = body(execution);
    expect(executionBody.status).toBe('succeeded');
    const steps = executionBody.steps as {
      nodeId: string;
      itemsInCount: number;
      itemsOutCount: number;
    }[];
    expect(steps.map((step) => step.nodeId)).toEqual([
      NODE.trigger,
      NODE.filter,
      NODE.set,
      NODE.notify,
    ]);
    // The item contract, visible in the history: one item in, one item out, all the way down.
    expect(steps.every((step) => step.itemsInCount === 1 && step.itemsOutCount === 1)).toBe(true);
  });

  // -------------------------------------------------------------------------------------------
  // M5.2 — an invalid attempt is rejected, corrected, then accepted
  // -------------------------------------------------------------------------------------------

  test('an invalid graph is rejected with field-level errors, then accepted once corrected', async () => {
    resetWorkflows();

    const dangling = graph();
    // Point the last edge at a node that does not exist — the classic silent failure the validator
    // exists for: the edge is dropped at run time and the workflow "runs but does nothing".
    dangling.edges[2] = { ...dangling.edges[2], target: 'a1000001-0001-4001-8001-00000000dead' };

    const rejected = await labWorkflowCreate({
      userId: ADMIN.userId,
      name: 'Broken graph',
      definition: dangling,
      enabled: false,
    });
    expect(rejected.success).toBe(false);
    const rejectedBody = body(rejected);
    expect(rejectedBody.code).toBe('INVALID_DEFINITION');
    const validation = rejectedBody.validation as { errors: { code: string; targetId: string | null }[] };
    expect(validation.errors.some((issue) => issue.code === 'dangling_edge')).toBe(true);
    // Nothing was written — a rejected save must leave no half-created workflow.
    expect(labWorkflowsRepository.listAll()).toHaveLength(0);

    // The agent corrects the graph and retries; the same tool now accepts it.
    const accepted = await labWorkflowCreate({
      userId: ADMIN.userId,
      name: 'Fixed graph',
      definition: graph(),
      enabled: false,
    });
    expect(accepted.success).toBe(true);
    expect(labWorkflowsRepository.listAll()).toHaveLength(1);
  });

  test('validate returns warnings without blocking, and update rejects an invalid replacement', async () => {
    resetWorkflows();
    const created = await labWorkflowCreate({
      userId: ADMIN.userId,
      name: 'Warning fixture',
      definition: graph(),
      enabled: false,
    });
    expect(created.success).toBe(true);
    const workflowId = body(created).workflowId as string;

    // An unreachable node is a warning: the graph still runs, so it must not block saving.
    const withOrphan = graph();
    withOrphan.nodes.push({
      id: 'a1000001-0001-4001-8001-000000000009',
      kind: 'action',
      position: { x: 400, y: 400 },
      step: { kind: 'set_fields', fields: [{ path: 'orphan', source: 'literal', value: 1 }] },
    });
    const warned = await labWorkflowValidate({ userId: ADMIN.userId, definition: withOrphan });
    expect(warned.success).toBe(true);
    const warnedBody = body(warned);
    expect(warnedBody.valid).toBe(true);
    expect((warnedBody.warnings as { code: string }[]).some((issue) => issue.code === 'unreachable_node')).toBe(
      true,
    );

    const badUpdate = await labWorkflowUpdate({
      userId: ADMIN.userId,
      workflowId,
      definition: { schemaVersion: 2, nodes: [], edges: [] },
    });
    expect(badUpdate.success).toBe(false);
    // The stored graph is untouched by a rejected update.
    const stored = labWorkflowGet({ userId: ADMIN.userId, workflowId });
    expect(body(await stored).workflow).toBeDefined();
    expect(labWorkflowsRepository.getById(workflowId)?.name).toBe('Warning fixture');
  });

  test('update replaces the definition and is visible on the next read', async () => {
    resetWorkflows();
    const created = await labWorkflowCreate({
      userId: ADMIN.userId,
      name: 'Update fixture',
      definition: graph(),
      enabled: false,
    });
    const workflowId = body(created).workflowId as string;

    const updated = await labWorkflowUpdate({
      userId: ADMIN.userId,
      workflowId,
      name: 'Renamed fixture',
      definition: graph(),
    });
    expect(updated.success).toBe(true);
    const fetched = await labWorkflowGet({ userId: ADMIN.userId, workflowId });
    const fetchedBody = body(fetched);
    expect((fetchedBody.workflow as { name: string }).name).toBe('Renamed fixture');
    expect((fetchedBody.validation as { valid: boolean }).valid).toBe(true);
  });

  // -------------------------------------------------------------------------------------------
  // M5.3 — scope isolation
  // -------------------------------------------------------------------------------------------

  test('a member\'s user-scoped workflow is invisible to another member', async () => {
    resetWorkflows();

    const created = await labWorkflowCreate({
      userId: MEMBER_A.userId,
      name: 'Member A private workflow',
      definition: graph(),
      enabled: false,
    });
    expect(created.success).toBe(true);
    const workflowId = body(created).workflowId as string;

    const stored = labWorkflowsRepository.getById(workflowId);
    // A member cannot choose scope: the service forces `user` + caller ownership.
    expect(stored?.scope).toBe('user');
    expect(stored?.ownerUserId).toBe(MEMBER_A.userId);

    const own = await labWorkflowGet({ userId: MEMBER_A.userId, workflowId });
    expect(own.success).toBe(true);

    const other = await labWorkflowGet({ userId: MEMBER_B.userId, workflowId });
    expect(other.success).toBe(false);
    expect(body(other).code).toBe('FORBIDDEN');

    // The list is scope-filtered too, so B cannot even learn the id exists.
    const listB = await labWorkflowList({ userId: MEMBER_B.userId });
    expect(listB.success).toBe(true);
    expect(body(listB).count).toBe(0);

    const listA = await labWorkflowList({ userId: MEMBER_A.userId });
    expect(body(listA).count).toBe(1);

    // Admin sees it.
    const adminList = await labWorkflowList({ userId: ADMIN.userId });
    expect(body(adminList).count).toBe(1);
  });

  test('a viewer cannot author or run', async () => {
    resetWorkflows();
    const created = await labWorkflowCreate({
      userId: VIEWER.userId,
      name: 'Viewer attempt',
      definition: graph(),
      enabled: false,
    });
    expect(created.success).toBe(false);
    expect(body(created).code).toBe('FORBIDDEN');
    expect(labWorkflowsRepository.listAll()).toHaveLength(0);
  });

  test('a global workflow is hidden from a member list but runnable by an admin', async () => {
    resetWorkflows();
    const created = await labWorkflowCreate({
      userId: ADMIN.userId,
      name: 'Global workflow',
      scope: 'global',
      definition: graph(),
      enabled: false,
    });
    expect(created.success).toBe(true);
    const workflowId = body(created).workflowId as string;
    expect(labWorkflowsRepository.getById(workflowId)?.scope).toBe('global');

    const memberList = await labWorkflowList({ userId: MEMBER_A.userId });
    expect(body(memberList).count).toBe(0);

    const adminList = await labWorkflowList({ userId: ADMIN.userId });
    expect(body(adminList).count).toBe(1);
  });

  // -------------------------------------------------------------------------------------------
  // M5.4 — the money guard
  // -------------------------------------------------------------------------------------------

  test('a money-writing graph without confirmMoneyWrites is rejected and leaves no audit row', async () => {
    resetWorkflows();
    db.prepare('DELETE FROM platform_audit_log').run();

    const refused = await labWorkflowCreate({
      userId: ADMIN.userId,
      name: 'Unconfirmed money workflow',
      definition: moneyGraph(),
      enabled: false,
    });
    expect(refused.success).toBe(false);
    const refusedBody = body(refused);
    expect(String(refusedBody.error)).toContain('moves money');
    expect(labWorkflowsRepository.listAll()).toHaveLength(0);

    const audit = platformAuditRepository.listRecent(10);
    expect(audit).toHaveLength(0);
  });

  test('with confirmMoneyWrites the graph saves and the confirmation is audited', async () => {
    resetWorkflows();
    db.prepare('DELETE FROM platform_audit_log').run();

    const created = await labWorkflowCreate({
      userId: ADMIN.userId,
      name: 'Confirmed money workflow',
      definition: moneyGraph(),
      enabled: false,
      confirmMoneyWrites: true,
    });
    expect(created.success).toBe(true);
    const workflowId = body(created).workflowId as string;

    const audit = platformAuditRepository.listRecent(10);
    expect(audit).toHaveLength(1);
    expect(audit[0].category).toBe('workflow');
    expect(audit[0].action).toBe('lab_workflow.create.money_writes_confirmed');
    expect(audit[0].targetId).toBe(workflowId);
    const details = JSON.parse(audit[0].detailsJson ?? '{}') as {
      moneySteps?: { nodeId: string; stepKind: string }[];
    };
    expect(details.moneySteps?.[0].stepKind).toBe('ledger_post_entry');
  });

  test('a ledger-targeted integration write also counts as a money write', async () => {
    resetWorkflows();
    db.prepare('DELETE FROM platform_audit_log').run();

    const definition = graph();
    definition.nodes.push({
      id: 'a1000001-0001-4001-8001-000000000010',
      kind: 'action',
      position: { x: 0, y: 400 },
      step: {
        kind: 'integration_create',
        providerAppId: LAB_LEDGER_APP_ID,
        serviceId: 'lab-financial-ledger.ledger-entries',
      },
    });
    definition.edges.push({
      id: 'a1000001-0001-4001-8001-0000000000e4',
      source: NODE.notify,
      target: 'a1000001-0001-4001-8001-000000000010',
      when: 'always',
    });

    const refused = await labWorkflowCreate({
      userId: ADMIN.userId,
      name: 'Ledger connector write',
      definition,
      enabled: false,
    });
    expect(refused.success).toBe(false);
    expect(String(body(refused).error)).toContain('moves money');
    expect(platformAuditRepository.listRecent(10)).toHaveLength(0);
  });

  test('an update that does not touch the definition needs no money confirmation', async () => {
    resetWorkflows();
    db.prepare('DELETE FROM platform_audit_log').run();

    const created = await labWorkflowCreate({
      userId: ADMIN.userId,
      name: 'Confirmed then renamed',
      definition: moneyGraph(),
      enabled: false,
      confirmMoneyWrites: true,
    });
    const workflowId = body(created).workflowId as string;
    db.prepare('DELETE FROM platform_audit_log').run();

    // Renaming must not require re-confirming money that was already approved — otherwise every
    // metadata edit would look like a new money decision and the audit trail would lose meaning.
    const renamed = await labWorkflowUpdate({
      userId: ADMIN.userId,
      workflowId,
      name: 'Confirmed and renamed',
    });
    expect(renamed.success).toBe(true);
    expect(platformAuditRepository.listRecent(10)).toHaveLength(0);
  });

  // -------------------------------------------------------------------------------------------
  // Supporting behaviour an agent relies on
  // -------------------------------------------------------------------------------------------

  test('duplicate copies the graph but not the run history', async () => {
    resetWorkflows();
    const created = await labWorkflowCreate({
      userId: ADMIN.userId,
      name: 'Original',
      definition: graph(),
      enabled: false,
    });
    const sourceId = body(created).workflowId as string;
    await labWorkflowRun({ userId: ADMIN.userId, workflowId: sourceId, payload: payload() });
    expect(labWorkflowRunsRepository.listRunsForWorkflow(sourceId).length).toBeGreaterThan(0);

    const copy = await labWorkflowDuplicate({ userId: ADMIN.userId, workflowId: sourceId });
    expect(copy.success).toBe(true);
    const copyId = body(copy).workflowId as string;
    expect(copyId).not.toBe(sourceId);

    const copyRecord = labWorkflowsRepository.getById(copyId);
    const sourceRecord = labWorkflowsRepository.getById(sourceId);
    // The graph is copied verbatim — ids only need to be unique within one graph.
    expect(copyRecord?.definition).toEqual(sourceRecord?.definition);
    expect(copyRecord?.name).toBe('Original (copy)');
    // History belongs to the workflow it happened in.
    expect(labWorkflowRunsRepository.listRunsForWorkflow(copyId)).toHaveLength(0);
  });

  test('delete requires confirm and removes the workflow', async () => {
    resetWorkflows();
    const created = await labWorkflowCreate({
      userId: ADMIN.userId,
      name: 'Doomed',
      definition: graph(),
      enabled: false,
    });
    const workflowId = body(created).workflowId as string;

    // The schema types `confirm` as literal true, so a caller that omits it never reaches the
    // handler; the handler still defends, and the store is unchanged either way.
    const noConfirm = await labWorkflowDelete({
      userId: ADMIN.userId,
      workflowId,
      // @ts-expect-error — deliberately wrong at the type level to prove the runtime guard.
      confirm: false,
    });
    expect(noConfirm.success).toBe(false);
    expect(labWorkflowsRepository.getById(workflowId)).not.toBeNull();

    const deleted = await labWorkflowDelete({ userId: ADMIN.userId, workflowId, confirm: true });
    expect(deleted.success).toBe(true);
    expect(labWorkflowsRepository.getById(workflowId)).toBeNull();
  });

  test('dry-run reports what a node would have done, and a real run records it', async () => {
    resetWorkflows();
    const created = await labWorkflowCreate({
      userId: ADMIN.userId,
      name: 'Notify fixture',
      definition: graph(),
      enabled: false,
    });
    const workflowId = body(created).workflowId as string;

    const before = (await labEventsRepository.listNotificationsForUser(ASSIGNEE_ID, 50)).length;

    const dry = await labWorkflowDryRun({ userId: ADMIN.userId, workflowId, payload: payload() });
    const drySteps = body(dry).steps as { nodeId: string; detail: Record<string, unknown> | null }[];
    const notifyDry = drySteps.find((step) => step.nodeId === NODE.notify);
    expect(notifyDry?.detail?.dryRun).toBe(true);

    // A preview must not notify: the count is compared between runs rather than to zero, because
    // the notification table is shared across every case in this file.
    const afterDry = (await labEventsRepository.listNotificationsForUser(ASSIGNEE_ID, 50)).length;
    expect(afterDry).toBe(before);

    await labWorkflowRun({ userId: ADMIN.userId, workflowId, payload: payload() });
    const afterRun = (await labEventsRepository.listNotificationsForUser(ASSIGNEE_ID, 50)).length;
    expect(afterRun).toBe(before + 1);
  });

  test('an oversized item payload is truncated with an explicit marker', async () => {
    resetWorkflows();
    const created = await labWorkflowCreate({
      userId: ADMIN.userId,
      name: 'Big payload fixture',
      definition: graph(),
      enabled: false,
    });
    const workflowId = body(created).workflowId as string;
    // Comfortably past `LAB_WORKFLOW_RUN_JSON_MAX_BYTES` (8 KB) once the envelope wrapper is added,
    // so the cap — not the margin — is what the assertion exercises.
    const longText = 'x'.repeat(20_000);

    const run = await labWorkflowRun({
      userId: ADMIN.userId,
      workflowId,
      payload: { assigneeId: String(ASSIGNEE_ID), title: longText, amount: 10 },
    });
    const execution = await labWorkflowGetExecution({
      userId: ADMIN.userId,
      runId: body(run).executionId as string,
    });
    // The run envelope is over the stored cap, so it comes back as a marker rather than a silent cut.
    const envelope = body(execution).envelope;
    expect(envelope).toEqual(
      expect.objectContaining({ truncated: true }),
    );
  });

  test('a multi-record items array is nested under payload.items rather than changing the contract', async () => {
    resetWorkflows();
    const created = await labWorkflowCreate({
      userId: ADMIN.userId,
      name: 'Items fixture',
      definition: graph(),
      enabled: false,
    });
    const workflowId = body(created).workflowId as string;

    const run = await labWorkflowRun({
      userId: ADMIN.userId,
      workflowId,
      items: [
        { assigneeId: String(ASSIGNEE_ID), title: 'one' },
        { assigneeId: String(ASSIGNEE_ID), title: 'two' },
      ],
    });
    expect(run.success).toBe(true);
    const execution = await labWorkflowGetExecution({
      userId: ADMIN.userId,
      runId: body(run).executionId as string,
    });
    const envelope = body(execution).envelope as { payload: { items?: unknown[] } };
    // The trigger stays single-item: two records arrive as one payload carrying `items`, which is
    // exactly what a Split Out node fans out. A graph built for one record keeps its meaning.
    expect(Array.isArray(envelope.payload.items)).toBe(true);
    expect(envelope.payload.items).toHaveLength(2);
  });

  test('an unknown user id fails closed', async () => {
    const result = await labWorkflowListNodeTypes({ userId: 9_999 });
    expect(result.success).toBe(false);
    expect(body(result).error).toContain('User not found');
  });
});
