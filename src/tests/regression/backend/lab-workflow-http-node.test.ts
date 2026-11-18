import { afterAll, beforeAll, describe, expect, test } from '@jest/globals';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { runWorkflowStep } from '@/backend/lab-workflows/lab-workflow-step-runner';
import { LabWorkflowStepSchema } from '@/shared/types/schemas/lab-workflow-step-schema';
import type { LabDomainEventEnvelopeV1 } from '@/shared/types/lab-domain-event';
import type { LabWorkflowStepV1 } from '@/shared/types/lab-workflow';
import type { LabWorkflowItem } from '@/shared/types/lab-workflow-items';

/**
 * W10b — the `http_request` node.
 *
 * Two halves, because the node has two jobs that fail independently:
 *
 * 1. **Refuse the wrong target.** The dry run is the author's only safety net, so it must report a
 *    blocked URL rather than silently dropping the call.
 * 2. **Call the right target correctly.** A stub server on loopback proves the request shape — but
 *    loopback is blocked by design, so the allow-list cannot help. The stub is therefore reached by
 *    the node's own code path only when the guard is handed an allow-list that names it, which is
 *    exactly the case this suite asserts is *still* refused. Real outbound calls are covered by the
 *    URL-guard suite; here the guarantee is that the node never bypasses the guard.
 */

function envelope(): LabDomainEventEnvelopeV1 {
  return {
    schemaVersion: 1,
    id: 'evt-w10b',
    type: 'app-lab-tasklist.task.created',
    sourceAppId: 'app-lab-tasklist',
    occurredAt: '2026-10-19T12:00:00.000Z',
    actorUserId: 1,
    payload: { host: 'api.example.com', path: 'v1/records' },
  } as LabDomainEventEnvelopeV1;
}

function items(): LabWorkflowItem[] {
  return [{ json: { id: 'r-1', expenseId: 'e-1', amountCents: 4200 } }];
}

async function run(step: LabWorkflowStepV1, options: { dryRun?: boolean } = {}) {
  return runWorkflowStep({
    step,
    envelope: envelope(),
    items: items(),
    workflowName: 'http-fixture',
    nodeId: 'n-http',
    options: options.dryRun === true ? { dryRun: true } : {},
  });
}

describe('http_request schema (W10b)', () => {
  test.each([
    ['a GET', { kind: 'http_request', method: 'GET', url: 'https://api.example.com/x' }],
    [
      'a POST with bodyFromPayload',
      {
        kind: 'http_request',
        method: 'POST',
        url: 'https://api.example.com/x',
        bodyFromPayload: { id: 'payload.recordId' },
      },
    ],
    [
      'a POST with a body and headers',
      {
        kind: 'http_request',
        method: 'POST',
        url: 'https://api.example.com/x',
        headers: { 'content-type': 'application/json' },
        body: { a: 1 },
      },
    ],
    [
      'a templated URL',
      { kind: 'http_request', method: 'GET', url: 'https://{{payload.host}}/{{payload.path}}' },
    ],
  ])('accepts %s', (_name, step) => {
    expect(LabWorkflowStepSchema.safeParse(step).success).toBe(true);
  });

  test.each([
    ['an unknown method', { kind: 'http_request', method: 'TRACE', url: 'https://x.example.com' }],
    ['an empty URL', { kind: 'http_request', method: 'GET', url: '' }],
    ['a timeout below the floor', { kind: 'http_request', method: 'GET', url: 'https://x.example.com', timeoutMs: 10 }],
    ['a timeout above the cap', { kind: 'http_request', method: 'GET', url: 'https://x.example.com', timeoutMs: 60_000 }],
  ])('rejects %s', (_name, step) => {
    expect(LabWorkflowStepSchema.safeParse(step).success).toBe(false);
  });
});

describe('http_request dry run (W10b)', () => {
  test('reports a blocked URL instead of pretending it would call it', async () => {
    const outcome = await run(
      { kind: 'http_request', method: 'GET', url: 'http://169.254.169.254/latest/meta-data/' },
      { dryRun: true },
    );
    if (outcome.kind !== 'continue') {
      throw new Error('expected a continue outcome');
    }
    expect(outcome.detail).toMatchObject({
      dryRun: true,
      wouldCallCount: 0,
      blockedCount: 1,
    });
    const previews = outcome.detail?.previews as { rejection: string }[];
    expect(previews[0]?.rejection).toBe('blocked_address');
  });

  test('a public URL is reported as callable', async () => {
    const outcome = await run(
      { kind: 'http_request', method: 'GET', url: 'https://api.example.com/v1/records' },
      { dryRun: true },
    );
    if (outcome.kind !== 'continue') {
      throw new Error('expected a continue outcome');
    }
    expect(outcome.detail).toMatchObject({ wouldCallCount: 1, blockedCount: 0 });
  });

  test('bodyFromPayload is merged into the dry-run preview body', async () => {
    const outcome = await run(
      {
        kind: 'http_request',
        method: 'POST',
        url: 'https://api.example.com/v1/records',
        bodyFromPayload: {
          expenseId: 'payload.expenseId',
          amountCents: 'amountCents',
        },
      },
      { dryRun: true },
    );
    if (outcome.kind !== 'continue') {
      throw new Error('expected a continue outcome');
    }
    const previews = outcome.detail?.previews as { body: Record<string, unknown> | null }[];
    expect(previews[0]?.body).toEqual({ expenseId: 'e-1', amountCents: 4200 });
  });

  test('the URL is resolved from the payload, so the preview names the real target', async () => {
    const outcome = await run(
      { kind: 'http_request', method: 'GET', url: 'https://{{payload.host}}/{{payload.path}}' },
      { dryRun: true },
    );
    if (outcome.kind !== 'continue') {
      throw new Error('expected a continue outcome');
    }
    const previews = outcome.detail?.previews as { url: string }[];
    expect(previews[0]?.url).toBe('https://api.example.com/v1/records');
  });

  test('an allow-list narrows what the preview accepts', async () => {
    const outcome = await run(
      {
        kind: 'http_request',
        method: 'GET',
        url: 'https://api.example.com/v1/records',
        allowList: ['other.example.org'],
      },
      { dryRun: true },
    );
    if (outcome.kind !== 'continue') {
      throw new Error('expected a continue outcome');
    }
    expect(outcome.detail).toMatchObject({ wouldCallCount: 0, blockedCount: 1 });
    const previews = outcome.detail?.previews as { rejection: string }[];
    expect(previews[0]?.rejection).toBe('not_in_allow_list');
  });
});

describe('http_request execution guard (W10b)', () => {
  let stub: Server;
  let stubUrl: string;
  let hitCount = 0;

  beforeAll(async () => {
    // A real server on loopback proves the guard is what stops the call: if the node ever bypassed
    // `validateOutboundUrl`, this counter would move.
    stub = createServer((_req, res) => {
      hitCount += 1;
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({ ok: true }));
    });
    await new Promise<void>((resolve) => stub.listen(0, '127.0.0.1', resolve));
    const address = stub.address() as AddressInfo;
    stubUrl = `http://127.0.0.1:${address.port}/data`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => stub.close(() => resolve()));
  });

  test('a loopback target is blocked and never reached, even when allow-listed', async () => {
    hitCount = 0;
    const outcome = await run({
      kind: 'http_request',
      method: 'GET',
      url: stubUrl,
      allowList: ['127.0.0.1'],
    });

    if (outcome.kind !== 'continue') {
      throw new Error('expected a continue outcome');
    }
    // Deny-first: an allow-list entry cannot make loopback reachable.
    expect(outcome.detail).toMatchObject({ blocked: 1, succeeded: 0 });
    expect(hitCount).toBe(0);
    // Blocked rows produce no output items, so downstream cannot mistake a refusal for a response.
    expect(outcome.output.items).toEqual([]);
  });

  test('a batch of blocked rows is counted per row', async () => {
    hitCount = 0;
    const outcome = await runWorkflowStep({
      step: { kind: 'http_request', method: 'GET', url: 'http://10.0.0.1/x' },
      envelope: envelope(),
      items: [{ json: { id: 'a' } }, { json: { id: 'b' } }],
      workflowName: 'http-fixture',
      nodeId: 'n-http',
      options: {},
    });
    if (outcome.kind !== 'continue') {
      throw new Error('expected a continue outcome');
    }
    expect(outcome.detail).toMatchObject({ requested: 2, blocked: 2, succeeded: 0 });
    expect(hitCount).toBe(0);
  });
});
