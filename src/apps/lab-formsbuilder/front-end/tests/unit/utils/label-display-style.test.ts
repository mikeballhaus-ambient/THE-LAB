import { describe, expect, test } from '@jest/globals';
import {
  buildLabelTailwindClasses,
  DEFAULT_LABEL_DISPLAY_STYLE,
  normalizeLabelDisplayStyle,
} from '@/shared/forms/label-display-style';

describe('label-display-style', () => {
  test('buildLabelTailwindClasses composes Tailwind tokens', () => {
    expect(buildLabelTailwindClasses(DEFAULT_LABEL_DISPLAY_STYLE)).toContain('text-base');
    expect(buildLabelTailwindClasses({
      textSize: 'text-xl',
      textColor: 'text-cyan-300',
      fontWeight: 'font-bold',
      textAlign: 'text-center',
      customClasses: 'uppercase',
    })).toBe('text-xl text-cyan-300 font-bold text-center uppercase');
  });

  test('normalizeLabelDisplayStyle fills defaults', () => {
    expect(normalizeLabelDisplayStyle()).toEqual(DEFAULT_LABEL_DISPLAY_STYLE);
  });
});
