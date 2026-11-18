const WINDOW_MS = 60_000;
const MAX_SENDS_PER_WINDOW = 30;

type Bucket = { count: number; windowStart: number };

const buckets = new Map<number, Bucket>();

export function checkCommsSendRateLimit(userId: number): { allowed: boolean; retryAfterMs?: number } {
  const now = Date.now();
  let bucket = buckets.get(userId);
  if (!bucket || now - bucket.windowStart >= WINDOW_MS) {
    bucket = { count: 0, windowStart: now };
    buckets.set(userId, bucket);
  }
  if (bucket.count >= MAX_SENDS_PER_WINDOW) {
    const retryAfterMs = WINDOW_MS - (now - bucket.windowStart);
    return { allowed: false, retryAfterMs: Math.max(retryAfterMs, 1) };
  }
  bucket.count += 1;
  return { allowed: true };
}

/** Test helper */
export function resetCommsRateLimits(): void {
  buckets.clear();
}
