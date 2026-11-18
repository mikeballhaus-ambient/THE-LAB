import { afterAll, beforeAll, beforeEach, describe, expect, test } from '@jest/globals';
import betterSqlite3 from 'better-sqlite3';
import { randomUUID } from 'node:crypto';
import { createUsersTable } from '@/backend/db/Auth/auth-schema';
import { labEventsRepository } from '@/backend/db/LabEvents/lab-events-repository';
import { labWorkflowsRepository } from '@/backend/db/LabWorkflows/lab-workflows-repository';
import { labWorkflowWebhooksRepository } from '@/backend/db/LabWorkflows/lab-workflow-webhooks-repository';
import { labWorkflowMockSamplesRepository } from '@/backend/db/LabWorkflows/lab-workflow-mock-samples-repository';
import { labWorkflowRunsRepository } from '@/backend/db/LabWorkflows/lab-workflow-runs-repository';
import { captureWebhookDelivery } from '@/backend/lab-workflows/lab-workflow-listen-capture';
import { armListen, clearAllListensForTests, getListen } from '@/shared/types/lab-workflow-listen';
import {
  WF_TEST_EDGE_TRIGGER_NOTIFY,
  WF_TEST_NOTIFY,
  WF_TEST_TRIGGER,
} from '../lab-workflow-graph-fixture-ids';
import type { LabDomainEventEnvelopeV1 } from '@/shared/types/lab-domain-event';

/**
 * A webhook delivery must satisfy an armed Listen.
 *
 * The bug this covers: arming a webhook-triggered workflow showed "Listening — 300s left" and then
 * caught nothing, because armed listens were consumed only by the event-bus publish path and the
 * webhook route evaluates directly. It never published, so no arm was ever matched.
 *
 * The second property matters as much as the first: the delivery route has **already run** the graph,
 * so the capture must record without evaluating again. A live hook that notified twice would be a
 * worse bug than the one being fixed.
 */

const TRIGGER_EVENT = 'platform-webhook.request.received';
const WORKFLOW_ID = 'e6f00011-0011-4011-8011-0000000000aa';

function envelope(payload: Record<string, unknown>): LabDomainEventEnvelopeV1 {
  return {
    schemaVersion: 1,
    id: randomUUID(),
    type: TRIGGER_EVENT,
    sourceAppId: 'platform-webhook',
    occurredAt: new Date().toISOString(),
    actorUserId: 1,
    payload,
  };
}

function definition(): string {
  return JSON.stringify({
    schemaVersion: 2,
    nodes: [
      { id: WF_TEST_TRIGGER, kind: 'trigger', position: { x: 0, y: 0 }, eventType: TRIGGER_EVENT },
      {
        id: WF_TEST_NOTIFY,
        kind: 'action',
        position: { x: 0, y: 100 },
        step: { kind: 'notify_users', userIds: [2], message: { title: 'ran' } },
      },
    ],
    edges: [{ id: WF_TEST_EDGE_TRIGGER_NOTIFY, source: WF_TEST_TRIGGER, target: WF_TEST_NOTIFY, when: 'always' }],
  });
}

describe('webhook delivery satisfies an armed listen', () => {
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
    await labWorkflowWebhooksRepository.bootstrap(db);
    await labWorkflowMockSamplesRepository.bootstrap(db);

    labWorkflowsRepository.insertWorkflow({
      id: WORKFLOW_ID,
      name: 'Webhook listen fixture',
      description: null,
      scope: 'global',
      ownerUserId: null,
      createdByUserId: 1,
      enabled: true,
      priority: 100,
      definitionJson: definition(),
    });
  });

  beforeEach(() => {
    clearAllListensForTests();
    db.prepare('DELETE FROM lab_workflow_mock_samples').run();
  });

  afterAll(() => {
    clearAllListensForTests();
    db.close();
  });

  function arm(): void {
    armListen({
      workflowId: WORKFLOW_ID,
      userId: 1,
      userRole: 'admin',
      triggerEventType: TRIGGER_EVENT,
      dryRun: true,
    });
  }

  test('a delivery with no arm returns null and changes nothing', () => {
    const captured = captureWebhookDelivery(envelope({ stepValue: 1 }), {
      mode: 'test',
      runId: null,
      status: 'succeeded',
      steps: 0,
    });
    expect(captured).toBeNull();
    expect(db.prepare('SELECT COUNT(*) c FROM lab_workflow_mock_samples').get()).toEqual({ c: 0 });
  });

  test('a test delivery is captured and saved as a reusable sample', () => {
    arm();
    const captured = captureWebhookDelivery(envelope({ stepValue: 1, note: 'x' }), {
      mode: 'test',
      runId: null,
      status: 'succeeded',
      steps: 0,
    });

    expect(captured).not.toBeNull();
    expect(captured!.workflowId).toBe(WORKFLOW_ID);
    expect(captured!.dryRun).toBe(true);
    expect(captured!.mockSampleId).toBeTruthy();

    // The sample is the point: a capture the author cannot replay is a debugging session repeated.
    const samples = labWorkflowMockSamplesRepository.listForWorkflow(WORKFLOW_ID);
    expect(samples).toHaveLength(1);
    expect(samples[0].envelopeJson).toContain('stepValue');
  });

  test('a live delivery reports dryRun false — the mode decides, not the arm', () => {
    // Arming is dry by default; the delivery mode is what actually happened.
    arm();
    const captured = captureWebhookDelivery(envelope({ stepValue: 2 }), {
      mode: 'live',
      runId: 'run-1',
      status: 'succeeded',
      steps: 0,
    });
    expect(captured!.dryRun).toBe(false);
    expect(captured!.runId).toBe('run-1');
  });

  test('the arm is consumed, so a second delivery is not captured', () => {
    arm();
    const first = captureWebhookDelivery(envelope({ stepValue: 1 }), {
      mode: 'test',
      runId: null,
      status: 'succeeded',
      steps: 0,
    });
    const second = captureWebhookDelivery(envelope({ stepValue: 2 }), {
      mode: 'test',
      runId: null,
      status: 'succeeded',
      steps: 0,
    });

    expect(first).not.toBeNull();
    // One arm watches for **the next** trigger; capturing every later call would accumulate
    // samples nobody asked for.
    expect(second).toBeNull();
    expect(getListen(1, WORKFLOW_ID)).toBeNull();
  });

  test('a delivery for a different event type does not consume the arm', () => {
    arm();
    const other = envelope({ stepValue: 1 });
    other.type = 'app-lab-tasklist.task.created';
    expect(
      captureWebhookDelivery(other, { mode: 'test', runId: null, status: 'succeeded', steps: 0 }),
    ).toBeNull();
    expect(getListen(1, WORKFLOW_ID)).not.toBeNull();
  });
});
