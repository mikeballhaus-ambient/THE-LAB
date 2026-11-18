import { computed, ref } from 'vue';

/**
 * Chart Builder integration charts refetch when `context.dataRevision` changes
 * (see `ChartContextReportWidget` contextSignature watch).
 */
export function useCatalogReportsChartContext() {
  const chartDataRevision = ref(0);

  const reportsChartContext = computed(() => ({
    dataRevision: chartDataRevision.value,
  }));

  function bumpReportsCharts(): void {
    chartDataRevision.value += 1;
  }

  return { reportsChartContext, bumpReportsCharts };
}
