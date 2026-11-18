const DATE_ONLY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Format a Date as local calendar YYYY-MM-DD (no UTC shift). */
export function formatCalendarDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Format a Date as local ISO-like datetime YYYY-MM-DDTHH:mm:ss (no timezone suffix). */
export function formatLocalDateTime(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const h = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  const s = String(date.getSeconds()).padStart(2, '0');
  return `${y}-${m}-${d}T${h}:${min}:${s}`;
}

/** Parse YYYY-MM-DD as local midnight. */
export function parseCalendarDate(text: string): Date | undefined {
  const trimmed = text.trim();
  const match = DATE_ONLY_RE.exec(trimmed);
  if (!match) {
    return undefined;
  }
  const y = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  const day = Number(match[3]);
  const date = new Date(y, monthIndex, day);
  if (
    date.getFullYear() !== y
    || date.getMonth() !== monthIndex
    || date.getDate() !== day
  ) {
    return undefined;
  }
  return date;
}

/** Parse API / form values into a local calendar Date. */
export function parseDueDateValue(raw: unknown): Date | undefined {
  if (raw == null || raw === '') {
    return undefined;
  }
  if (raw instanceof Date) {
    return Number.isNaN(raw.getTime()) ? undefined : raw;
  }
  const text = String(raw).trim();
  if (!text) {
    return undefined;
  }
  const dateOnly = parseCalendarDate(text);
  if (dateOnly) {
    return dateOnly;
  }
  const localDateTime = parseLocalDateTimeString(text);
  if (localDateTime) {
    return localDateTime;
  }
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

const LOCAL_DATETIME_RE =
  /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?$/;

/** Parse `YYYY-MM-DDTHH:mm:ss` (or space separator) as local clock time. */
export function parseLocalDateTimeString(text: string): Date | undefined {
  const trimmed = text.trim();
  const match = LOCAL_DATETIME_RE.exec(trimmed);
  if (!match) {
    return undefined;
  }
  const y = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = match[6] != null ? Number(match[6]) : 0;
  const date = new Date(y, monthIndex, day, hour, minute, second, 0);
  if (
    date.getFullYear() !== y
    || date.getMonth() !== monthIndex
    || date.getDate() !== day
    || date.getHours() !== hour
    || date.getMinutes() !== minute
  ) {
    return undefined;
  }
  return date;
}

/** User-facing label for a due date (local calendar). */
export function formatCalendarDateDisplay(value: Date | string): string {
  const date = value instanceof Date ? value : parseDueDateValue(value);
  if (!date) {
    return '';
  }
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/** Persist due dates as date-only strings in app DB. */
export function normalizeStoredDueDate(value: Date | string | undefined | null): string | null {
  if (value == null) {
    return null;
  }
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : formatCalendarDate(value);
  }
  const trimmed = String(value).trim();
  if (!trimmed) {
    return null;
  }
  if (DATE_ONLY_RE.test(trimmed)) {
    return trimmed;
  }
  const parsed = parseDueDateValue(trimmed);
  return parsed ? formatCalendarDate(parsed) : trimmed;
}
