import { describe, test, expect } from '@jest/globals';
import {
  groupContainerChildrenStyle,
  resolveGroupChildrenDirection,
  clampGroupInnerColumns,
} from '@/shared/forms/group-container-layout';

describe('group container child layout', () => {
  test('vertical layout uses flex column', () => {
    const css = groupContainerChildrenStyle({ childrenDirection: 'vertical' });
    expect(css.display).toBe('flex');
    expect(css.flexDirection).toBe('column');
  });

  test('horizontal layout uses grid with inner column count', () => {
    const css = groupContainerChildrenStyle({ childrenDirection: 'horizontal', innerColumns: 3 });
    expect(css.display).toBe('grid');
    expect(css.gridTemplateColumns).toBe('repeat(3, minmax(0, 1fr))');
  });

  test('resolveGroupChildrenDirection reads legacy flexDirection row', () => {
    expect(resolveGroupChildrenDirection({ flexDirection: 'row' })).toBe('horizontal');
  });

  test('clampGroupInnerColumns bounds 1–8', () => {
    expect(clampGroupInnerColumns(0)).toBe(1);
    expect(clampGroupInnerColumns(12)).toBe(8);
    expect(clampGroupInnerColumns(4)).toBe(4);
  });
});
