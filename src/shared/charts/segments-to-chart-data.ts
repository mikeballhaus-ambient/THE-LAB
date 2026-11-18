import type { ChartDataPayload } from './chart-types';
import { getLabChartSeriesPalette } from './lab-chart-theme';

export interface ChartCountSegment {
  key: string;
  label: string;
  value: number;
}

export function chartPayloadHasData(payload: ChartDataPayload | null | undefined): boolean {
  if (!payload?.datasets?.length) {
    return false;
  }
  const data = payload.datasets[0]?.data;
  if (!data?.length) {
    return false;
  }
  const labels = payload.labels;
  if (labels && labels.length > 0 && labels.length !== data.length) {
    return false;
  }
  return true;
}

export function segmentsToChartData(
  segments: ChartCountSegment[],
  datasetLabel = 'Count',
): ChartDataPayload {
  const palette = getLabChartSeriesPalette();
  return {
    labels: segments.map((s) => s.label),
    datasets: [
      {
        label: datasetLabel,
        data: segments.map((s) => s.value),
        backgroundColor: palette,
        borderColor: palette[0],
      },
    ],
  };
}
