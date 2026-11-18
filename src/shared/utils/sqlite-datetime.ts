import { DateTime } from 'luxon';

/**
 * Parse SQLite `datetime('now')` values (`YYYY-MM-DD HH:MM:SS`) as **UTC** epoch ms.
 * `Date.parse` treats the space form as local time and breaks turn timers on non-UTC hosts.
 */
export function parseSqliteUtcDateTimeMs(text: string): number {
  const iso = DateTime.fromISO(text, { zone: 'utc' });
  if (iso.isValid) {
    return iso.toMillis();
  }
  const sql = DateTime.fromSQL(text, { zone: 'utc' });
  if (sql.isValid) {
    return sql.toMillis();
  }
  const fallback = Date.parse(text);
  return Number.isNaN(fallback) ? Date.now() : fallback;
}
