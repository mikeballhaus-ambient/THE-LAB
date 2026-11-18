import { afterAll, beforeAll, beforeEach, describe, expect, test } from '@jest/globals';
import fastify, { type FastifyInstance } from 'fastify';
import betterSqlite3 from 'better-sqlite3';
import { randomUUID } from 'node:crypto';
import { createUsersTable } from '@/backend/db/Auth/auth-schema';
import { labEventsRepository } from '@/backend/db/LabEvents/lab-events-repository';
import { labWorkflowsRepository } from '@/backend/db/LabWorkflows/lab-workflows-repository';
import { labWorkflowRunsRepository } from '@/backend/db/LabWorkflows/lab-workflow-runs-repository';
import { labWorkflowWebhooksRepository } from '@/backend/db/LabWorkflows/lab-workflow-webhooks-repository';
import { registerPlatformWorkflowHooksRoutes } from '@/backend/routes/platform-workflow-hooks-routes';
import {
  hashWebhookToken,
  signWebhookBody,
} from '@/shared/utils/lab-workflow-webhook-auth';
import {
  LAB_WORKFLOW_WEBHOOK_MIN_INTERVAL_MS,
  LAB_WORKFLOW_WEBHOOK_SIGNATURE_HEADER,
  LAB_WORKFLOW_WEBHOOK_TIMESTAMP_HEADER,
} from '@/shared/types/lab-workflow-webhook';
import { LAB_WORKFLOW_GRAPH_SCHEMA_VERSION } from '@/shared/types/lab-workflow-graph';
import {
  WF_TEST_EDGE_TRIGGER_NOTIFY,
  WF_TEST_NOTIFY,
  WF_TEST_TRIGGER,
} from '../lab-workflow-graph-fixture-ids';

/**
 * W10a — the inbound webhook route.
 *
 * These are HTTP-level tests on purpose. The signature maths has its own suite; what can only go
 * wrong here is the wiring: which status a caller receives, whether a rejected request runs anything,
 * and whether the raw body — not a re-serialised object — is what got verified.
 */

const TRIGGER_EVENT = 'app-lab-tasklist.task.created';
const WORKFLOW_ID = 'e6f00009-0009-4009-8009-0000000000fd';
const DISABLED_WORKFLOW_ID = 'e6f00010-0010-4010-8010-0000000000fe';
const SECRET = 'hook-secret';

function workflowDefinition(): string {
  return JSON.stringify({
    schemaVersion: LAB_WORKFLOW_GRAPH_SCHEMA_VERSION,
    nodes: [
      { id: WF_TEST_TRIGGER, kind: 'trigger', position: { x: 0, y: 0 }, eventType: TRIGGER_EVENT },
      {
        id: WF_TEST_NOTIFY,
        kind: 'action',
        position: { x: 0, y: 100 },
        step: { kind: 'notify_users', userIds: [2], message: { title: 'from the hook' } },
      },
    ],
    edges: [{ id: WF_TEST_EDGE_TRIGGER_NOTIFY, source: WF_TEST_TRIGGER, target: WF_TEST_NOTIFY, when: 'always' }],
  });
}

describe('POST /api/platform/hooks/:token (W10a)', () => {
  let db: betterSqlite3.Database;
  let server: FastifyInstance;
  let seq = 0;

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

    for (const [id, enabled] of [
      [WORKFLOW_ID, true],
      [DISABLED_WORKFLOW_ID, false],
    ] as const) {
      labWorkflowsRepository.insertWorkflow({
        id,
        name: 'Webhook fixture',
        description: null,
        scope: 'global',
        ownerUserId: null,
        createdByUserId: 1,
        enabled,
        priority: 100,
        definitionJson: workflowDefinition(),
      });
    }

    server = fastify({ logger: false });
    registerPlatformWorkflowHooksRoutes(server);
    await server.ready();
  });

  beforeEach(() => {
    db.prepare('DELETE FROM lab_workflow_webhooks').run();
    db.prepare('DELETE FROM lab_workflow_runs').run();
    db.prepare('DELETE FROM lab_user_notifications').run();
  });

  afterAll(async () => {
    await server.close();
    db.close();
  });

  /**
   * Create a hook and return its plaintext **live** token.
   *
   * The legacy route this suite exercises resolves the live hash, so this fixture keeps testing the
   * behaviour it was written for. A test hash is still required by the schema (phase 37 splits the
   * credential in two), so one is generated even though these tests never call the test endpoint.
   */
  function hook(params: {
    workflowId?: string;
    secret?: string | null;
    enabled?: boolean;
  } = {}): string {
    const token = `token-${(seq += 1)}-${randomUUID()}`;
    labWorkflowWebhooksRepository.insert({
      id: randomUUID(),
      workflowId: params.workflowId ?? WORKFLOW_ID,
      triggerNodeId: WF_TEST_TRIGGER,
      name: `Hook ${seq}`,
      slug: `hook-${seq}`,
      testTokenHash: hashWebhookToken(`test-${token}`),
      liveTokenHash: hashWebhookToken(token),
      hmacSecret: params.secret === undefined ? SECRET : params.secret,
      eventType: TRIGGER_EVENT,
      enabled: params.enabled ?? true,
    });
    return token;
  }

  function signedHeaders(body: string, secret = SECRET, atMs = Date.now()): Record<string, string> {
    const timestamp = String(Math.floor(atMs / 1000));
    return {
      'content-type': 'application/json',
      [LAB_WORKFLOW_WEBHOOK_TIMESTAMP_HEADER]: timestamp,
      [LAB_WORKFLOW_WEBHOOK_SIGNATURE_HEADER]: signWebhookBody(secret, timestamp, body),
    };
  }

  function runs(): number {
    const row = db.prepare('SELECT COUNT(*) AS n FROM lab_workflow_runs').get() as { n: number };
    return row.n;
  }

  test('a correctly signed call runs the workflow and returns 202', async () => {
    const token = hook();
    const body = '{"taskId":"t-1"}';
    const response = await server.inject({
      method: 'POST',
      url: `/api/platform/hooks/${token}`,
      headers: signedHeaders(body),
      payload: body,
    });

    expect(response.statusCode).toBe(202);
    const parsed = response.json() as { success: boolean; data: { runId: string } };
    expect(parsed.success).toBe(true);
    expect(parsed.data.runId).toBeTruthy();
    expect(runs()).toBe(1);
  });

  test('an unknown token is 401 and runs nothing', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/api/platform/hooks/not-a-real-token',
      headers: signedHeaders('{}'),
      payload: '{}',
    });
    expect(response.statusCode).toBe(401);
    expect(runs()).toBe(0);
  });

  test('a disabled hook is indistinguishable from an unknown one', async () => {
    // Same status and same body: a token must not be usable as an existence oracle.
    const token = hook({ enabled: false });
    const response = await server.inject({
      method: 'POST',
      url: `/api/platform/hooks/${token}`,
      headers: signedHeaders('{}'),
      payload: '{}',
    });
    expect(response.statusCode).toBe(401);
    expect(response.body).not.toContain('disabled');
    expect(runs()).toBe(0);
  });

  test('a bad signature is 401 and runs nothing', async () => {
    const token = hook();
    const body = '{"taskId":"t-1"}';
    const response = await server.inject({
      method: 'POST',
      url: `/api/platform/hooks/${token}`,
      headers: signedHeaders(body, 'the-wrong-secret'),
      payload: body,
    });
    expect(response.statusCode).toBe(401);
    expect(runs()).toBe(0);
  });

  test('a replayed request is rejected once its timestamp ages out', async () => {
    const token = hook();
    const body = '{"taskId":"t-1"}';
    const tenMinutesAgo = Date.now() - 10 * 60_000;
    const response = await server.inject({
      method: 'POST',
      url: `/api/platform/hooks/${token}`,
      headers: signedHeaders(body, SECRET, tenMinutesAgo),
      payload: body,
    });
    expect(response.statusCode).toBe(401);
    expect(runs()).toBe(0);
  });

  test('the signature covers the raw body, so key order does not break a valid caller', async () => {
    // `{"b":2,"a":1}` re-serialised by a JSON parser could become `{"a":1,"b":2}`, which would fail a
    // signature computed over the caller's bytes. This is the regression that a "parse then hash"
    // implementation would produce.
    const token = hook();
    const body = '{"b":2,"a":1}';
    const response = await server.inject({
      method: 'POST',
      url: `/api/platform/hooks/${token}`,
      headers: signedHeaders(body),
      payload: body,
    });
    expect(response.statusCode).toBe(202);
  });

  test('a tampered body is rejected', async () => {
    const token = hook();
    const original = '{"taskId":"t-1"}';
    const tampered = '{"taskId":"t-2"}';
    const response = await server.inject({
      method: 'POST',
      url: `/api/platform/hooks/${token}`,
      // Signed for the original, sent with the tampered body.
      headers: signedHeaders(original),
      payload: tampered,
    });
    expect(response.statusCode).toBe(401);
    expect(runs()).toBe(0);
  });

  test('an array body is rejected as invalid input, not run', async () => {
    const token = hook();
    const body = '[1,2,3]';
    const response = await server.inject({
      method: 'POST',
      url: `/api/platform/hooks/${token}`,
      headers: signedHeaders(body),
      payload: body,
    });
    expect(response.statusCode).toBe(400);
    expect(runs()).toBe(0);
  });

  test('a second call inside the rate window is 429', async () => {
    const token = hook();
    const body = '{"taskId":"t-1"}';
    const first = await server.inject({
      method: 'POST',
      url: `/api/platform/hooks/${token}`,
      headers: signedHeaders(body),
      payload: body,
    });
    expect(first.statusCode).toBe(202);

    const second = await server.inject({
      method: 'POST',
      url: `/api/platform/hooks/${token}`,
      headers: signedHeaders(body),
      payload: body,
    });
    expect(second.statusCode).toBe(429);
    expect(runs()).toBe(1);
  });

  test('an unsigned hook is accepted without signature headers', async () => {
    // Local development mode. The rate limit still applies, and the token is still required; "no
    // signature" is a weaker mode, not an open door.
    const token = hook({ secret: null });
    const body = '{"taskId":"t-1"}';
    const response = await server.inject({
      method: 'POST',
      url: `/api/platform/hooks/${token}`,
      headers: { 'content-type': 'application/json' },
      payload: body,
    });
    expect(response.statusCode).toBe(202);
    expect(runs()).toBe(1);
  });

  test('a hook whose workflow was disabled returns 202 without running', async () => {
    // The hook outlived its workflow. Retrying will not help, so the caller is told "accepted" and
    // the workflow simply does not run.
    const token = hook({ workflowId: DISABLED_WORKFLOW_ID });
    const body = '{"taskId":"t-1"}';
    const response = await server.inject({
      method: 'POST',
      url: `/api/platform/hooks/${token}`,
      headers: signedHeaders(body),
      payload: body,
    });
    expect(response.statusCode).toBe(202);
    const parsed = response.json() as { data: { ran?: boolean } };
    expect(parsed.data.ran).toBe(false);
    expect(runs()).toBe(0);
  });

  test('the run is recorded as webhook-triggered', async () => {
    const token = hook();
    const body = '{"taskId":"t-1"}';
    await server.inject({
      method: 'POST',
      url: `/api/platform/hooks/${token}`,
      headers: signedHeaders(body),
      payload: body,
    });
    const row = db
      .prepare('SELECT trigger_type, envelope_json FROM lab_workflow_runs ORDER BY rowid DESC LIMIT 1')
      .get() as { trigger_type: string; envelope_json: string };
    expect(row.trigger_type).toBe('webhook');
    const envelope = JSON.parse(row.envelope_json) as { sourceAppId: string; payload: Record<string, unknown> };
    // Provenance: an operator must be able to tell a webhook run from an internal one.
    expect(envelope.sourceAppId).toBe('platform-webhook');
    expect(envelope.payload).toMatchObject({ taskId: 't-1' });
    expect(envelope.payload).toHaveProperty('webhookId');
  });

  test('the rate window constant is what the test expects', () => {
    // Guards the test itself: if the floor were raised above a second, the 429 test above would pass
    // for the wrong reason.
    expect(LAB_WORKFLOW_WEBHOOK_MIN_INTERVAL_MS).toBe(1_000);
  });
});
