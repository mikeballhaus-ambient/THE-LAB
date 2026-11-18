export type GroupChildrenDirection = 'vertical' | 'horizontal';

export const DEFAULT_GROUP_INNER_COLUMNS = 2;
export const MIN_GROUP_INNER_COLUMNS = 1;
export const MAX_GROUP_INNER_COLUMNS = 8;

/** Subset of group container style persisted on `container.groupStyle`. */
export interface GroupContainerLayoutStyle {
  showTitle?: boolean;
  backgroundColor?: string;
  borderRadius?: string;
  padding?: string;
  margin?: string;
  borderWidth?: string;
  borderColor?: string;
  gap?: string;
  childrenDirection?: GroupChildrenDirection;
  innerColumns?: number;
  /** @deprecated Prefer childrenDirection */
  innerLayout?: 'flex' | 'grid';
  /** @deprecated Prefer childrenDirection */
  flexDirection?: 'row' | 'column';
}

export function clampGroupInnerColumns(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) {
    return DEFAULT_GROUP_INNER_COLUMNS;
  }
  return Math.min(MAX_GROUP_INNER_COLUMNS, Math.max(MIN_GROUP_INNER_COLUMNS, Math.round(n)));
}

export function resolveGroupChildrenDirection(
  style: GroupContainerLayoutStyle | undefined,
): GroupChildrenDirection {
  if (style?.childrenDirection === 'horizontal' || style?.childrenDirection === 'vertical') {
    return style.childrenDirection;
  }
  if (style?.flexDirection === 'row' || style?.innerLayout === 'grid') {
    return 'horizontal';
  }
  return 'vertical';
}

export function groupContainerWrapperStyle(
  style: GroupContainerLayoutStyle | undefined,
): Record<string, string> {
  const s = style ?? {};
  return {
    backgroundColor: s.backgroundColor ?? '#334155',
    borderRadius: s.borderRadius ?? '0.5rem',
    padding: s.padding ?? '0.75rem',
    margin: s.margin ?? '0',
    borderWidth: s.borderWidth ?? '1px',
    borderStyle: 'solid',
    borderColor: s.borderColor ?? '#475569',
    boxSizing: 'border-box',
  };
}

export function groupContainerChildrenStyle(
  style: GroupContainerLayoutStyle | undefined,
): Record<string, string> {
  const s = style ?? {};
  const gap = s.gap ?? '0.5rem';
  const direction = resolveGroupChildrenDirection(s);

  if (direction === 'horizontal') {
    const cols = clampGroupInnerColumns(s.innerColumns);
    return {
      display: 'grid',
      gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
      gap,
      width: '100%',
      alignItems: 'start',
    };
  }

  return {
    display: 'flex',
    flexDirection: 'column',
    gap,
    width: '100%',
  };
}

export function groupInnerColumnOptions(): Array<{ label: string; value: number }> {
  const options: Array<{ label: string; value: number }> = [];
  for (let n = MIN_GROUP_INNER_COLUMNS; n <= MAX_GROUP_INNER_COLUMNS; n += 1) {
    options.push({
      value: n,
      label: n === 1 ? '1 column' : `${n} columns`,
    });
  }
  return options;
}
