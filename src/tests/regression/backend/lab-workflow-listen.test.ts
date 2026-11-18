import { afterAll, afterEach, beforeAll, describe, expect, test } from '@jest/globals';
import betterSqlite3 from 'better-sqlite3';
import { createUsersTable } from '@/backend/db/Auth/auth-schema';
import { labEventsRepository } from '@/backend/db/LabEvents/lab-events-repository';
import { labWorkflowsRepository } from '@/backend/db/LabWorkflows/lab-workflows-repository';
import { labWorkflowRunsRepository } from '@/backend/db/LabWorkflows/lab-workflow-runs-repository';
import { labWorkflowMockSamplesRepository } from '@/backend/db/LabWorkflows/lab-workflow-mock-samples-repository';
import { labWorkflowsService } from '@/backend/db/LabWorkflows/lab-workflows-service';
import { publishLabDomainEventPipeline } from '@/backend/lab-events/publish-lab-domain-event-pipeline';
import {
  armListen,
  clearAllListensForTests,
  disarmListen,
  getListen,
  LAB_WORKFLOW_LISTEN_TTL_MS,
  takeMatchingListens,
} from '@/shared/types/lab-workflow-listen';
import type { LabWorkflowDefinitionV2 } from '@/shared/types/lab-workflow-graph';
import { LAB_WORKFLOW_GRAPH_SCHEMA_VERSION } from '@/shared/types/lab-workflow-graph';
import {
  WF_TEST_EDGE_TRIGGER_NOTIFY,
  WF_TEST_NOTIFY,
  WF_TEST_TRIGGER,
} from '../lab-workflow-graph-fixture-ids';

/**
 * W5c — listen mode.
 *
 * The question is **"is my trigger wired correctly?"** — which only the real event can answer.
 *
 * Two properties carry the whole feature and are what these tests exist for:
 *
 * 1. **Nothing is left live.** An arm expires, and expiry *is* removal from the registry, so there
 *    is no subscription to cancel and no way to leak one.
 * 2. **Nothing is written by accident.** A capture evaluates without side effects unless the author
 *    explicitly opted in, because a wiring check must not notify a real person.
 */

const WORKFLOW_ID = 'a7000002-0002-4002-8002-0000000000a7';
const ASSIGNEE_ID = 2;
const TRIGGER_NODE_ID = WF_TEST_TRIGGER;
const TRIGGER_EVENT = 'app-lab-tasklist.task.created';
const AUTHOR_ID = 1;

function definition(): LabWorkflowDefinitionV2 {
  return {
    schemaVersion: LAB_WORKFLOW_GRAPH_SCHEMA_VERSION,
    nodes: [
      { id: TRIGGER_NODE_ID, kind: 'trigger', position: { x: 0, y: 0 }, eventType: TRIGGER_EVENT },
      {
        id: WF_TEST_NOTIFY,
        kind: 'action',
        position: { x: 0, y: 100 },
        step: { kind: 'notify_users', userIds: [], path: 'assigneeId' },
      },
    ],
    edges: [{ id: WF_TEST_EDGE_TRIGGER_NOTIFY, source: TRIGGER_NODE_ID, target: WF_TEST_NOTIFY, when: 'always' }],
  };
}

let eventCounter = 0;
function envelope(type = TRIGGER_EVENT, title = 'Captured task') {
  eventCounter += 1;
  return {
    schemaVersion: 1,
    id: `00000000-0000-4000-8000-${String(eventCounter).padStart(12, '0')}`,
    type,
    sourceAppId: 'app-lab-tasklist',
    occurredAt: '2026-10-19T12:00:00.000Z',
    actorUserId: AUTHOR_ID,
    payload: { assigneeId: String(ASSIGNEE_ID), title },
  };
}

describe('workflow listen mode (W5c)', () => {
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
    await labWorkflowRunsRepository.bootstrap(db);
    await labWorkflowMockSamplesRepository.bootstrap(db);

    labWorkflowsRepository.insertWorkflow({
      id: WORKFLOW_ID,
      name: 'Listen fixture',
      description: null,
      scope: 'global',
      ownerUserId: null,
      createdByUserId: 1,
      enabled: false,
      priority: 100,
      definitionJson: JSON.stringify(definition()),
    });
  });

  afterEach(() => {
    // The registry is module-level: leaving arms behind would make later cases depend on order.
    clearAllListensForTests();
    db.prepare('DELETE FROM lab_user_notifications').run();
    db.prepare('DELETE FROM lab_workflow_mock_samples').run();
    db.prepare('DELETE FROM lab_workflow_runs').run();
    db.prepare('DELETE FROM lab_domain_events').run();
  });

  afterAll(() => {
    db.close();
  });

  function sampleCount(): number {
    return (db.prepare('SELECT COUNT(*) AS c FROM lab_workflow_mock_samples').get() as { c: number })
      .c;
  }

  function notificationCount(): number {
    return (db.prepare('SELECT COUNT(*) AS c FROM lab_user_notifications').get() as { c: number }).c;
  }

  function runCount(): number {
    return (db.prepare('SELECT COUNT(*) AS c FROM lab_workflow_runs').get() as { c: number }).c;
  }

  test('arming registers a listener scoped to the user and workflow', () => {
    const armed = armListen({
      workflowId: WORKFLOW_ID,
      userId: AUTHOR_ID,
      userRole: 'admin',
      triggerEventType: TRIGGER_EVENT,
    });

    expect(armed.dryRun).toBe(true);
    expect(getListen(AUTHOR_ID, WORKFLOW_ID)?.triggerEventType).toBe(TRIGGER_EVENT);
    // Another user's arm is a different entry — two authors watching one workflow are independent.
    expect(getListen(99, WORKFLOW_ID)).toBeNull();
  });

  test('an arm expires and leaves nothing live', () => {
    armListen({
      workflowId: WORKFLOW_ID,
      userId: AUTHOR_ID,
      userRole: 'admin',
      triggerEventType: TRIGGER_EVENT,
      ttlMs: 10,
    });

    const later = Date.now() + 11;
    // Expiry is a property of *reading* the registry, so it happens with no timer and no sweeper.
    expect(takeMatchingListens(TRIGGER_EVENT, later)).toHaveLength(0);
    expect(getListen(AUTHOR_ID, WORKFLOW_ID)).toBeNull();
  });

  test('the default TTL is minutes, not hours', () => {
    // A debugging arm that outlives a coffee break is a live workflow in production.
    expect(LAB_WORKFLOW_LISTEN_TTL_MS).toBeLessThanOrEqual(10 * 60 * 1000);
  });

  test('disarming removes the arm', () => {
    armListen({ workflowId: WORKFLOW_ID, userId: AUTHOR_ID,
      userRole: 'admin', triggerEventType: TRIGGER_EVENT });
    expect(disarmListen(AUTHOR_ID, WORKFLOW_ID)).toBe(true);
    expect(getListen(AUTHOR_ID, WORKFLOW_ID)).toBeNull();
    expect(disarmListen(AUTHOR_ID, WORKFLOW_ID)).toBe(false);
  });

  test('only the next matching event is taken — an arm is single-use', () => {
    armListen({ workflowId: WORKFLOW_ID, userId: AUTHOR_ID,
      userRole: 'admin', triggerEventType: TRIGGER_EVENT });

    expect(takeMatchingListens(TRIGGER_EVENT)).toHaveLength(1);
    // Second event: the arm is consumed. Otherwise every later event would accumulate samples.
    expect(takeMatchingListens(TRIGGER_EVENT)).toHaveLength(0);
  });

  test('an unrelated event type does not consume the arm', () => {
    armListen({ workflowId: WORKFLOW_ID, userId: AUTHOR_ID,
      userRole: 'admin', triggerEventType: TRIGGER_EVENT });

    expect(takeMatchingListens('app-other.thing.happened')).toHaveLength(0);
    expect(getListen(AUTHOR_ID, WORKFLOW_ID)).not.toBeNull();
  });

  test('a real event is captured as a reusable sample, and is dry by default', async () => {
    armListen({ workflowId: WORKFLOW_ID, userId: AUTHOR_ID,
      userRole: 'admin', triggerEventType: TRIGGER_EVENT });

    const env = envelope(TRIGGER_EVENT, 'Wiring check');
    await publishLabDomainEventPipeline(env, AUTHOR_ID);

    // The payload is kept: that is the part the author waited for and cannot recover by retrying.
    const samples = labWorkflowMockSamplesRepository.listForWorkflow(WORKFLOW_ID);
    expect(samples).toHaveLength(1);
    expect(samples[0]?.capturedAt).toBeTruthy();
    expect(samples[0]?.triggerNodeId).toBe(TRIGGER_NODE_ID);
    expect(JSON.parse(samples[0]!.envelopeJson).payload.title).toBe('Wiring check');

    // Dry by default: a wiring check must not notify a real person.
    expect(notificationCount()).toBe(0);
    // And the arm is consumed.
    expect(getListen(AUTHOR_ID, WORKFLOW_ID)).toBeNull();
  });

  test('a captured sample replays through the normal run path', async () => {
    armListen({ workflowId: WORKFLOW_ID, userId: AUTHOR_ID,
      userRole: 'admin', triggerEventType: TRIGGER_EVENT });
    await publishLabDomainEventPipeline(envelope(TRIGGER_EVENT, 'Replay me'), AUTHOR_ID);

    const [sample] = labWorkflowMockSamplesRepository.listForWorkflow(WORKFLOW_ID);
    expect(sample).toBeDefined();

    const result = await labWorkflowsService.runForCaller(
      {
        userId: AUTHOR_ID,
        email: 'a@test',
        name: 'Admin',
        role: 'admin',
        status: 'active',
        lastSeen: '2026-01-01T00:00:00.000Z',
        createdAt: '2026-01-01T00:00:00.000Z',
      },
      WORKFLOW_ID,
      { dryRun: true, mockSampleId: sample!.id },
    );

    const notify = result.steps.find((step) => step.nodeId === WF_TEST_NOTIFY);
    expect((notify?.detail?.wouldSend as { body?: string } | undefined)?.body).toContain(
      'Replay me',
    );
  });

  test('an explicit non-dry arm really runs, so the toggle is honest', async () => {
    armListen({
      workflowId: WORKFLOW_ID,
      userId: AUTHOR_ID,
      userRole: 'admin',
      triggerEventType: TRIGGER_EVENT,
      dryRun: false,
    });

    await publishLabDomainEventPipeline(envelope(TRIGGER_EVENT, 'Real run'), AUTHOR_ID);

    // The event was persisted by the pipeline, so the notification FK is satisfiable.
    expect(notificationCount()).toBe(1);
    expect(runCount()).toBeGreaterThanOrEqual(1);
  });

  test('an armed but disabled workflow does not fire from the normal trigger path', async () => {
    // Arming is not enabling. The workflow is disabled in this fixture, so the ordinary event
    // evaluation must still skip it — only the capture runs.
    armListen({ workflowId: WORKFLOW_ID, userId: AUTHOR_ID,
      userRole: 'admin', triggerEventType: TRIGGER_EVENT });

    await publishLabDomainEventPipeline(envelope(TRIGGER_EVENT), AUTHOR_ID);

    // One sample from the capture, but no second evaluation from `evaluateWorkflowsForDomainEvent`.
    expect(sampleCount()).toBe(1);
    expect(notificationCount()).toBe(0);
  });

  test('an arm whose workflow was deleted is consumed without throwing', async () => {
    armListen({
      workflowId: '00000000-0000-4000-8000-0000000000ff',
      userId: AUTHOR_ID,
      userRole: 'admin',
      triggerEventType: TRIGGER_EVENT,
    });

    // Publishing must not fail because a listener pointed at a workflow that no longer exists.
    await expect(
      publishLabDomainEventPipeline(envelope(TRIGGER_EVENT), AUTHOR_ID),
    ).resolves.toBeUndefined();
    expect(
      getListen(AUTHOR_ID, '00000000-0000-4000-8000-0000000000ff'),
    ).toBeNull();
  });
});
