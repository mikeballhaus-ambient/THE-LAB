import { describe, expect, test } from '@jest/globals';
import {
  hashWebhookToken,
  parseWebhookPayload,
  signWebhookBody,
  verifyWebhookSignature,
} from '@/shared/utils/lab-workflow-webhook-auth';
import { LAB_WORKFLOW_WEBHOOK_REPLAY_WINDOW_MS } from '@/shared/types/lab-workflow-webhook';

/**
 * W10a — inbound webhook authentication.
 *
 * The two failure modes worth testing are opposites: accepting a request that should have been
 * refused (anyone can run any workflow) and refusing one that should have been accepted (a caller
 * is silently ignored, and nothing appears in the run history to explain it).
 */

const SECRET = 'a-shared-secret';
const BODY = '{"taskId":"t-1"}';
const NOW = Date.UTC(2026, 9, 19, 12, 0, 0);
const NOW_SECONDS = String(Math.floor(NOW / 1000));

function verify(overrides: Partial<Parameters<typeof verifyWebhookSignature>[0]> = {}) {
  return verifyWebhookSignature({
    secret: SECRET,
    timestamp: NOW_SECONDS,
    signature: signWebhookBody(SECRET, NOW_SECONDS, BODY),
    rawBody: BODY,
    nowMs: NOW,
    windowMs: LAB_WORKFLOW_WEBHOOK_REPLAY_WINDOW_MS,
    ...overrides,
  });
}

describe('hashWebhookToken', () => {
  test('is deterministic and produces a hex digest', () => {
    const a = hashWebhookToken('token-abc');
    const b = hashWebhookToken('token-abc');
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });

  test('differs for different tokens', () => {
    expect(hashWebhookToken('token-a')).not.toBe(hashWebhookToken('token-b'));
  });

  test('does not contain the token', () => {
    // The point of storing a hash: a database read must not hand someone a working URL.
    expect(hashWebhookToken('token-abc')).not.toContain('token-abc');
  });
});

describe('verifyWebhookSignature', () => {
  test('accepts a correctly signed request', () => {
    expect(verify()).toEqual({ ok: true });
  });

  test('rejects a missing timestamp', () => {
    expect(verify({ timestamp: undefined }).failure).toBe('missing_timestamp');
  });

  test('rejects a missing signature', () => {
    expect(verify({ signature: undefined }).failure).toBe('missing_signature');
  });

  test('rejects a signature made with a different secret', () => {
    const forged = signWebhookBody('another-secret', NOW_SECONDS, BODY);
    expect(verify({ signature: forged }).failure).toBe('bad_signature');
  });

  test('rejects a body that changed after signing', () => {
    // The classic tamper: capture a valid request and edit the payload.
    expect(verify({ rawBody: '{"taskId":"t-2"}' }).failure).toBe('bad_signature');
  });

  test('the timestamp is inside the signed string', () => {
    // Changing the timestamp must invalidate a signature captured for the original one. If the
    // timestamp were not part of the signed input, an attacker could take a valid request, move its
    // timestamp forward, and replay it indefinitely.
    const originalSignature = signWebhookBody(SECRET, NOW_SECONDS, BODY);
    const laterSeconds = String(Number(NOW_SECONDS) + 60);
    expect(verify({ timestamp: laterSeconds, signature: originalSignature }).failure).toBe(
      'bad_signature',
    );
  });

  test('rejects a timestamp outside the window', () => {
    const oldSeconds = String(Number(NOW_SECONDS) - 600);
    const oldSignature = signWebhookBody(SECRET, oldSeconds, BODY);
    expect(verify({ timestamp: oldSeconds, signature: oldSignature }).failure).toBe(
      'stale_timestamp',
    );
  });

  test('accepts a timestamp at the edge of the window', () => {
    const edgeSeconds = String(Number(NOW_SECONDS) - Math.floor(LAB_WORKFLOW_WEBHOOK_REPLAY_WINDOW_MS / 1000));
    const edgeSignature = signWebhookBody(SECRET, edgeSeconds, BODY);
    expect(verify({ timestamp: edgeSeconds, signature: edgeSignature })).toEqual({ ok: true });
  });

  test('rejects a timestamp from the future', () => {
    // A future timestamp is as suspect as an old one: accepting it would let a captured request be
    // replayed once its timestamp aged in rather than out.
    const futureSeconds = String(Number(NOW_SECONDS) + 3600);
    const futureSignature = signWebhookBody(SECRET, futureSeconds, BODY);
    expect(verify({ timestamp: futureSeconds, signature: futureSignature }).failure).toBe(
      'stale_timestamp',
    );
  });

  test('rejects a non-numeric timestamp', () => {
    const signature = signWebhookBody(SECRET, 'yesterday', BODY);
    expect(verify({ timestamp: 'yesterday', signature }).failure).toBe('stale_timestamp');
  });

  test('rejects a malformed signature without throwing', () => {
    // A wrong-length or non-hex signature must be a rejection, not a 500.
    expect(verify({ signature: 'zzzz' }).failure).toBe('bad_signature');
  });

  test('an empty secret still verifies deterministically rather than always passing', () => {
    // Defensive: if a hook were ever stored with an empty secret, it must not silently accept every
    // caller. The signature is computable, but it is not *absent*.
    const emptySig = signWebhookBody('', NOW_SECONDS, BODY);
    expect(verify({ secret: '', signature: emptySig })).toEqual({ ok: true });
    expect(verify({ secret: '', signature: signWebhookBody(SECRET, NOW_SECONDS, BODY) }).failure).toBe(
      'bad_signature',
    );
  });
});

describe('parseWebhookPayload', () => {
  test('parses an object body', () => {
    expect(parseWebhookPayload('{"a":1}')).toEqual({ a: 1 });
  });

  test('an empty body becomes an empty payload', () => {
    expect(parseWebhookPayload('')).toEqual({});
    expect(parseWebhookPayload('   ')).toEqual({});
  });

  test('`null` becomes an empty payload', () => {
    expect(parseWebhookPayload('null')).toEqual({});
  });

  test('rejects an array body', () => {
    // A domain-event payload is an object; an array would make every `path` resolve strangely.
    expect(parseWebhookPayload('[1,2,3]')).toBeNull();
  });

  test('rejects a scalar body', () => {
    expect(parseWebhookPayload('42')).toBeNull();
    expect(parseWebhookPayload('"text"')).toBeNull();
  });

  test('rejects malformed JSON', () => {
    expect(parseWebhookPayload('{not json')).toBeNull();
  });
});
