<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import {
  ChartRuntime,
  getLabChartThemeColors,
  renderChart,
  useLabChartThemeSync,
  type ChartDataPayload,
  type ChartSchema,
} from '@/shared/charts';
import type { DashboardChartSegment } from '../../shared/utils/dashboard-aggregates';
import { segmentsToChartData } from '../../shared/utils/dashboard-chart-data';

const { generateUniqueId } = useUniqueElementId();
const { themeVersion } = useLabChartThemeSync();

const props = withDefaults(
  defineProps<{
    title: string;
    chartKey: string;
    chartBuilderUrl: string;
    segments?: DashboardChartSegment[];
    chartData?: ChartDataPayload | null;
    datasetLabel?: string;
    /** Formats funnel / datalabel values (e.g. currency). */
    formatValue?: (value: number) => string;
  }>(),
  {
    segments: () => [],
    chartData: null,
    datasetLabel: 'Count',
    formatValue: undefined,
  },
);

const hasPayload = computed(
  () => Boolean(props.chartData) || (props.segments?.length ?? 0) > 0,
);

const schema = ref<ChartSchema | null>(null);
const data = ref<ChartDataPayload | null>(null);
const optionsOverride = ref<Record<string, unknown> | undefined>(undefined);
const loading = ref(false);
const error = ref<string | null>(null);

function buildCrmChartOptionsOverride(): Record<string, unknown> {
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
  if (props.chartData) {
    return props.chartData;
  }
  if (!props.segments?.length) {
    return null;
  }
  return segmentsToChartData(props.segments, props.datasetLabel);
}

async function loadChart(): Promise<void> {
  const payload = resolvePayload();
  if (!props.chartBuilderUrl?.trim() || !payload) {
    schema.value = null;
    data.value = null;
    error.value = null;
    return;
  }
  loading.value = true;
  error.value = null;
  try {
    const result = await renderChart(props.chartBuilderUrl, props.chartKey, { data: payload });
    schema.value = {
      ...result.schema,
      options: { ...result.schema.options, title: props.title },
    };
    data.value = result.data;
    optionsOverride.value = buildCrmChartOptionsOverride();
  } catch (e) {
    schema.value = null;
    data.value = null;
    error.value = e instanceof Error ? e.message : 'Failed to load chart';
  } finally {
    loading.value = false;
  }
}

watch(
  () => [
    props.chartKey,
    props.chartBuilderUrl,
    props.title,
    props.segments,
    props.chartData,
    props.datasetLabel,
    props.formatValue,
  ],
  () => {
    void loadChart();
  },
  { deep: true },
);

onMounted(() => {
  void loadChart();
});

watch(themeVersion, () => {
  optionsOverride.value = buildCrmChartOptionsOverride();
  if (!props.chartData && props.segments?.length && schema.value) {
    data.value = segmentsToChartData(props.segments, props.datasetLabel);
  } else if (props.chartData && schema.value) {
    void loadChart();
  }
});
</script>

<template>
  <div class="crm-dashboard-chart lab-app-panel flex flex-col gap-3 min-w-0 h-full">
    <h3
      class="text-sm font-semibold text-lab-general-text m-0"
      :id="generateUniqueId(`crm-dashboard-chart-${title.replace(/\s+/g, '-').toLowerCase()}`)"
    >
      {{ title }}
    </h3>
    <p v-if="loading" class="text-sm text-lab-general-text-muted m-0">Loading chart…</p>
    <p v-else-if="error" class="text-sm text-amber-400 m-0">{{ error }}</p>
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
