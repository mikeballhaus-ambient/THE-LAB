import type { ChartDataPayload, ChartOptionsConfig, ChartType } from './chart-types';
import { chartColorWithAlpha, getLabChartSeriesPalette } from './lab-chart-theme';

function stackedBarSample(): ChartDataPayload {
  const palette = getLabChartSeriesPalette();
  return {
    labels: ['Q1', 'Q2', 'Q3', 'Q4'],
    datasets: [
      {
        label: 'Product A',
        data: [12, 19, 8, 15],
        backgroundColor: palette[0],
      },
      {
        label: 'Product B',
        data: [8, 11, 14, 9],
        backgroundColor: palette[1],
      },
      {
        label: 'Product C',
        data: [5, 7, 6, 10],
        backgroundColor: palette[2],
      },
    ],
  };
}

function stackedLineSample(): ChartDataPayload {
  const palette = getLabChartSeriesPalette();
  return {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [
      {
        label: 'Inbound',
        data: [8, 12, 10, 14, 11, 16],
        borderColor: palette[0],
        backgroundColor: chartColorWithAlpha(palette[0], 0.35),
        fill: true,
      },
      {
        label: 'Outbound',
        data: [6, 9, 11, 8, 13, 10],
        borderColor: palette[1],
        backgroundColor: chartColorWithAlpha(palette[1], 0.35),
        fill: true,
      },
    ],
  };
}

/** Sample data for designer preview; pass options so stacked mode shows multiple series. */
export function getSampleDataForChartType(
  chartType: ChartType,
  previewOptions?: Pick<ChartOptionsConfig, 'stacked'>,
): ChartDataPayload {
  const stacked = previewOptions?.stacked === true;
  const palette = getLabChartSeriesPalette();

  switch (chartType) {
    case 'pie':
    case 'doughnut':
      return {
        labels: ['Open', 'Won', 'Lost', 'Pending'],
        datasets: [
          {
            label: 'Pipeline',
            data: [12, 19, 8, 5],
            backgroundColor: palette,
          },
        ],
      };
    case 'line':
      if (stacked) {
        return stackedLineSample();
      }
      return {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        datasets: [
          {
            label: 'Revenue',
            data: [12, 19, 14, 22, 18, 25],
            borderColor: palette[0],
            backgroundColor: chartColorWithAlpha(palette[0], 0.2),
          },
        ],
      };
    case 'funnel':
      return {
        labels: ['Leads', 'Qualified', 'Proposal', 'Won'],
        datasets: [
          {
            label: 'Pipeline',
            data: [1200, 840, 520, 210],
            backgroundColor: palette,
          },
        ],
      };
    case 'bar':
    default:
      if (stacked) {
        return stackedBarSample();
      }
      return {
        labels: ['Stage A', 'Stage B', 'Stage C', 'Stage D'],
        datasets: [
          {
            label: 'Count',
            data: [14, 9, 7, 11],
            backgroundColor: palette,
          },
        ],
      };
  }
}
