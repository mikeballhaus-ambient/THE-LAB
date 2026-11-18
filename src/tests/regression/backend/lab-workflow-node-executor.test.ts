import { afterEach, describe, expect, test } from '@jest/globals';
import {
  LabWorkflowIdempotencyLedger,
  executeNodeWithPolicy,
  resolveIdempotencyKey,
  resolveRetryPolicy,
  resolveTimeoutMs,
} from '@/backend/lab-workflows/lab-workflow-node-executor';
import {
  LAB_WORKFLOW_NODE_BACKOFF_MAX_MS,
  LAB_WORKFLOW_NODE_RETRY_MAX_ATTEMPTS,
  LAB_WORKFLOW_NODE_TIMEOUT_MAX_MS,
} from '@/shared/types/lab-workflow-graph';
import type { LabDomainEventEnvelopeV1 } from '@/shared/types/lab-domain-event';
import { singleItemOutput } from '@/shared/types/lab-workflow-items';

/**
 * W2 gate — retry, timeout, idempotency.
 *
 * The plan's verify line is: *a failing node retries N times then records failure; a repeated
 * idempotency key does not double-write.* The second half is the one that matters: a retry that
 * duplicates an effect is worse than no retry at all, so the timeout/idempotency interaction is
 * tested explicitly.
 */

function envelope(payload: Record<string, unknown> = {}): LabDomainEventEnvelopeV1 {
  return {
    schemaVersion: 1,
    id: 'evt-1',
    type: 'app-lab-tasklist.task.created',
    sourceAppId: 'app-lab-tasklist',
    occurredAt: new Date().toISOString(),
    actorUserId: 1,
    payload,
  };
}

function failingThenSucceeding(failures: number): { run: () => Promise<string>; calls: () => number } {
  let calls = 0;
  return {
    calls: () => calls,
    run: async () => {
      calls += 1;
      if (calls <= failures) {
        throw new Error(`transient failure ${calls}`);
      }
      return 'ok';
    },
  };
}

describe('workflow node execution policy (W2)', () => {
  afterEach(() => {
    LabWorkflowIdempotencyLedger.getInstance().clear();
  });

  test('defaults to a single attempt — retrying is opt-in', () => {
    expect(resolveRetryPolicy(undefined)).toEqual({ attempts: 0, backoffMs: 250 });
  });

  test('user-authored numbers are clamped, not trusted', () => {
    expect(
      resolveRetryPolicy({ retry: { attempts: 9999, backoffMs: 9_999_999 } }),
    ).toEqual({
      attempts: LAB_WORKFLOW_NODE_RETRY_MAX_ATTEMPTS,
      backoffMs: LAB_WORKFLOW_NODE_BACKOFF_MAX_MS,
    });
    // Negative and non-finite values collapse to "no retry" rather than a negative delay.
    expect(resolveRetryPolicy({ retry: { attempts: -3 } }).attempts).toBe(0);
    expect(resolveTimeoutMs({ timeoutMs: -1 })).toBeNull();
    expect(resolveTimeoutMs({ timeoutMs: Number.POSITIVE_INFINITY })).toBeNull();
    expect(resolveTimeoutMs({ timeoutMs: 9_999_999 })).toBe(LAB_WORKFLOW_NODE_TIMEOUT_MAX_MS);
  });

  test('a failing node retries N times then reports failure', async () => {
    const fixture = failingThenSucceeding(99);
    const result = await executeNodeWithPolicy({
      run: fixture.run,
      policy: { retry: { attempts: 2, backoffMs: 1 } },
      envelope: envelope(),
      nodeId: 'n1',
    });

    expect(result.ok).toBe(false);
    // 1 initial attempt + 2 retries.
    expect(result.attempts).toBe(3);
    expect(fixture.calls()).toBe(3);
    if (!result.ok) {
      expect(result.failure.message).toBe('transient failure 3');
    }
  });

  test('a node that recovers on retry succeeds without surfacing an error', async () => {
    const fixture = failingThenSucceeding(1);
    const result = await executeNodeWithPolicy({
      run: fixture.run,
      policy: { retry: { attempts: 3, backoffMs: 1 } },
      envelope: envelope(),
      nodeId: 'n1',
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe('ok');
      expect(result.attempts).toBe(2);
    }
  });

  test('a hanging node is abandoned at its timeout', async () => {
    const result = await executeNodeWithPolicy({
      run: () => new Promise<string>(() => {}),
      policy: { timeoutMs: 30 },
      envelope: envelope(),
      nodeId: 'hang',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.failure.message).toContain('timed out');
    }
  });

  test('a timeout is not retried without an idempotency key', async () => {
    // The effect may already have landed. Repeating it blind could double-write, so a timeout is
    // deliberately not retryable on its own.
    let calls = 0;
    const result = await executeNodeWithPolicy({
      run: () => {
        calls += 1;
        return new Promise<string>(() => {});
      },
      policy: { timeoutMs: 20, retry: { attempts: 3, backoffMs: 1 } },
      envelope: envelope(),
      nodeId: 'hang',
    });

    expect(result.ok).toBe(false);
    expect(calls).toBe(1);
    expect(result.attempts).toBe(1);
  });

  test('a timeout IS retried when an idempotency key makes a repeat safe', async () => {
    let calls = 0;
    const result = await executeNodeWithPolicy({
      run: () => {
        calls += 1;
        if (calls === 1) {
          return new Promise<string>(() => {});
        }
        return Promise.resolve('ok');
      },
      policy: { timeoutMs: 20, retry: { attempts: 2, backoffMs: 1 }, idempotencyKey: 'k' },
      envelope: envelope(),
      nodeId: 'hang',
    });

    expect(result.ok).toBe(true);
    expect(calls).toBe(2);
  });

  test('idempotency keys resolve payload references so each row keys separately', () => {
    const env = envelope({ taskId: 'T-7' });
    expect(resolveIdempotencyKey({ idempotencyKey: '{{payload.taskId}}' }, env)).toBe(
      'app-lab-tasklist.task.created:T-7',
    );

    // An item's own json wins over the event payload — a loop over rows must not collapse to one key.
    const item = singleItemOutput({ taskId: 'T-9' }).items[0]!;
    expect(resolveIdempotencyKey({ idempotencyKey: '{{payload.taskId}}' }, env, item)).toBe(
      'app-lab-tasklist.task.created:T-9',
    );
  });

  test('a key template that resolves to nothing is ignored, not shared', () => {
    // Otherwise every item would share one key and all but the first effect would be suppressed
    // silently — the worst possible failure mode for an automation.
    const env = envelope({});
    expect(resolveIdempotencyKey({ idempotencyKey: 'task.{{payload.missing}}' }, env)).toBeNull();
    expect(resolveIdempotencyKey(undefined, env)).toBeNull();
  });

  test('the ledger refuses a repeated key but forgets an expired one', () => {
    const ledger = new LabWorkflowIdempotencyLedger(20);
    expect(ledger.has('k')).toBe(false);
    ledger.remember('k');
    expect(ledger.has('k')).toBe(true);
    ledger.clear();
    expect(ledger.has('k')).toBe(false);
  });

  test('an expired key becomes available again', async () => {
    const ledger = new LabWorkflowIdempotencyLedger(10);
    ledger.remember('k');
    await new Promise((resolve) => setTimeout(resolve, 25));
    expect(ledger.has('k')).toBe(false);
  });
});
