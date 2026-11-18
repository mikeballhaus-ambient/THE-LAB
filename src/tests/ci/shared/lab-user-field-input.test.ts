import { describe, expect, test } from '@jest/globals';
import {
  isLabUserLookupId,
  labUserFieldSchema,
  resolveLabUserFieldValue,
} from '@/shared/server/lab-user-field-input';

/**
 * These tests avoid mocking the platform client — this repo runs Jest in ESM mode without
 * module mocking wired up. The resolution tests therefore rely on the real fetch failing
 * (no platform running in CI), which exercises the "keep the id" fallback path.
 */

describe('labUserFieldSchema', () => {
  test('accepts a display name', () => {
    expect(labUserFieldSchema.parse('Mia Chen')).toBe('Mia Chen');
  });

  test('accepts a numeric lookup id — the shape Forms Builder actually submits', () => {
    // The regression: `z.string()` rejected this and the request 400'd.
    expect(labUserFieldSchema.parse(2)).toBe(2);
  });

  test('accepts null and undefined', () => {
    expect(labUserFieldSchema.parse(null)).toBeNull();
    expect(labUserFieldSchema.parse(undefined)).toBeUndefined();
  });

  test('rejects objects and arrays', () => {
    expect(labUserFieldSchema.safeParse({ id: 2 }).success).toBe(false);
    expect(labUserFieldSchema.safeParse([2]).success).toBe(false);
  });
});

describe('isLabUserLookupId', () => {
  test('recognizes positive integers only', () => {
    expect(isLabUserLookupId(2)).toBe(true);
    expect(isLabUserLookupId(0)).toBe(false);
    expect(isLabUserLookupId(-1)).toBe(false);
    expect(isLabUserLookupId(1.5)).toBe(false);
    expect(isLabUserLookupId('2')).toBe(false);
  });
});

describe('resolveLabUserFieldValue', () => {
  test('passes a display name through unchanged', async () => {
    const value = await resolveLabUserFieldValue('Mia Chen', 1);
    expect(value).toEqual({ name: 'Mia Chen', raw: 'Mia Chen' });
    expect(value.userId).toBeUndefined();
  });

  test('keeps a lookup id even when the platform lookup fails', async () => {
    // No platform server in CI → fetch rejects → we still must not lose the id.
    const value = await resolveLabUserFieldValue(2, 1);
    expect(value.userId).toBe(2);
    expect(value.raw).toBe(2);
    expect(typeof value.name).toBe('string');
  });

  test('treats a numeric string as an id', async () => {
    const value = await resolveLabUserFieldValue('2', 1);
    expect(value.userId).toBe(2);
    expect(value.raw).toBe('2');
  });

  test('uses a supplied platform name and skips the fetch', async () => {
    const value = await resolveLabUserFieldValue(2, 1, { platformName: 'Mia Chen' });
    expect(value).toEqual({ userId: 2, name: 'Mia Chen', raw: 2 });
  });

  test('returns empty for blank input', async () => {
    expect(await resolveLabUserFieldValue('', 1)).toEqual({ name: '', raw: null });
    expect(await resolveLabUserFieldValue(null, 1)).toEqual({ name: '', raw: null });
    expect(await resolveLabUserFieldValue(undefined, 1)).toEqual({ name: '', raw: null });
  });

  test('rejects a non-integer number', async () => {
    await expect(resolveLabUserFieldValue(1.5, 1)).rejects.toThrow(
      /must be a positive THE-LAB user id/,
    );
  });

  test('trims whitespace from names', async () => {
    const value = await resolveLabUserFieldValue('  Mia Chen  ', 1);
    expect(value.name).toBe('Mia Chen');
  });
});
