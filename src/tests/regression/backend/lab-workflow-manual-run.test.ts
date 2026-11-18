import { afterAll, beforeAll, describe, expect, test } from '@jest/globals';
import betterSqlite3 from 'better-sqlite3';
import { createUsersTable } from '@/backend/db/Auth/auth-schema';
import { labEventsRepository } from '@/backend/db/LabEvents/lab-events-repository';
import { labWorkflowsRepository } from '@/backend/db/LabWorkflows/lab-workflows-repository';
import { labWorkflowRunsRepository } from '@/backend/db/LabWorkflows/lab-workflow-runs-repository';
import { labWorkflowsService } from '@/backend/db/LabWorkflows/lab-workflows-service';
import type { User } from '@/shared/types/user';
import type { LabWorkflowDefinitionV2 } from '@/shared/types/lab-workflow-graph';
import { LAB_WORKFLOW_GRAPH_SCHEMA_VERSION } from '@/shared/types/lab-workflow-graph';
import {
  WF_TEST_EDGE_TRIGGER_NOTIFY,
  WF_TEST_NOTIFY,
  WF_TEST_TRIGGER,
} from '../lab-workflow-graph-fixture-ids';

/**
 * W5a — manual run and dry run.
 *
 * The property that matters is not "a run happens" but **"a preview changes nothing"**. A dry run
 * that notifies a real person, or writes a run row into the history a user reads to judge whether
 * the workflow works, is worse than no preview at all: it is a preview that lies.
 */

const WORKFLOW_ID = 'e5000002-0002-4002-8002-0000000000e5';
const ASSIGNEE_ID = 2;
const TASK_TITLE = 'Ship widgets';
const TRIGGER_EVENT = 'app-lab-tasklist.task.created';

const ADMIN: User = {
  userId: 1,
  email: 'a@test',
  name: 'Admin',
  role: 'admin',
  status: 'active',
  lastSeen: '2026-01-01T00:00:00.000Z',
  createdAt: '2026-01-01T00:00:00.000Z',
};

function definition(): LabWorkflowDefinitionV2 {
  return {
    schemaVersion: LAB_WORKFLOW_GRAPH_SCHEMA_VERSION,
    nodes: [
      { id: WF_TEST_TRIGGER, kind: 'trigger', position: { x: 0, y: 0 }, eventType: TRIGGER_EVENT },
      {
        id: WF_TEST_NOTIFY,
        kind: 'action',
        position: { x: 0, y: 100 },
        step: {
          kind: 'notify_users',
          userIds: [],
          path: 'assigneeId',
          message: { title: 'Task: {{payload.title}}' },
        },
      },
    ],
    edges: [{ id: WF_TEST_EDGE_TRIGGER_NOTIFY, source: WF_TEST_TRIGGER, target: WF_TEST_NOTIFY, when: 'always' }],
  };
}

function envelope(type = TRIGGER_EVENT) {
  return {
    schemaVersion: 1,
    id: '99999999-9999-4999-8999-999999999999',
    type,
    sourceAppId: 'app-lab-tasklist',
    occurredAt: '2026-10-19T12:00:00.000Z',
    actorUserId: 1,
    payload: { assigneeId: String(ASSIGNEE_ID), title: TASK_TITLE },
  };
}

describe('manual run and dry run (W5a)', () => {
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

    await labEventsRepository.bootstrap(db);
    await labWorkflowsRepository.bootstrap(db);
    // `bootstrap(db)` binds the repository to *this* in-memory database. `initialize()` alone would
    // leave it pointing at the app singleton, and every statement lookup would throw.
    await labWorkflowRunsRepository.bootstrap(db);

    labWorkflowsRepository.insertWorkflow({
      id: WORKFLOW_ID,
      name: 'Manual run fixture',
      description: null,
      scope: 'global',
      ownerUserId: null,
      createdByUserId: 1,
      enabled: false,
      priority: 100,
      definitionJson: JSON.stringify(definition()),
    });
  });

  afterAll(() => {
    db.close();
  });

  function notificationCount(): number {
    return (db.prepare('SELECT COUNT(*) AS c FROM lab_user_notifications').get() as { c: number }).c;
  }

  function runCount(): number {
    return (db.prepare('SELECT COUNT(*) AS c FROM lab_workflow_runs').get() as { c: number }).c;
  }

  test('a dry run reports what it would do and writes nothing', async () => {
    const before = { notifications: notificationCount(), runs: runCount() };

    const result = await labWorkflowsService.runForCaller(ADMIN, WORKFLOW_ID, {
      dryRun: true,
      envelope: envelope(),
    });

    expect(result.dryRun).toBe(true);
    // A preview must not appear in history — that history is how the user judges the workflow.
    expect(result.runId).toBeNull();
    expect(runCount()).toBe(before.runs);
    // The whole point of a preview: no real person is notified.
    expect(notificationCount()).toBe(before.notifications);

    const notify = result.steps.find((s) => s.nodeId === WF_TEST_NOTIFY);
    expect(notify).toBeDefined();
    expect(notify?.detail?.dryRun).toBe(true);
    expect(notify?.detail?.wouldNotifyUserIds).toEqual([ASSIGNEE_ID]);
    // Rendered copy is reported so the author can proof-read the message.
    expect((notify?.detail?.wouldSend as { title?: string }).title).toBe(`Task: ${TASK_TITLE}`);
  });

  test('a real run writes a notification and a manual-trigger run row', async () => {
    const env = envelope();
    // `lab_user_notifications.event_id` is a FK to `lab_domain_events`, so a real run must have its
    // event persisted first. A dry run deliberately does not, which is part of what it means.
    await labEventsRepository.publishEvent(
      env.id,
      env.type,
      env.sourceAppId,
      env.occurredAt,
      env.actorUserId,
      JSON.stringify(env.payload),
    );

    const result = await labWorkflowsService.runForCaller(ADMIN, WORKFLOW_ID, {
      dryRun: false,
      envelope: env,
    });

    expect(result.dryRun).toBe(false);
    expect(result.runId).toBeTruthy();
    expect(notificationCount()).toBe(1);

    const run = labWorkflowRunsRepository.getRun(result.runId!);
    // `manual` is what distinguishes this from a real event in history.
    expect(run?.triggerType).toBe('manual');
    expect(run?.status).toBe('succeeded');

    const steps = labWorkflowRunsRepository.listStepsForRun(result.runId!);
    expect(steps.map((s) => s.nodeId)).toEqual([WF_TEST_TRIGGER, WF_TEST_NOTIFY]);
  });

  test('a manual run works on a disabled workflow', async () => {
    // Enabling a workflow in order to test it is the production risk W5a removes, so a disabled
    // graph must still be runnable on demand.
    const record = labWorkflowsRepository.getById(WORKFLOW_ID);
    expect(record?.enabled).toBe(false);

    const result = await labWorkflowsService.runForCaller(ADMIN, WORKFLOW_ID, {
      dryRun: true,
      envelope: envelope(),
    });
    expect(result.status).not.toBe('failed');
    expect(result.steps.length).toBeGreaterThan(0);
  });

  test('a mismatched event type is reported instead of silently doing nothing', async () => {
    const result = await labWorkflowsService.runForCaller(ADMIN, WORKFLOW_ID, {
      dryRun: true,
      envelope: envelope('app-other.thing.happened'),
    });

    expect(result.status).toBe('skipped');
    expect(result.steps).toHaveLength(0);
    expect(result.reason).toContain(TRIGGER_EVENT);
  });

  test('the run result carries validation issues so the panel can show both together', async () => {
    const result = await labWorkflowsService.runForCaller(ADMIN, WORKFLOW_ID, {
      dryRun: true,
      envelope: envelope(),
    });

    // This fixture has one action and a documented trigger, so there is nothing to report — the
    // assertion is that the field is present and typed, not that it is non-empty.
    expect(Array.isArray(result.issues)).toBe(true);
  });

  test('a viewer cannot run a workflow', async () => {
    const viewer: User = { ...ADMIN, userId: 3, role: 'viewer' };
    await expect(
      labWorkflowsService.runForCaller(viewer, WORKFLOW_ID, { dryRun: true }),
    ).rejects.toThrow(/Viewers cannot run workflows/);
  });
});
