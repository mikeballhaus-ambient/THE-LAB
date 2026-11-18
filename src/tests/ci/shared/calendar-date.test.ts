import { describe, expect, test } from '@jest/globals';
import {
  formatCalendarDate,
  formatCalendarDateDisplay,
  formatLocalDateTime,
  parseCalendarDate,
  parseDueDateValue,
  parseLocalDateTimeString,
} from '@/shared/utils/calendar-date';

describe('calendar-date', () => {
  test('formatLocalDateTime uses local clock', () => {
    const dt = new Date(2026, 9, 15, 14, 5, 7);
    expect(formatLocalDateTime(dt)).toBe('2026-10-15T14:05:07');
  });

  test('parseLocalDateTimeString reads local clock', () => {
    const parsed = parseLocalDateTimeString('2026-10-10T17:00:00');
    expect(parsed?.getFullYear()).toBe(2026);
    expect(parsed?.getMonth()).toBe(9);
    expect(parsed?.getDate()).toBe(10);
    expect(parsed?.getHours()).toBe(17);
    expect(parsed?.getMinutes()).toBe(0);
  });

  test('formatCalendarDate uses local calendar day', () => {
    const localMidnight = new Date(2026, 9, 15, 0, 0, 0, 0);
    expect(formatCalendarDate(localMidnight)).toBe('2026-10-15');
  });

  test('parseCalendarDate is local midnight', () => {
    const parsed = parseCalendarDate('2026-10-15');
    expect(parsed?.getFullYear()).toBe(2026);
    expect(parsed?.getMonth()).toBe(9);
    expect(parsed?.getDate()).toBe(15);
  });

  test('parseDueDateValue treats date-only as local', () => {
    const parsed = parseDueDateValue('2026-10-15');
    expect(parsed?.getDate()).toBe(15);
    expect(formatCalendarDateDisplay('2026-10-15')).toMatch(/15/);
  });
});
