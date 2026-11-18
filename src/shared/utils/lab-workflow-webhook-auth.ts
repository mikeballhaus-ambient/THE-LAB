/**
 * Webhook authentication: token hashing, HMAC verification, replay rejection.
 *
 * Pure and dependency-free apart from `node:crypto`, so every rule is testable without a server.
 * That matters more here than anywhere else in the programme: the failure mode of a wrong check is
 * either "anyone can run any workflow" or "a legitimate caller is silently ignored", and neither
 * shows up in a workflow's run history.
 */

import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Hash a webhook token for storage.
 *
 * Plain SHA-256, not a password hash. A token is 32 bytes of CSPRNG output, so there is no dictionary
 * to attack and no need for a slow KDF — and lookup has to be by hash, which a salted hash makes
 * impossible without scanning every row.
 */
export function hashWebhookToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

/** Hex HMAC-SHA256 of `${timestamp}.${rawBody}`. The timestamp is inside the signature so it cannot
 *  be rewritten by an attacker who captured a valid body. */
export function signWebhookBody(secret: string, timestamp: string, rawBody: string): string {
  return createHmac('sha256', secret).update(`${timestamp}.${rawBody}`, 'utf8').digest('hex');
}

export type WebhookVerificationFailure =
  | 'missing_timestamp'
  | 'missing_signature'
  | 'stale_timestamp'
  | 'bad_signature';

export interface WebhookVerifyResult {
  ok: boolean;
  failure?: WebhookVerificationFailure;
}

/**
 * Verify a signed webhook call.
 *
 * `nowMs` is injected rather than read from the clock so the window can be tested at its boundaries.
 *
 * The timestamp is checked **before** the signature. An old request is rejected on the cheap path, and
 * — more importantly — a stale timestamp combined with a valid signature is a replay, which is a
 * different (and more alarming) event than a bad signature. Reporting them the same way would hide a
 * leaked-and-replayed secret behind the noise of ordinary typos.
 */
export function verifyWebhookSignature(params: {
  secret: string;
  timestamp: string | undefined;
  signature: string | undefined;
  rawBody: string;
  nowMs: number;
  windowMs: number;
}): WebhookVerifyResult {
  const { secret, timestamp, signature, rawBody, nowMs, windowMs } = params;
  if (!timestamp) {
    return { ok: false, failure: 'missing_timestamp' };
  }
  if (!signature) {
    return { ok: false, failure: 'missing_signature' };
  }

  const sentMs = Number(timestamp) * 1000;
  if (!Number.isFinite(sentMs)) {
    return { ok: false, failure: 'stale_timestamp' };
  }
  // Absolute difference, not `now - sent > window`: a timestamp from the *future* is as suspect as an
  // old one, and accepting it would let a captured request be replayed once its timestamp aged in.
  if (Math.abs(nowMs - sentMs) > windowMs) {
    return { ok: false, failure: 'stale_timestamp' };
  }

  const expected = signWebhookBody(secret, timestamp, rawBody);
  if (!constantTimeHexEqual(expected, signature)) {
    return { ok: false, failure: 'bad_signature' };
  }
  return { ok: true };
}

/**
 * Compare two hex digests without leaking where they differ.
 *
 * `timingSafeEqual` throws when the lengths differ, so the length is compared first — that is not a
 * secret (a digest length is public), and it keeps a malformed signature from becoming a 500.
 */
function constantTimeHexEqual(expected: string, received: string): boolean {
  if (expected.length !== received.length) {
    return false;
  }
  try {
    return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(received, 'hex'));
  } catch {
    return false;
  }
}

/**
 * Extract a caller-provided payload.
 *
 * The body must be a JSON **object**: an array or a scalar cannot be a domain-event payload, and
 * accepting one would produce an envelope that every `path` in the graph resolves against strangely.
 */
export function parseWebhookPayload(rawBody: string): Record<string, unknown> | null {
  if (!rawBody.trim()) {
    return {};
  }
  try {
    const parsed = JSON.parse(rawBody) as unknown;
    if (parsed == null) {
      return {};
    }
    if (typeof parsed !== 'object' || Array.isArray(parsed)) {
      return null;
    }
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}
