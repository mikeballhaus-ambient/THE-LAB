import { describe, test, expect } from '@jest/globals';
import { chartColorWithAlpha, hexToRgba } from '@/shared/charts/lab-chart-theme';

describe('lab-chart-theme', () => {
  test('hexToRgba converts 6-digit hex', () => {
    expect(hexToRgba('#6366f1', 0.5)).toBe('rgba(99, 102, 241, 0.5)');
  });

  test('hexToRgba converts 3-digit hex', () => {
    expect(hexToRgba('#abc', 1)).toBe('rgba(170, 187, 204, 1)');
  });

  test('chartColorWithAlpha handles hex', () => {
    expect(chartColorWithAlpha('#000000', 0.2)).toBe('rgba(0, 0, 0, 0.2)');
  });
});
