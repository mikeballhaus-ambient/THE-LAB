/** rm-46 Phase 2.3 — bound Chroma session retrieval and semantic summary query sizes. */

const ABSOLUTE_MAX = 500;

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  if (!raw?.trim()) {
    return fallback;
  }
  const n = Number.parseInt(raw.trim(), 10);
  if (!Number.isFinite(n) || n < 1) {
    return fallback;
  }
  return Math.min(n, ABSOLUTE_MAX);
}

/** Messages loaded for chat / summarize (most recent after sort). Default 120. */
export function resolveSessionMessageLimit(requested?: number): number {
  const cap = parsePositiveInt(process.env.LAB_CHROMA_SESSION_NRESULTS, 120);
  if (requested === undefined) {
    return cap;
  }
  return Math.min(requested, cap);
}

/**
 * Upper bound on Chroma `get` for a session before trimming to {@link resolveSessionMessageLimit}.
 * Must be >= session message cap; allows sorting then keeping the latest turns.
 */
export function resolveSessionMessageFetchLimit(): number {
  const messageCap = resolveSessionMessageLimit();
  const fetchCap = parsePositiveInt(process.env.LAB_CHROMA_SESSION_FETCH_LIMIT, 250);
  return Math.max(messageCap, Math.min(fetchCap, ABSOLUTE_MAX));
}

/** Semantic summary retrieval (`col.query`). Default 8, max 50. */
export function resolveSummaryQueryLimit(requested?: number): number {
  const cap = parsePositiveInt(process.env.LAB_CHROMA_SUMMARY_NRESULTS, 8);
  const summaryMax = parsePositiveInt(process.env.LAB_CHROMA_SUMMARY_MAX, 50);
  const effectiveCap = Math.min(cap, summaryMax);
  if (requested === undefined) {
    return effectiveCap;
  }
  return Math.min(requested, effectiveCap);
}

/** Session delete batch size (replaces hard-coded 9999). Default 2000. */
export function resolveSessionDeleteFetchLimit(): number {
  return parsePositiveInt(process.env.LAB_CHROMA_SESSION_DELETE_LIMIT, 2000);
}

/** Default when callers omit nResults (conversation-memory). */
export function defaultSessionRetrieveLimit(): number {
  return resolveSessionMessageLimit();
}
