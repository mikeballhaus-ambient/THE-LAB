import type { FormComponent } from '../../../shared/types';
import {
  clampFormGridColumns,
  DEFAULT_FORM_GRID_COLUMNS,
  migrateLegacyFormGridCols,
  normalizedCol,
} from '@/shared/forms/form-layout';
import { canPlaceComponentBounds, isColSpanValidForComponent } from '@/apps/lab-formsbuilder/front-end/utils/grid-occupancy';

export const PALETTE_DRAG_MARKER = '__formsBuilderPaletteDrag' as const;

export type PaletteDragPayload = FormComponent & {
  [PALETTE_DRAG_MARKER]?: true;
};

export { DEFAULT_FORM_GRID_COLUMNS as GRID_COLS };

/** @deprecated Use clampFormGridColumns(schema.columns) — kept for legacy imports */
export const GRID_COLS_LEGACY = DEFAULT_FORM_GRID_COLUMNS;

/** 0-based column index (0 .. gridCols - 1). Values are stored and compared as-is. */
export { normalizedCol };

/**
 * Older designer builds stored columns as 1..gridCols. Convert once when loading a form
 * that has no col 0 but uses legacy 1-based positions.
 */
export function migrateLegacyComponentGridCols(
  components: FormComponent[] | undefined,
  gridCols = DEFAULT_FORM_GRID_COLUMNS,
): void {
  migrateLegacyFormGridCols(components, gridCols);
}

export function maxSpanAtCol(col: number | undefined, gridCols = DEFAULT_FORM_GRID_COLUMNS): number {
  return gridCols - normalizedCol(col);
}

/** True when this object is an instance currently on the form canvas (not the component library). */
export function resolvePlacedComponent(
  component: FormComponent,
  placedComponents: FormComponent[] | undefined,
): FormComponent | undefined {
  if (!placedComponents?.length) {
    return undefined;
  }
  const byRef = placedComponents.find(c => c === component);
  if (byRef) {
    return byRef;
  }
  if (!component.fieldKey) {
    return undefined;
  }
  return placedComponents.find(c => c.fieldKey === component.fieldKey);
}

export function isCanvasComponentInstance(
  component: FormComponent,
  placedComponents: FormComponent[] | undefined,
): boolean {
  return resolvePlacedComponent(component, placedComponents) != null;
}

/** @deprecated Use isCanvasComponentInstance — row/col on library templates caused false positives */
export function isPlacedOnCanvas(component: FormComponent): boolean {
  return (
    component.row !== undefined
    && component.row !== null
    && component.col !== undefined
    && component.col !== null
    && Boolean(component.fieldKey)
  );
}

/** Fresh drag payload from the component library (never mutates palette metadata). */
export function createPaletteDragPayload(source: FormComponent): PaletteDragPayload {
  return {
    type: source.type,
    label: source.label,
    fieldKey: source.fieldKey,
    icon: source.icon,
    [PALETTE_DRAG_MARKER]: true,
  };
}

export function isPaletteDragPayload(
  component: FormComponent | undefined,
): component is PaletteDragPayload {
  return Boolean(
    component && (component as PaletteDragPayload)[PALETTE_DRAG_MARKER] === true,
  );
}

export function spansOverlap(
  startA: number,
  spanA: number,
  startB: number,
  spanB: number,
): boolean {
  const endA = startA + spanA - 1;
  const endB = startB + spanB - 1;
  return endA >= startB && startA <= endB;
}

/** Whether `component` can occupy targetRow/targetCol (0-based) without overlapping others. */
export function canPlaceComponent(
  component: FormComponent,
  targetRow: number,
  targetCol: number,
  allComponents: FormComponent[],
  exclude?: FormComponent,
  gridCols = DEFAULT_FORM_GRID_COLUMNS,
): boolean {
  const topLevel = allComponents.filter(c => c.parentContainerKey == null);
  return canPlaceComponentBounds(component, targetRow, targetCol, topLevel, exclude, gridCols);
}

export function isSpanValidForComponent(
  component: FormComponent,
  spanValue: number,
  allComponents: FormComponent[] | undefined,
  gridCols = DEFAULT_FORM_GRID_COLUMNS,
): boolean {
  return isColSpanValidForComponent(component, spanValue, allComponents, gridCols);
}

export function resolveGridColumns(value: unknown): number {
  return clampFormGridColumns(value);
}
