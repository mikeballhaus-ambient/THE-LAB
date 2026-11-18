import type { ChartRenderRequest, ChartRenderResponse, ChartSchema } from './chart-types';
import { resolveChartSizePercent } from './layout-size';

export function buildChartRenderResponse(
  chart: ChartSchema,
  request: ChartRenderRequest,
): ChartRenderResponse {
  const size = resolveChartSizePercent(chart.layout, request.size);
  const layout = { ...chart.layout, size };

  return {
    schema: {
      ...chart,
      layout,
    },
    data: request.data!,
    size,
    optionsOverride: request.optionsOverride,
  };
}
