/**
 * Safe narrowing helpers for SQLite rows, socket payloads, and JSON columns.
 */

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Narrow a better-sqlite3 row (or similar) to a string-keyed record. */
export function asDbRow(row: unknown): Record<string, unknown> {
  if (isRecord(row)) {
    return row;
  }
  throw new Error('Expected a database row object');
}

/** JSON column values from SQLite — only strings are parsed. */
export function asJsonColumnString(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  return typeof value === 'string' ? value : null;
}

export function asOptionalString(value: unknown): string | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return undefined;
}

export function asString(value: unknown, fallback = ''): string {
  return asOptionalString(value) ?? fallback;
}

export function asTraceHeader(value: unknown): string {
  if (typeof value === 'string' && value.length > 0) {
    return value;
  }
  if (Array.isArray(value)) {
    const first = value.find((entry) => typeof entry === 'string' && entry.length > 0);
    if (typeof first === 'string') {
      return first;
    }
  }
  return '';
}
