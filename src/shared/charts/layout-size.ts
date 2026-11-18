import type { ChartLayoutConfig } from './chart-types';

/** Container height at `size` 100 (px). */
export const CHART_LAYOUT_BASE_HEIGHT_PX = 280;

export const CHART_SIZE_DEFAULT = 100;
export const CHART_SIZE_MIN = 50;
export const CHART_SIZE_MAX = 150;

/** Resolved size percent (50–150). Legacy `minHeight` maps to equivalent size. */
export function resolveChartSizePercent(
  layout?: ChartLayoutConfig,
  sizeOverride?: number,
): number {
  if (sizeOverride != null && sizeOverride > 0) {
    return clampSize(sizeOverride);
  }
  if (layout?.size != null && layout.size > 0) {
    return clampSize(layout.size);
  }
  if (layout?.minHeight != null && layout.minHeight > 0) {
    return clampSize(Math.round((layout.minHeight / CHART_LAYOUT_BASE_HEIGHT_PX) * 100));
  }
  return CHART_SIZE_DEFAULT;
}

export function resolveChartContainerHeightPx(
  layout?: ChartLayoutConfig,
  sizeOverride?: number,
): number {
  const scale = resolveChartSizePercent(layout, sizeOverride) / 100;
  return Math.round(CHART_LAYOUT_BASE_HEIGHT_PX * scale);
}

function clampSize(value: number): number {
  return Math.min(CHART_SIZE_MAX, Math.max(CHART_SIZE_MIN, value));
}
