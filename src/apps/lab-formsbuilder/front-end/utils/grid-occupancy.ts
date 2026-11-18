import type { FormComponent } from '@/apps/lab-formsbuilder/shared/types';
import { DEFAULT_FORM_GRID_COLUMNS, normalizedCol } from '@/shared/forms/form-layout';

export interface ComponentBounds {
  row: number;
  col: number;
  rowSpan: number;
  colSpan: number;
}

export function getComponentBounds(component: FormComponent): ComponentBounds {
  return {
    row: component.row ?? 0,
    col: normalizedCol(component.col),
    rowSpan: component.rowSpan ?? 1,
    colSpan: component.span ?? 1,
  };
}

export function boundsContain(bounds: ComponentBounds, row: number, col: number): boolean {
  return (
    row >= bounds.row
    && row <= bounds.row + bounds.rowSpan - 1
    && col >= bounds.col
    && col <= bounds.col + bounds.colSpan - 1
  );
}

export function isAnchorCell(component: FormComponent, row: number, col: number): boolean {
  const b = getComponentBounds(component);
  return b.row === row && b.col === col;
}

export function boundsOverlap(a: ComponentBounds, b: ComponentBounds): boolean {
  const aRowEnd = a.row + a.rowSpan - 1;
  const bRowEnd = b.row + b.rowSpan - 1;
  const aColEnd = a.col + a.colSpan - 1;
  const bColEnd = b.col + b.colSpan - 1;
  return a.row <= bRowEnd && aRowEnd >= b.row && a.col <= bColEnd && aColEnd >= b.col;
}

export function findComponentAtAnchor(
  components: FormComponent[] | undefined,
  row: number,
  col: number,
): FormComponent | undefined {
  return components?.find(
    c => c.parentContainerKey == null && isAnchorCell(c, row, col),
  );
}

/** Top-level field occupying this cell (anchor or covered). */
export function findComponentCoveringCell(
  components: FormComponent[] | undefined,
  row: number,
  col: number,
): FormComponent | undefined {
  return components?.find(
    c => c.parentContainerKey == null && boundsContain(getComponentBounds(c), row, col),
  );
}

export function isCellCoveredByNonAnchor(
  components: FormComponent[] | undefined,
  row: number,
  col: number,
): boolean {
  const owner = findComponentCoveringCell(components, row, col);
  if (!owner) {
    return false;
  }
  return !isAnchorCell(owner, row, col);
}

export function canPlaceComponentBounds(
  component: FormComponent,
  targetRow: number,
  targetCol: number,
  allComponents: FormComponent[],
  exclude?: FormComponent,
  gridCols = DEFAULT_FORM_GRID_COLUMNS,
): boolean {
  const candidate: FormComponent = {
    ...component,
    row: targetRow,
    col: targetCol,
  };
  const bounds = getComponentBounds(candidate);
  if (bounds.col < 0 || bounds.col + bounds.colSpan > gridCols) {
    return false;
  }
  if (bounds.row < 0) {
    return false;
  }

  for (const other of allComponents) {
    if (other.parentContainerKey != null) {
      continue;
    }
    if (exclude && (other === exclude || other.fieldKey === exclude.fieldKey)) {
      continue;
    }
    if (other.row == null || other.col == null) {
      continue;
    }
    if (boundsOverlap(bounds, getComponentBounds(other))) {
      return false;
    }
  }
  return true;
}

export function isColSpanValidForComponent(
  component: FormComponent,
  colSpan: number,
  allComponents: FormComponent[] | undefined,
  gridCols = DEFAULT_FORM_GRID_COLUMNS,
): boolean {
  const trial = { ...component, span: colSpan };
  if (component.row == null || component.col == null) {
    return colSpan >= 1 && colSpan <= gridCols;
  }
  return canPlaceComponentBounds(
    trial,
    component.row,
    normalizedCol(component.col),
    allComponents ?? [],
    component,
    gridCols,
  );
}

export function isRowSpanValidForComponent(
  component: FormComponent,
  rowSpan: number,
  allComponents: FormComponent[] | undefined,
  gridCols = DEFAULT_FORM_GRID_COLUMNS,
): boolean {
  if (rowSpan < 1 || rowSpan > 4) {
    return false;
  }
  const trial = { ...component, rowSpan };
  if (component.row == null || component.col == null) {
    return true;
  }
  return canPlaceComponentBounds(
    trial,
    component.row,
    normalizedCol(component.col),
    allComponents ?? [],
    component,
    gridCols,
  );
}
