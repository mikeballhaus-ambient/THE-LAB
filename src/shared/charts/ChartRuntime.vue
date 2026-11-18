<script setup lang="ts">

import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';

import 'chart.js/auto';

import Chart from 'primevue/chart';

import { registerChartJsExtensions } from './register-chartjs';

registerChartJsExtensions();

import type { ChartDataPayload, ChartSchema } from './chart-types';

import { buildPrimeChartOptions, chartAnimationOverrides } from './chart-options';

import { useLabChartThemeSync } from './lab-chart-theme';

import { resolveChartContainerHeightPx, resolveChartSizePercent } from './layout-size';

const { themeVersion } = useLabChartThemeSync();



const props = defineProps<{

  schema: ChartSchema;

  data: ChartDataPayload;

  optionsOverride?: Record<string, unknown>;

  /** Overrides layout size (pixel height string, e.g. "320px"). */

  height?: string;

  /** While true, Chart.js animations are off (designer size slider). */

  suppressAnimation?: boolean;

  /** Overrides saved `layout.size` (50–150), e.g. from render API response. */

  sizeOverride?: number;

}>();



type ChartComponentRef = { chart?: { resize: () => void } };



const chartRef = ref<ChartComponentRef | null>(null);

const rootEl = ref<HTMLElement | null>(null);



const chartData = computed(() => ({

  labels: props.data.labels ?? [],

  datasets: props.data.datasets ?? [],

}));



const isRadialChart = computed(
  () => props.schema.chartType === 'pie' || props.schema.chartType === 'doughnut',
);

/** Radial: keep Chart.js aspect ratio, centered in the box. Bar/line: fill the bordered frame. */
const maintainAspectRatio = computed(() => {
  const explicit =
    props.schema.layout?.maintainAspectRatio ?? props.schema.options.maintainAspectRatio;
  if (explicit !== undefined) {
    return explicit;
  }
  return isRadialChart.value;
});

/** Options ignore layout.size so the slider only resizes the container (no chart re-init). */
const chartOptions = computed(() => {
  void themeVersion.value;
  return buildPrimeChartOptions(
    {
      chartType: props.schema.chartType,
      options: props.schema.options,
      layout: {
        maintainAspectRatio: maintainAspectRatio.value,
      },
    },
    {
      ...chartAnimationOverrides(props.suppressAnimation === true),
      ...props.optionsOverride,
    },
  );
});



const sizePercent = computed(() =>
  resolveChartSizePercent(props.schema.layout, props.sizeOverride),
);

const containerHeightPx = computed(() => {
  if (props.height) {
    const parsed = parseInt(props.height, 10);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return resolveChartContainerHeightPx(props.schema.layout, props.sizeOverride);
});

const containerStyle = computed(() => ({
  width: `${sizePercent.value}%`,
  maxWidth: '100%',
  height: `${containerHeightPx.value}px`,
  marginLeft: 'auto',
  marginRight: 'auto',
}));

const chartClass = computed(() =>
  isRadialChart.value
    ? 'aspect-square h-full max-h-full w-auto max-w-full'
    : 'min-h-0 min-w-0 h-full w-full flex-1 self-stretch',
);

const containerLayoutClass = computed(() =>
  isRadialChart.value ? 'items-center justify-center' : 'items-stretch justify-stretch',
);



function resizeChart(): void {

  chartRef.value?.chart?.resize();

}



watch([containerHeightPx, sizePercent], () => {
  void nextTick(resizeChart);
});



let resizeObserver: ResizeObserver | undefined;



onMounted(() => {

  if (typeof ResizeObserver === 'undefined' || !rootEl.value) {

    return;

  }

  resizeObserver = new ResizeObserver(() => {

    resizeChart();

  });

  resizeObserver.observe(rootEl.value);

});



onUnmounted(() => {

  resizeObserver?.disconnect();

});

</script>



<template>

  <div
    ref="rootEl"
    class="chart-runtime lab-app-panel relative flex overflow-hidden rounded-md border-0 p-3"
    :class="containerLayoutClass"
    :style="containerStyle"
  >
    <Chart
      ref="chartRef"
      :type="schema.chartType"
      :data="chartData"
      :options="chartOptions"
      :class="chartClass"
    />
  </div>

</template>


