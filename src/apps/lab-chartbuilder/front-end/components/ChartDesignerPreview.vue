<script setup lang="ts">
import { computed } from 'vue';
import type { ChartDataPayload, ChartSchema } from '@/shared/charts';
import { ChartRuntime, getSampleDataForChartType, useLabChartThemeSync } from '@/shared/charts';

const { themeVersion } = useLabChartThemeSync();

const props = defineProps<{
  schema: ChartSchema;
  sampleOverride?: ChartDataPayload | null;
  suppressAnimation?: boolean;
}>();

const previewData = computed(() => {
  void themeVersion.value;
  return (
    props.sampleOverride ??
    getSampleDataForChartType(props.schema.chartType, { stacked: props.schema.options.stacked })
  );
});

</script>

<template>
  <div class="chart-designer-preview w-full min-w-0 py-1">
    <ChartRuntime
      :schema="schema"
      :data="previewData"
      :suppress-animation="suppressAnimation"
    />
  </div>
</template>
