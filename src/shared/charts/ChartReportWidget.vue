<script setup lang="ts">

import { computed, ref, watch } from 'vue';

import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';

import { ChartRuntime, renderChart, type ChartDataPayload, type ChartSchema } from '@/shared/charts';

import {

  chartPayloadHasData,

  segmentsToChartData,

  type ChartCountSegment,

} from './segments-to-chart-data';

import { getLabChartThemeColors, useLabChartThemeSync } from './lab-chart-theme';



const { generateUniqueId } = useUniqueElementId();

const { themeVersion } = useLabChartThemeSync();



const props = withDefaults(

  defineProps<{

    title: string;

    chartKey: string;

    chartBuilderUrl: string;

    segments?: ChartCountSegment[];

    chartData?: ChartDataPayload | null;

    datasetLabel?: string;

    formatValue?: (value: number) => string;

    idPrefix?: string;

  }>(),

  {

    segments: () => [],

    chartData: null,

    datasetLabel: 'Count',

    formatValue: undefined,

    idPrefix: 'chart-report',

  },

);



const hasPayload = computed(

  () => chartPayloadHasData(props.chartData) || (props.segments?.length ?? 0) > 0,

);



const schema = ref<ChartSchema | null>(null);

const data = ref<ChartDataPayload | null>(null);

const optionsOverride = ref<Record<string, unknown> | undefined>(undefined);

const loading = ref(false);

const error = ref<string | null>(null);

let loadGeneration = 0;



function buildOptionsOverride(): Record<string, unknown> {
  const ui = getLabChartThemeColors();

  const plugins: Record<string, unknown> = {
    title: { display: false },
    legend: { display: true, labels: { color: ui.legend } },
  };

  if (props.formatValue) {
    plugins.datalabels = {
      display: true,
      color: ui.datalabel,
      font: { weight: '600', size: 11 },
      formatter: (value: number) =>
        value == null || Number.isNaN(value) ? '' : props.formatValue!(value),
    };
  }

  return { plugins };
}



function resolvePayload(): ChartDataPayload | null {

  if (chartPayloadHasData(props.chartData)) {

    return props.chartData!;

  }

  if (!props.segments?.length) {

    return null;

  }

  return segmentsToChartData(props.segments, props.datasetLabel);

}



const loadSignature = computed(() =>

  JSON.stringify({

    chartKey: props.chartKey,

    chartBuilderUrl: props.chartBuilderUrl,

    title: props.title,

    datasetLabel: props.datasetLabel,

    hasFormatValue: Boolean(props.formatValue),

    segments: props.segments,

    chartData: props.chartData,

  }),

);



async function loadChart(): Promise<void> {

  const generation = ++loadGeneration;

  const payload = resolvePayload();

  if (!props.chartBuilderUrl?.trim() || !payload) {

    schema.value = null;

    data.value = null;

    error.value = null;

    loading.value = false;

    return;

  }

  loading.value = true;

  error.value = null;

  try {

    const result = await renderChart(props.chartBuilderUrl, props.chartKey, { data: payload });

    if (generation !== loadGeneration) {

      return;

    }

    schema.value = {

      ...result.schema,

      options: { ...result.schema.options, title: props.title },

    };

    data.value = result.data;

    optionsOverride.value = buildOptionsOverride();

  } catch (e) {

    if (generation !== loadGeneration) {

      return;

    }

    schema.value = null;

    data.value = null;

    error.value = e instanceof Error ? e.message : 'Failed to load chart';

  } finally {

    if (generation === loadGeneration) {

      loading.value = false;

    }

  }

}



watch(loadSignature, () => {

  void loadChart();

}, { immediate: true });



watch(themeVersion, () => {

  optionsOverride.value = buildOptionsOverride();

  if (!chartPayloadHasData(props.chartData) && props.segments?.length) {

    const payload = segmentsToChartData(props.segments, props.datasetLabel);

    if (schema.value) {

      data.value = payload;

    }

  }

});

</script>



<template>

  <div class="chart-report-widget lab-app-panel flex flex-col gap-3 min-w-0 h-full">

    <h3

      class="text-sm font-semibold text-lab-general-text m-0"

      :id="

        generateUniqueId(

          `${idPrefix}-${title.replace(/\s+/g, '-').toLowerCase()}`,

        )

      "

    >

      {{ title }}

    </h3>

    <p v-if="loading" class="text-sm text-lab-general-text-muted m-0">Loading chart…</p>

    <p v-else-if="error" class="text-sm text-amber-600 dark:text-amber-400 m-0">{{ error }}</p>

    <p v-else-if="!hasPayload" class="text-sm text-lab-general-text-muted m-0">No data yet.</p>

    <ChartRuntime

      v-else-if="schema && data"

      :schema="schema"

      :data="data"

      :options-override="optionsOverride"

      class="min-w-0"

    />

  </div>

</template>

