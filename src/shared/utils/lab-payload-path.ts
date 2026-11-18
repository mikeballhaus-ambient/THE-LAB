/** Resolve a dot path on a plain object payload. */
export function getPayloadValueAtPath(payload: Record<string, unknown>, path: string): unknown {
  const keys = path.split('.').filter(Boolean);
  let value: unknown = payload;
  for (const key of keys) {
    if (value == null || typeof value !== 'object') {
      return undefined;
    }
    value = (value as Record<string, unknown>)[key];
  }
  return value;
}

/**
 * Write a dot path on a plain object, creating intermediate objects.
 *
 * Workflows address fields as `invoice.total`, so a Set node author expects the nesting to appear.
 * An empty segment is ignored (as in the getter) rather than producing a key named `''`.
 */
export function setPayloadValueAtPath(
  payload: Record<string, unknown>,
  path: string,
  value: unknown,
): void {
  const keys = path.split('.').filter(Boolean);
  if (!keys.length) {
    return;
  }
  let current: Record<string, unknown> = payload;
  for (const key of keys.slice(0, -1)) {
    const next = current[key];
    if (next == null || typeof next !== 'object' || Array.isArray(next)) {
      const created: Record<string, unknown> = {};
      current[key] = created;
      current = created;
      continue;
    }
    current = next as Record<string, unknown>;
  }
  current[keys[keys.length - 1]] = value;
}

/** Parse a lab user id from payload field (number or numeric string). */
export function parseLabUserIdFromPayloadValue(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return Math.trunc(value);
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }
    // `Number.parseInt('mia@lab.local', 10)` is `NaN`, so an email falls through to null rather than
    // being misread. The guard below is what stops `parseInt` accepting a *prefix* — `'2abc'` would
    // otherwise resolve to user 2 and silently notify the wrong person.
    if (!/^\d+$/.test(trimmed)) {
      return null;
    }
    const parsed = Number.parseInt(trimmed, 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return null;
}

/**
 * Parse a user email from a payload field.
 *
 * Deliberately permissive about the shape (one `@`, no whitespace): the value is only ever used as an
 * exact-match lookup key against `users.email`, so a stricter regex would reject addresses the
 * platform itself accepts while buying no safety. What matters is that a *user id* does not fall
 * through here — `parseLabUserIdFromPayloadValue` already claimed those.
 */
export function parseLabUserEmailFromPayloadValue(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed || !trimmed.includes('@') || /\s/.test(trimmed)) {
    return null;
  }
  return trimmed;
}

/**
 * A recipient as named by an event payload — **either** identity the author may have to hand.
 *
 * A webhook caller knows its own user id, a connector row knows an email, and a Task List event knows
 * an `assigneeId`. Forcing the author to reshape one into the other is a `set_fields` node whose only
 * job is to lie about what the payload contains, so the resolution happens here instead.
 */
export type LabPayloadRecipient = { userId: number } | { email: string } | null;

/** Read a recipient from one payload path, preferring a numeric user id over an email. */
export function parseLabPayloadRecipient(value: unknown): LabPayloadRecipient {
  const userId = parseLabUserIdFromPayloadValue(value);
  if (userId != null) {
    return { userId };
  }
  const email = parseLabUserEmailFromPayloadValue(value);
  if (email != null) {
    return { email };
  }
  return null;
}

export function resolvePayloadLabUserId(
  payload: Record<string, unknown>,
  path: string,
): number | null {
  return parseLabUserIdFromPayloadValue(getPayloadValueAtPath(payload, path));
}

/**
 * Resolve a payload path to *either* a user id or an email.
 *
 * Use this wherever a step may be pointed at a person; `resolvePayloadLabUserId` remains for callers
 * that genuinely only accept an id (none of the reminder/notification nodes should).
 */
export function resolvePayloadRecipient(
  payload: Record<string, unknown>,
  path: string,
): LabPayloadRecipient {
  if (!path?.trim()) {
    return null;
  }
  return parseLabPayloadRecipient(getPayloadValueAtPath(payload, path));
}
