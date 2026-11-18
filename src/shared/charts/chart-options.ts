import type { ChartLegendPosition, ChartSchema, ChartType } from './chart-types';
import { getLabChartThemeColors } from './lab-chart-theme';

export interface LegendLabelLayoutInput {
  chartType: ChartType;
  legendDisplay: boolean;
  legendPosition: ChartLegendPosition;
  showDataLabels: boolean;
}

function buildDataLabelsOptions(
  chartType: ChartType,
  show: boolean,
  layout?: Pick<LegendLabelLayoutInput, 'legendDisplay' | 'legendPosition'>,
): Record<string, unknown> {
  if (!show) {
    return { display: false };
  }
  const ui = getLabChartThemeColors();
  const legendAtTop =
    layout?.legendDisplay !== false && (layout?.legendPosition ?? 'top') === 'top';
  const base: Record<string, unknown> = {
    display: true,
    color: ui.datalabel,
    font: { weight: '600', size: 11 },
    formatter: (value: number) => (value == null ? '' : value),
    clip: false,
  };
  const insideLabeledBadge = {
    ...base,
    color: ui.datalabelOnSegment,
    backgroundColor: ui.datalabelBadgeBg,
    borderRadius: 3,
    padding: 1,
    font: { weight: '500', size: 10 },
    anchor: 'center',
    align: 'center',
  };
  switch (chartType) {
    case 'pie':
    case 'doughnut':
    case 'funnel':
      return insideLabeledBadge;
    case 'line':
      return {
        ...base,
        anchor: 'end',
        align: legendAtTop ? 'end' : 'top',
        offset: legendAtTop ? 2 : 4,
        clamp: legendAtTop,
      };
    case 'bar':
    default:
      return {
        ...base,
        anchor: 'end',
        align: 'end',
        offset: legendAtTop ? 2 : 4,
        clamp: legendAtTop,
      };
  }
}

/**
 * Extra canvas padding and scale grace when legend and data labels share the same edge
 * (especially legend at top on bar/line charts).
 */
export function legendAndDataLabelLayoutOptions(input: LegendLabelLayoutInput): Record<string, unknown> {
  const { chartType, legendDisplay, legendPosition, showDataLabels } = input;
  const isCartesian = chartType === 'bar' || chartType === 'line';

  if (!isCartesian) {
    return {};
  }

  if (!showDataLabels) {
    return {};
  }

  const out: Record<string, unknown> = {};
  const padding: Partial<Record<'top' | 'bottom' | 'left' | 'right', number>> = {};

  if (!legendDisplay) {
    out.scales = { y: { grace: chartType === 'bar' ? '8%' : '6%' } };
    return out;
  }

  switch (legendPosition) {
    case 'top':
      padding.top = 14;
      out.scales = { y: { grace: chartType === 'bar' ? '14%' : '10%' } };
      break;
    case 'bottom':
      padding.bottom = 8;
      out.scales = { y: { grace: chartType === 'bar' ? '8%' : '6%' } };
      break;
    case 'left':
      padding.left = 6;
      out.scales = { y: { grace: '8%' } };
      break;
    case 'right':
      padding.right = 6;
      out.scales = { y: { grace: '8%' } };
      break;
    default:
      break;
  }

  if (Object.keys(padding).length > 0) {
    out.layout = { padding };
  }

  return out;
}

/** Report/catalog charts show legend + value labels unless the chart schema sets `legendDisplay: false`. */
export function resolveReportLegendDisplay(options: ChartSchema['options'] | undefined): boolean {
  if (options?.legendDisplay === false) {
    return false;
  }
  return true;
}

export function mergeChartOptionsPartial(
  target: Record<string, unknown>,
  source: Record<string, unknown>,
): Record<string, unknown> {
  return deepMerge(target, source);
}

export function buildPrimeChartOptions(
  schema: Pick<ChartSchema, 'chartType' | 'options' | 'layout'>,
  optionsOverride?: Record<string, unknown>,
): Record<string, unknown> {
  const opts = schema.options ?? {};
  const maintain = schema.layout?.maintainAspectRatio ?? opts.maintainAspectRatio ?? true;
  const ui = getLabChartThemeColors();
  const legendDisplay = opts.legendDisplay ?? true;
  const legendPosition = opts.legendPosition ?? 'top';
  const showDataLabels = opts.showDataLabels === true;

  const base: Record<string, unknown> = {
    responsive: true,
    maintainAspectRatio: maintain,
    plugins: {
      legend: {
        display: legendDisplay,
        align: 'center',
        position: legendPosition,
        labels: {
          color: ui.legend,
        },
      },
      title: {
        display: Boolean(opts.title),
        text: opts.title ?? '',
        color: ui.title,
        font: { size: 14, weight: '600' },
      },
      datalabels: buildDataLabelsOptions(schema.chartType, showDataLabels, {
        legendDisplay,
        legendPosition,
      }),
    },
  };

  if (schema.chartType === 'bar' || schema.chartType === 'line') {
    const scales: Record<string, unknown> = {
      x: {
        stacked: opts.stacked ?? false,
        ticks: { color: ui.tick, maxRotation: opts.timelineChart ? 45 : 0, autoSkip: true },
        grid: { color: ui.grid },
      },
      y: {
        stacked: opts.stacked ?? false,
        beginAtZero: true,
        ticks: {
          color: ui.tick,
          stepSize: opts.timelineChart ? 1 : undefined,
          callback: opts.timelineChart
            ? (value: number | string) => (Number(value) % 1 === 0 ? String(value) : '')
            : undefined,
        },
        grid: { color: ui.grid },
      },
    };
    if (schema.chartType === 'bar' && opts.indexAxis === 'y') {
      base.indexAxis = 'y';
    }
    base.scales = scales;
  }

  let merged = mergeChartOptionsPartial(
    base,
    legendAndDataLabelLayoutOptions({
      chartType: schema.chartType,
      legendDisplay,
      legendPosition,
      showDataLabels,
    }),
  );

  if (optionsOverride) {
    merged = mergeChartOptionsPartial(merged, optionsOverride);
  }
  return merged;
}

function deepMerge(target: Record<string, unknown>, source: Record<string, unknown>): Record<string, unknown> {
  const out = { ...target };
  for (const key of Object.keys(source)) {
    const sv = source[key];
    const tv = out[key];
    if (sv && typeof sv === 'object' && !Array.isArray(sv) && tv && typeof tv === 'object' && !Array.isArray(tv)) {
      out[key] = deepMerge(tv as Record<string, unknown>, sv as Record<string, unknown>);
    } else {
      out[key] = sv;
    }
  }
  return out;
}

export function primeChartType(chartType: ChartType): ChartType {
  return chartType;
}

/** Disable Chart.js animations during live layout tweaks (e.g. height slider). */
export function chartAnimationOverrides(suppress: boolean): Record<string, unknown> {
  if (!suppress) {
    return {};
  }
  return {
    animation: false,
    animations: {
      resize: { duration: 0 },
      active: { duration: 0 },
    },
    transitions: {
      active: { animation: { duration: 0 } },
      resize: { animation: { duration: 0 } },
    },
  };
}
