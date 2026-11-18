import { DateTime } from 'luxon';
import { parseSqliteUtcDateTimeMs } from '@/shared/utils/sqlite-datetime';

describe('parseSqliteUtcDateTimeMs', () => {
  test('parses SQLite datetime as UTC, not local', () => {
    const text = '2026-10-30 01:39:37';
    const expectedUtc = DateTime.fromSQL(text, { zone: 'utc' }).toMillis();
    expect(parseSqliteUtcDateTimeMs(text)).toBe(expectedUtc);
    // Date.parse(isoLocal) equals UTC ms on UTC hosts — use a fixed offset zone instead.
    const misreadAsChicagoLocal = DateTime.fromSQL(text, { zone: 'America/Chicago' }).toMillis();
    expect(misreadAsChicagoLocal).not.toBe(expectedUtc);
    expect(parseSqliteUtcDateTimeMs(text)).not.toBe(misreadAsChicagoLocal);
  });
});
