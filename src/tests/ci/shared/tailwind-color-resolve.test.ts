import { describe, expect, test } from '@jest/globals';
import {
  findNearestCatalogSelection,
  formatTailwindUtilityClass,
  parseTokenValueToUtility,
  resolveTailwindColorUtility,
} from '@/shared/theme/tailwind-color-resolve';

describe('tailwind-color-resolve (rm-49 phase 9)', () => {
  test('resolveTailwindColorUtility returns hex at 100% opacity', () => {
    expect(resolveTailwindColorUtility('bg', 'slate', 900, 100)).toBe('#0f172a');
  });

  test('resolveTailwindColorUtility applies alpha for partial opacity', () => {
    expect(resolveTailwindColorUtility('bg', 'slate', 600, 65)).toBe('rgb(71 85 105 / 0.65)');
  });

  test('formatTailwindUtilityClass omits suffix at 100%', () => {
    expect(formatTailwindUtilityClass('text', 'slate', 50, 100)).toBe('text-slate-50');
    expect(formatTailwindUtilityClass('border', 'slate', 600, 65)).toBe('border-slate-600/65');
  });

  test('parseTokenValueToUtility round-trips hex and rgb', () => {
    const hex = resolveTailwindColorUtility('bg', 'slate', 900);
    const fromHex = parseTokenValueToUtility(hex);
    expect(fromHex).toEqual({ palette: 'slate', step: 900, opacityPercent: 100 });

    const rgb = resolveTailwindColorUtility('bg', 'slate', 600, 65);
    const fromRgb = parseTokenValueToUtility(rgb);
    expect(fromRgb).toEqual({ palette: 'slate', step: 600, opacityPercent: 65 });
  });

  test('indigo preset hex resolves to exact catalog match', () => {
    expect(parseTokenValueToUtility('#312e81')).toEqual({
      palette: 'indigo',
      step: 900,
      opacityPercent: 100,
    });
  });

  test('findNearestCatalogSelection marks non-catalog colors as approximate', () => {
    const nearest = findNearestCatalogSelection('#dbe2eb');
    expect(nearest?.exact).toBe(false);
    expect(nearest?.palette).toBe('slate');
  });
});
