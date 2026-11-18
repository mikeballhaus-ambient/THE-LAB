import { describe, expect, test } from '@jest/globals';
import { buildChartRenderResponse } from '@/shared/charts/build-chart-render-response';
import type { ChartSchema } from '@/shared/charts/chart-types';

const baseChart: ChartSchema = {
  chartKey: 'chart_test',
  name: 'Test',
  chartType: 'bar',
  options: { title: 'T' },
  layout: { size: 100 },
  is_active: true,
};

describe('buildChartRenderResponse', () => {
  test('merges data and applies size override', () => {
    const result = buildChartRenderResponse(baseChart, {
      data: { labels: ['A'], datasets: [{ data: [1] }] },
      size: 80,
    });
    expect(result.size).toBe(80);
    expect(result.schema.layout?.size).toBe(80);
    expect(result.data.datasets[0].data).toEqual([1]);
  });

  test('uses saved size when override omitted', () => {
    const result = buildChartRenderResponse(
      { ...baseChart, layout: { size: 120 } },
      { data: { datasets: [{ data: [2] }] } },
    );
    expect(result.size).toBe(120);
  });
});
