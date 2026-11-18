import { describe, expect, test } from '@jest/globals';
import { contrastRatio, isAaBodyText } from '@/shared/theme/lab-theme-contrast';

describe('lab-theme-contrast', () => {
  test('contrastRatio for black on white', () => {
    const ratio = contrastRatio('#000000', '#ffffff');
    expect(ratio).not.toBeNull();
    expect(ratio!).toBeGreaterThan(20);
    expect(isAaBodyText(ratio)).toBe(true);
  });

  test('low contrast pair fails AA', () => {
    const ratio = contrastRatio('#94a3b8', '#64748b');
    expect(ratio).not.toBeNull();
    expect(isAaBodyText(ratio)).toBe(false);
  });
});
