<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import {
  ChartRuntime,
  renderChart,
  legendAndDataLabelLayoutOptions,
  mergeChartOptionsPartial,
  type ChartDataPayload,
  type ChartLegendPosition,
  type ChartSchema,
  resolveReportLegendDisplay,
} from '@/shared/charts';
import { getLabChartThemeColors, useLabChartThemeSync } from './lab-chart-theme';

const props = defineProps<{
  title: string;
  chartKey: string;
  chartBuilderUrl: string;
  context: Record<string, unknown>;
  /** When set, render waits until each key is present in context (avoids connector filter errors). */
  requiredContextKeys?: string[];
  idPrefix?: string;
  /** Shorter chart canvas for dashboard tiles (e.g. ledger journal grid). */
  compact?: boolean;
  /** Extra-short canvas for collapsible report bars (Knowledge Base). */
  tile?: boolean;
  legendPosition?: ChartLegendPosition;
}>();

const resolvedLegendPosition = computed((): ChartLegendPosition => {
  if (props.legendPosition) {
    return props.legendPosition;
  }
  const fromSchema = schema.value?.options?.legendPosition;
  if (fromSchema) {
    return fromSchema;
  }
  if (props.compact) {
    return 'bottom';
  }
  const chartType = schema.value?.chartType;
  if (chartType === 'bar' || chartType === 'line') {
    return 'bottom';
  }
  return 'top';
});

const { generateUniqueId } = useUniqueElementId();
const { themeVersion } = useLabChartThemeSync();

const schema = ref<ChartSchema | null>(null);
const data = ref<ChartDataPayload | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);
let loadGeneration = 0;

const contextSignature = computed(() => JSON.stringify(props.context ?? {}));

const missingContextKeys = computed(() =>
  (props.requiredContextKeys ?? []).filter((key) => {
    const value = props.context?.[key];
    return value === undefined || value === null || value === '';
  }),
);

const waitingForContext = computed(() => missingContextKeys.value.length > 0);

const chartOptionsOverride = computed(() => {
  void themeVersion.value;
  const compact = props.compact === true;
  const showDataLabels = schema.value?.options?.showDataLabels === true && !compact;
  const legendDisplay = resolveReportLegendDisplay(schema.value?.options);
  const position = resolvedLegendPosition.value;
  const ui = getLabChartThemeColors();

  const pluginsOverride = {
    title: { display: false },
    legend: {
      display: legendDisplay,
      position,
      align: position === 'right' || position === 'left' ? 'start' : 'center',
      labels: {
        color: ui.legend,
        boxWidth: 12,
        font: { size: compact ? 11 : 12 },
      },
    },
    datalabels: { display: showDataLabels },
  };

  const tileLayout = props.tile
    ? { layout: { padding: { top: 4, bottom: 8, left: 4, right: 4 } } }
    : {};

  return mergeChartOptionsPartial(
    mergeChartOptionsPartial(
      {
        maintainAspectRatio: false,
        plugins: pluginsOverride,
      },
      legendAndDataLabelLayoutOptions({
        chartType: schema.value?.chartType ?? 'bar',
        legendDisplay,
        legendPosition: position,
        showDataLabels,
      }),
    ),
    tileLayout,
  );
});

/** KB report tiles — must match ChartRuntime `height` so canvas does not spill past the card. */
const TILE_CHART_HEIGHT_PX = '168px';

async function loadChart(): Promise<void> {
  const generation = ++loadGeneration;
  if (waitingForContext.value) {
    schema.value = null;
    data.value = null;
    error.value = null;
    loading.value = false;
    return;
  }
  if (!props.chartBuilderUrl?.trim()) {
    schema.value = null;
    data.value = null;
    error.value = 'Chart Builder URL is not configured';
    return;
  }
  loading.value = true;
  error.value = null;
  try {
    const result = await renderChart(props.chartBuilderUrl, props.chartKey, {
      context: props.context,
    });
    if (generation !== loadGeneration) {
      return;
    }
    schema.value = {
      ...result.schema,
      options: { ...result.schema.options, title: props.title },
    };
    data.value = result.data;
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

watch(
  () => [props.chartKey, props.chartBuilderUrl, contextSignature.value, themeVersion.value],
  () => {
    void loadChart();
  },
  { immediate: true },
);
</script>

<template>
  <div
    class="chart-context-report-widget lab-app-panel min-w-0 flex flex-col"
    :class="[compact ? 'p-2' : 'p-3', tile ? 'h-auto' : 'h-full']"
    :id="generateUniqueId(idPrefix ?? 'chart-context-report')"
  >
    <h3
      class="font-semibold text-lab-general-text m-0 mb-2"
      :class="compact ? 'text-sm' : 'text-sm'"
    >
      {{ title }}
    </h3>
    <p v-if="waitingForContext" class="text-xs text-lab-general-text-muted m-0">
      Select a task list below to load this chart.
    </p>
    <p v-else-if="loading" class="text-xs text-lab-general-text-muted m-0">Loading chart…</p>
    <p v-else-if="error" class="text-xs text-lab-danger m-0">{{ error }}</p>
    <div
      v-else-if="schema && data"
      class="w-full min-w-0"
      :class="
        tile
          ? 'overflow-hidden'
          : compact
            ? 'flex-1 min-h-[12rem]'
            : 'flex-1 min-h-[10rem]'
      "
    >
      <ChartRuntime
        :schema="schema"
        :data="data"
        :height="tile ? TILE_CHART_HEIGHT_PX : undefined"
        :options-override="chartOptionsOverride"
      />
    </div>
  </div>
</template>
