import { describe, test, expect } from '@jest/globals';
import type { FormComponent } from '@/apps/lab-formsbuilder/shared/types';
import { reflowTopLevelComponentsToGrid } from '@/apps/lab-formsbuilder/front-end/utils/grid-reflow';
import { canPlaceComponentBounds } from '@/apps/lab-formsbuilder/front-end/utils/grid-occupancy';

function field(key: string, row: number, col: number): FormComponent {
  return {
    fieldKey: key,
    label: key,
    type: 'InputText',
    row,
    col,
    span: 1,
  };
}

describe('reflowTopLevelComponentsToGrid', () => {
  test('8 columns in one row reflows to two rows when grid becomes 4 columns', () => {
    const components = Array.from({ length: 8 }, (_, i) => field(`f${i}`, 0, i));
    reflowTopLevelComponentsToGrid(components, 4);

    expect(components).toHaveLength(8);
    const topLevel = components.filter(c => c.parentContainerKey == null);
    for (const c of topLevel) {
      expect(c.col! + (c.span ?? 1)).toBeLessThanOrEqual(4);
    }

    const row0 = topLevel.filter(c => (c.row ?? 0) === 0);
    const row1 = topLevel.filter(c => (c.row ?? 0) === 1);
    expect(row0).toHaveLength(4);
    expect(row1).toHaveLength(4);

    for (const c of topLevel) {
      expect(
        canPlaceComponentBounds(c, c.row ?? 0, c.col ?? 0, topLevel.filter(x => x !== c), c, 4),
      ).toBe(true);
    }
  });

  test('does not reflow children inside containers', () => {
    const group: FormComponent = {
      fieldKey: 'g1',
      label: 'Group',
      type: 'Group',
      row: 0,
      col: 0,
      span: 2,
    };
    const child: FormComponent = {
      fieldKey: 'inner',
      label: 'Inner',
      type: 'InputText',
      row: 0,
      col: 5,
      parentContainerKey: 'g1',
    };
    const components = [group, child];
    reflowTopLevelComponentsToGrid(components, 4);
    expect(child.col).toBe(5);
    expect(child.parentContainerKey).toBe('g1');
  });
});
