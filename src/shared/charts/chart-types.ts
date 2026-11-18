import type { ChartDataMapping, ChartFilterSpec } from './chart-data-mapping';

export type ChartType = 'bar' | 'line' | 'pie' | 'doughnut' | 'funnel';

export type ChartLegendPosition = 'top' | 'bottom' | 'left' | 'right';

export interface ChartOptionsConfig {
  title?: string;
  legendDisplay?: boolean;
  legendPosition?: ChartLegendPosition;
  /** Show numeric values on the chart (chartjs-plugin-datalabels). */
  showDataLabels?: boolean;
  maintainAspectRatio?: boolean;
  indexAxis?: 'x' | 'y';
  stacked?: boolean;
  /** Multi-series date-range line charts (one lane per row). */
  timelineChart?: boolean;
}

export interface ChartLayoutConfig {
  /** Display scale 50–150; 100 = default. Chart.js keeps aspect ratio inside the container. */
  size?: number;
  /** @deprecated Use `size`. Still read for charts saved before the size slider. */
  minHeight?: number;
  maintainAspectRatio?: boolean;
}

export interface ChartSchema {
  chartKey: string;
  name: string;
  description?: string;
  is_active?: boolean;
  chartType: ChartType;
  options: ChartOptionsConfig;
  layout?: ChartLayoutConfig;
  dataConnectorId?: number;
  dataMapping?: ChartDataMapping;
  allowedFilters?: ChartFilterSpec[];
  createdAt?: string;
  updatedAt?: string;
}

export interface ChartDatasetInput {
  label?: string;
  data: Array<number | null>;
  backgroundColor?: string | string[];
  borderColor?: string | string[];
  /** Passed through to Chart.js (e.g. stacked area lines). */
  fill?: boolean | string;
  stepped?: boolean;
  spanGaps?: boolean;
}

export interface ChartDataPayload {
  labels?: string[];
  datasets: ChartDatasetInput[];
}

export interface ChartRenderRequest {
  /** Host-computed datasets (legacy / seed charts). */
  data?: ChartDataPayload;
  /** Filter context for connector-backed charts (rm-64). */
  context?: Record<string, unknown>;
  /** Override saved `layout.size` (50–150). */
  size?: number;
  optionsOverride?: Record<string, unknown>;
}

/** Response from `POST /api/v1/charts/render/:chartKey` — ready for `ChartRuntime`. */
export interface ChartRenderResponse {
  schema: ChartSchema;
  data: ChartDataPayload;
  /** Effective size percent after optional request override. */
  size: number;
  optionsOverride?: Record<string, unknown>;
}

export interface ChartListResponse {
  charts: ChartSchema[];
  total: number;
  limit: number;
  offset: number;
}
