import type { FastifyReply, FastifyRequest } from 'fastify';
import { resolveFormsPublicSubmitRateLimit } from '@/shared/config/forms-public-rate-limit';

type Bucket = { count: number; windowStartMs: number };

const buckets = new Map<string, Bucket>();

export function resetFormsPublicSubmitRateLimitForTests(): void {
  buckets.clear();
}

export function resolveClientKeyForRateLimit(request: FastifyRequest): string {
  const forwarded = request.headers['x-forwarded-for'];
  const raw = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  if (raw) {
    const first = raw.split(',')[0]?.trim();
    if (first) {
      return first;
    }
  }
  return request.ip ?? 'unknown';
}

/** Returns true if request is allowed; sends 429 and returns false when limited. */
export async function enforceFormsPublicSubmitRateLimit(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<boolean> {
  const { max, windowMs } = resolveFormsPublicSubmitRateLimit();
  const key = resolveClientKeyForRateLimit(request);
  const now = Date.now();
  let bucket = buckets.get(key);
  if (!bucket || now - bucket.windowStartMs >= windowMs) {
    bucket = { count: 0, windowStartMs: now };
    buckets.set(key, bucket);
  }
  bucket.count += 1;
  if (bucket.count > max) {
    const retryAfterSec = Math.ceil((bucket.windowStartMs + windowMs - now) / 1000);
    reply.header('Retry-After', String(Math.max(retryAfterSec, 1)));
    await reply.status(429).send({
      success: false,
      error: 'RATE_LIMIT_EXCEEDED',
      message: `Too many form submissions. Limit is ${max} per ${Math.round(windowMs / 1000)}s.`,
    });
    return false;
  }
  return true;
}
