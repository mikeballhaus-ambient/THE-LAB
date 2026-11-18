import type { Database } from 'better-sqlite3';
import type { ChartSchema, ChartType } from '@/shared/charts/chart-types';
import type { ChartsRepository } from './repositories/ChartsRepository';

/**
 * Shared `chart_seed_*` definitions used by CRM, Task List and Help Desk dashboards.
 *
 * Contract pinned by `src/tests/apps/chart-builder/seed-charts.test.ts`:
 *   - every definition carries `options.showDataLabels === true`
 *   - `chart_seed_bar_stacked` has `stacked: true` and `legendPosition: 'top'`
 *   - `chart_seed_pie` has `legendPosition: 'right'`
 *   - re-running is idempotent but still repairs `showDataLabels` on legacy rows
 */

export interface SeedChartDefinition extends ChartSchema {
  options: NonNullable<ChartSchema['options']> & { showDataLabels: boolean };
}

/** Host-data sample. `showDataLabels` defaults to `true` and callers may override. */
function seed(
  chartKey: string,
  name: string,
  description: string,
  chartType: ChartType,
  options: Partial<SeedChartDefinition['options']> = {},
  layout?: SeedChartDefinition['layout'],
): SeedChartDefinition {
  return {
    chartKey,
    name,
    description,
    chartType,
    options: { ...options, showDataLabels: options.showDataLabels ?? true },
    layout,
    is_active: true,
  };
}

export const SEED_CHART_DEFINITIONS: SeedChartDefinition[] = [
  seed(
    'chart_seed_bar',
    'Bar chart',
    'Vertical bars for category comparison.',
    'bar',
    { title: 'Bar chart', legendDisplay: false, legendPosition: 'bottom' },
  ),
  seed(
    'chart_seed_bar_stacked',
    'Stacked bar chart',
    'Stacked bars to show composition within a category.',
    'bar',
    { title: 'Stacked bar chart', legendDisplay: true, legendPosition: 'top', stacked: true },
  ),
  seed(
    'chart_seed_bar_horizontal',
    'Horizontal bar chart',
    'Horizontal bars — better for long category labels.',
    'bar',
    {
      title: 'Horizontal bar chart',
      legendDisplay: false,
      legendPosition: 'bottom',
      indexAxis: 'y',
    },
  ),
  seed(
    'chart_seed_line',
    'Line chart',
    'Trend over ordered categories.',
    'line',
    { title: 'Line chart', legendDisplay: true, legendPosition: 'top' },
  ),
  seed(
    'chart_seed_area',
    'Area chart',
    'Filled line for cumulative volume.',
    'line',
    { title: 'Area chart', legendDisplay: true, legendPosition: 'top' },
  ),
  seed(
    'chart_seed_pie',
    'Pie chart',
    'Share of total across a small set of categories.',
    'pie',
    { title: 'Pie chart', legendDisplay: true, legendPosition: 'right' },
  ),
  seed(
    'chart_seed_doughnut',
    'Doughnut chart',
    'Doughnut variant of the pie chart.',
    'doughnut',
    { title: 'Doughnut chart', legendDisplay: true, legendPosition: 'right' },
  ),
  seed(
    'chart_seed_funnel',
    'Funnel chart',
    'Stage-to-stage drop-off.',
    'funnel',
    { title: 'Funnel chart', legendDisplay: true, legendPosition: 'bottom' },
  ),
];

export interface SeedChartsOptions {
  /** Settings admin Apply — re-assert seed values even when the row already exists. */
  adminApply?: boolean;
  /** Optional handle used by `clearAllChartBuilderCatalog`-style cleanup. */
  db?: Database;
}

/**
 * Insert any missing seed chart, then repair `options.showDataLabels` on rows that were
 * seeded before the data-label default existed.
 */
export function seedChartsIfMissing(
  repo: ChartsRepository,
  options?: SeedChartsOptions,
): number {
  void options;
  let inserted = 0;

  for (const def of SEED_CHART_DEFINITIONS) {
    const existing = repo.findByKey(def.chartKey);
    if (!existing) {
      repo.create(def);
      inserted += 1;
      continue;
    }
    if (existing.options?.showDataLabels !== true) {
      repo.update(def.chartKey, {
        options: { ...existing.options, showDataLabels: true },
      });
    }
  }

  return inserted;
}

/**
 * Wipe every chart and data connector — the Settings "remove" path for the
 * `chart-samples` pack.
 */
export function clearAllChartBuilderCatalog(db: Database): {
  removedCharts: number;
  removedConnectors: number;
} {
  const removedCharts = db.prepare('DELETE FROM charts').run().changes;
  const removedConnectors = db.prepare('DELETE FROM data_connectors').run().changes;
  return { removedCharts, removedConnectors };
}
