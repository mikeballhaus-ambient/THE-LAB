import type { ChartDataPayload } from '@/shared/charts';
import { toCumulativeFunnelValues } from '@/shared/charts/chart-data-mapping';
import { getLabChartSeriesPalette } from '@/shared/charts/lab-chart-theme';

/** Queue funnel: new → open → pending → resolved → closed (cumulative for funnel shape). */
export function buildTicketQueueFunnelData(
  newCount: number,
  openCount: number,
  pendingCount: number,
  resolvedCount: number,
  closedCount: number,
): ChartDataPayload {
  const stageCounts = [newCount, openCount, pendingCount, resolvedCount, closedCount];
  const cumulative = toCumulativeFunnelValues(stageCounts);
  const palette = getLabChartSeriesPalette();
  return {
    labels: ['New', 'Open', 'Pending', 'Resolved', 'Closed'],
    datasets: [
      {
        label: 'Tickets',
        data: cumulative,
        backgroundColor: palette,
      },
    ],
  };
}
