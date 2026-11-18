import { getPayloadValueAtPath } from '@/shared/utils/lab-payload-path';

/** Resolve a mapper path against workflow item `json` (flat event fields) or `payload.*` aliases. */
export function resolveWorkflowBodySourcePath(
  payload: Record<string, unknown>,
  path: string,
): unknown {
  const trimmed = path.trim();
  if (!trimmed) {
    return undefined;
  }
  const direct = getPayloadValueAtPath(payload, trimmed);
  if (direct !== undefined) {
    return direct;
  }
  const withoutPayloadPrefix = trimmed.replace(/^payload\./, '');
  if (withoutPayloadPrefix !== trimmed) {
    return getPayloadValueAtPath(payload, withoutPayloadPrefix);
  }
  return undefined;
}

export function mergeIntegrationBodyFromPayload(
  payload: Record<string, unknown>,
  bodyFromPayload?: Record<string, string>,
  staticBody?: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...(staticBody ?? {}) };
  for (const [field, path] of Object.entries(bodyFromPayload ?? {})) {
    const value = resolveWorkflowBodySourcePath(payload, path);
    if (value !== undefined) {
      out[field] = value;
    }
  }
  return out;
}

export function resolveRecordIdFromPayload(
  payload: Record<string, unknown>,
  recordIdPath: string,
): string | number | null {
  const raw = getPayloadValueAtPath(payload, recordIdPath);
  if (raw === undefined || raw === null) {
    return null;
  }
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return raw;
  }
  if (typeof raw === 'string' && raw.trim() !== '') {
    const asNum = Number.parseInt(raw, 10);
    if (String(asNum) === raw.trim()) {
      return asNum;
    }
    return raw;
  }
  return null;
}
