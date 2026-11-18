import type {
  FormGridHorizontalAlign,
  FormGridVerticalAlign,
  IFormGridField,
  FormGridFieldSlotProps,
} from './form-layout-types';

export const DEFAULT_FORM_GRID_COLUMNS = 4;
export const MIN_FORM_GRID_COLUMNS = 1;
export const MAX_FORM_GRID_COLUMNS = 8;

/** @deprecated Prefer DEFAULT_FORM_GRID_COLUMNS */
export const GRID_COLS = DEFAULT_FORM_GRID_COLUMNS;

export function clampFormGridColumns(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return DEFAULT_FORM_GRID_COLUMNS;
  }
  return Math.min(
    MAX_FORM_GRID_COLUMNS,
    Math.max(MIN_FORM_GRID_COLUMNS, Math.round(value)),
  );
}

export function formGridColumnOptions(): Array<{ label: string; value: number }> {
  const options: Array<{ label: string; value: number }> = [];
  for (let n = MIN_FORM_GRID_COLUMNS; n <= MAX_FORM_GRID_COLUMNS; n += 1) {
    options.push({ label: String(n), value: n });
  }
  return options;
}

/** 0-based column index. Values are stored and compared as-is. */
export function normalizedCol(col: number | undefined): number {
  if (col == null) {
    return 0;
  }
  return col;
}

export function getFormRowIndices<T extends IFormGridField>(
  components: T[] | undefined,
): number[] {
  const list = components ?? [];
  if (list.length === 0) {
    return [];
  }
  const rows = new Set(list.map(c => c.row ?? 0));
  return [...rows].sort((a, b) => a - b);
}

export function getFormFieldsInRow<T extends IFormGridField>(
  components: T[] | undefined,
  row: number,
): T[] {
  return (components ?? [])
    .filter(c => (c.row ?? 0) === row)
    .sort((a, b) => normalizedCol(a.col) - normalizedCol(b.col));
}

export function getFormCellSpanClass(span: number | undefined, columns = DEFAULT_FORM_GRID_COLUMNS): string {
  const clamped = Math.min(Math.max(span ?? 1, 1), columns);
  return `fb-cell--span-${clamped}`;
}

export function resolveHorizontalAlign(field: IFormGridField): FormGridHorizontalAlign {
  return field.hAlign ?? 'left';
}

export function resolveVerticalAlign(field: IFormGridField): FormGridVerticalAlign {
  return field.vAlign ?? 'top';
}

const H_ALIGN_CLASS: Record<FormGridHorizontalAlign, string> = {
  left: 'justify-start',
  center: 'justify-center',
  right: 'justify-end',
};

const V_ALIGN_CLASS: Record<FormGridVerticalAlign, string> = {
  top: 'items-start',
  middle: 'items-center',
  bottom: 'items-end',
};

export function getFormCellAlignClasses(field: IFormGridField): string {
  const h = resolveHorizontalAlign(field);
  const v = resolveVerticalAlign(field);
  return `${H_ALIGN_CLASS[h]} ${V_ALIGN_CLASS[v]}`;
}

export function buildFormGridFieldSlotProps<T extends IFormGridField>(
  field: T,
  rowIndex: number,
  columns: number,
): FormGridFieldSlotProps<T> {
  return {
    field,
    rowIndex,
    columnIndex: normalizedCol(field.col),
    columns,
    spanClass: getFormCellSpanClass(field.span, columns),
    cellAlignClasses: getFormCellAlignClasses(field),
    align: {
      horizontal: resolveHorizontalAlign(field),
      vertical: resolveVerticalAlign(field),
    },
  };
}

/**
 * Older designer builds stored columns as 1..columns. Convert once when loading a form
 * that has no col 0 but uses legacy 1-based positions.
 */
/** Clamp spans and column positions when the form grid column count changes. */
export function clampFormComponentsToGridColumns<T extends IFormGridField>(
  components: T[] | undefined,
  gridColumns: number,
): void {
  const cols = clampFormGridColumns(gridColumns);
  if (!components?.length) {
    return;
  }
  for (const c of components) {
    const span = Math.min(Math.max(c.span ?? 1, 1), cols);
    c.span = span;
    if (c.col == null) {
      continue;
    }
    let col = normalizedCol(c.col);
    if (col >= cols) {
      col = cols - 1;
    }
    if (col + span > cols) {
      col = Math.max(0, cols - span);
    }
    c.col = col;
  }
}

export function migrateLegacyFormGridCols<T extends IFormGridField>(
  components: T[] | undefined,
  columns = DEFAULT_FORM_GRID_COLUMNS,
): void {
  if (!components?.length) {
    return;
  }
  if (components.some(c => c.col === 0)) {
    return;
  }
  const hasLegacy = components.some(
    c => c.col != null && c.col >= 1 && c.col <= columns,
  );
  if (!hasLegacy) {
    return;
  }
  for (const c of components) {
    if (c.col != null && c.col >= 1 && c.col <= columns) {
      c.col = c.col - 1;
    }
  }
}
