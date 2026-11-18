/** KB document RAG (kb-chunks) — env-driven gates. */

export function isKbRagIngestEnabled(): boolean {
  return process.env.LAB_KB_RAG_INGEST_ON_PUBLISH !== '0';
}

export function isKbRagStartupReconcileEnabled(): boolean {
  return process.env.LAB_KB_RAG_STARTUP_RECONCILE !== '0';
}

export function isKbRagSlotAEnabled(): boolean {
  return process.env.LAB_KB_RAG_SLOT_A === '1';
}

export function isKbRagHybridSearchEnabled(): boolean {
  return process.env.LAB_KB_RAG_HYBRID_SEARCH === '1';
}

export function resolveKbRagEmbedUserId(): number {
  const raw = process.env.LAB_KB_RAG_EMBED_USER_ID;
  const parsed = raw !== undefined ? Number(raw) : 1;
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 1;
}

export function resolveKbRagPreinjectTopK(): number {
  const raw = process.env.LAB_KB_RAG_TOP_K;
  const parsed = raw !== undefined ? Number(raw) : 3;
  return Number.isFinite(parsed) && parsed > 0 ? Math.min(10, Math.floor(parsed)) : 3;
}

export function resolveKbRagMinScore(): number {
  const raw = process.env.LAB_KB_RAG_MIN_SCORE;
  const parsed = raw !== undefined ? Number(raw) : 0.15;
  return Number.isFinite(parsed) ? parsed : 0.15;
}

export function resolveKbRagMinQueryChars(): number {
  const raw = process.env.LAB_KB_RAG_MIN_QUERY_CHARS;
  const parsed = raw !== undefined ? Number(raw) : 8;
  return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : 8;
}

export function resolveKbRagMaxAppendixChars(): number {
  const raw = process.env.LAB_KB_RAG_MAX_APPENDIX_CHARS;
  const parsed = raw !== undefined ? Number(raw) : 4000;
  return Number.isFinite(parsed) && parsed > 256 ? Math.floor(parsed) : 4000;
}

export function isKbRagStructuredLogsEnabled(): boolean {
  return process.env.LAB_STRUCTURED_LOGS === '1';
}