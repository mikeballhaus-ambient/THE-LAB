import type { FormComponent } from '@/apps/lab-formsbuilder/shared/types';
import { clampFormGridColumns, normalizedCol } from '@/shared/forms/form-layout';
import { canPlaceComponentBounds } from '@/apps/lab-formsbuilder/front-end/utils/grid-occupancy';

const MAX_REFLOW_ROWS = 500;

function sortTopLevelForReflow(a: FormComponent, b: FormComponent): number {
  const rowDiff = (a.row ?? 0) - (b.row ?? 0);
  if (rowDiff !== 0) {
    return rowDiff;
  }
  return normalizedCol(a.col) - normalizedCol(b.col);
}

/**
 * Re-pack root grid components when the column count shrinks.
 * Preserves reading order (row, then col) and avoids stacking many fields on one cell.
 */
export function reflowTopLevelComponentsToGrid(
  allComponents: FormComponent[] | undefined,
  gridColumns: number,
): void {
  const cols = clampFormGridColumns(gridColumns);
  if (!allComponents?.length) {
    return;
  }

  const topLevel = allComponents.filter(c => c.parentContainerKey == null);
  topLevel.sort(sortTopLevelForReflow);

  const placed: FormComponent[] = [];

  for (const component of topLevel) {
    const span = Math.min(Math.max(component.span ?? 1, 1), cols);
    component.span = span;

    let assigned = false;
    for (let row = 0; row < MAX_REFLOW_ROWS && !assigned; row += 1) {
      for (let col = 0; col <= cols - span; col += 1) {
        if (canPlaceComponentBounds(component, row, col, placed, undefined, cols)) {
          component.row = row;
          component.col = col;
          placed.push(component);
          assigned = true;
          break;
        }
      }
    }
  }
}
