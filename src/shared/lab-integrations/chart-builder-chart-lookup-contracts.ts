import type { FormsBuilderContract } from '@/shared/types/forms-builder-integration';
import type { ChartType } from '@/shared/charts/chart-types';

const CHART_TYPE_LABELS: Record<ChartType, string> = {
  bar: 'Bar',
  line: 'Line',
  pie: 'Pie',
  doughnut: 'Doughnut',
  funnel: 'Funnel',
};

export function buildChartEntityLookupContracts(
  baseUrl: string,
): FormsBuilderContract['endpoints']['lookups'] {
  const chartTypes = Object.entries(CHART_TYPE_LABELS).map(([id, label]) => ({
    id,
    value: id,
    label,
  }));
  const connectorListUrl = `${baseUrl.replace(/\/$/, '')}/api/connector/data-connectors`;
  return [
    {
      forProperty: 'chartType',
      endpoint: {
        /** Static enum — do not GET `/api/connector/charts` (that list is chart definitions, not types). */
        url: '',
        type: 'GET',
        data: {},
        response: chartTypes,
      },
    },
    {
      forProperty: 'dataConnectorId',
      endpoint: {
        url: connectorListUrl,
        type: 'GET',
        data: {},
        response: [],
      },
    },
  ];
}
