import { describe, expect, test } from '@jest/globals';
import { z } from 'zod';
import { catalogPositiveInt, catalogZodParse } from '@/shared/server/catalog-zod-parse';

describe('catalogPositiveInt', () => {
  test('coerces numeric strings from Forms Builder Select lookups', () => {
    expect(catalogPositiveInt.parse('12')).toBe(12);
    expect(catalogPositiveInt.parse(3)).toBe(3);
  });

  test('rejects non-positive values', () => {
    expect(catalogPositiveInt.safeParse('0').success).toBe(false);
    expect(catalogPositiveInt.safeParse('abc').success).toBe(false);
  });
});

describe('catalogZodParse', () => {
  test('throws with Zod message on invalid body', () => {
    const parse = catalogZodParse(z.object({ pollId: catalogPositiveInt }));
    expect(() => parse({ pollId: 'nope' })).toThrow(/Invalid input/);
    expect(parse({ pollId: '7' })).toEqual({ pollId: 7 });
  });
});
