<script setup lang="ts">
import { computed } from 'vue';
import { ChartContextReportWidget, type ChartLegendPosition } from '@/shared/charts';
import { catalogChartLegendPosition } from '@/shared/config/catalog-chart-config';
import { usePeerAppServerUrl } from '@/shared/composables/usePeerAppServerUrl';
import { CHART_BUILDER_APP_ID } from '@/shared/config/chart-builder-url';
import type { AppLabIntegrationManifestV1 } from '@/shared/types/lab-integration-manifest';
import type { LabIntegrationBindingRecord } from '@/shared/types/lab-integrations';
import { LAB_LEDGER_CHART_SLOTS } from '@/shared/lab-integrations/platform-catalog-integration-services';

const props = defineProps<{
  hostAppId: string;
  binding: LabIntegrationBindingRecord;
  manifest: AppLabIntegrationManifestV1 | null;
  context: Record<string, unknown>;
}>();

const slotAccept = computed(() =>
  props.manifest?.accepts?.find((row) => row.slot === props.binding.slot),
);

const label = computed(() => slotAccept.value?.label ?? props.binding.slot);

const requiredContextKeys = computed(() => slotAccept.value?.contextKeys ?? []);

const chartContext = computed((): Record<string, unknown> => {
  const out: Record<string, unknown> = {
    ...props.context,
    hostAppId: props.hostAppId,
  };
  if (out.taskListId != null && out.taskListId !== '') {
    const parsed = Number(out.taskListId);
    if (!Number.isNaN(parsed)) {
      out.taskListId = parsed;
    }
  }
  return out;
});

const { url: chartBuilderUrl } = usePeerAppServerUrl(CHART_BUILDER_APP_ID);

const legendPosition = computed((): ChartLegendPosition | undefined => {
  if (props.binding.slot === LAB_LEDGER_CHART_SLOTS.postingsByCredit) {
    return 'right';
  }
  if (props.binding.slot.startsWith('ledger.')) {
    return 'top';
  }
  const catalogLegend = catalogChartLegendPosition(props.hostAppId, props.binding.slot);
  if (catalogLegend) {
    return catalogLegend;
  }
  if (props.hostAppId === 'app-knowledge-base' && props.binding.slot.startsWith('reports.')) {
    return 'right';
  }
  return undefined;
});

const chartCompact = computed(() => {
  if (props.hostAppId === 'app-knowledge-base' && props.binding.slot.startsWith('reports.')) {
    return true;
  }
  return props.binding.slot.startsWith('ledger.');
});

const chartTile = computed(
  () => props.hostAppId === 'app-knowledge-base' && props.binding.slot.startsWith('reports.'),
);
</script>

<template>
  <ChartContextReportWidget
    v-if="chartBuilderUrl"
    :title="label"
    :chart-key="binding.providerRef"
    :chart-builder-url="chartBuilderUrl"
    :context="chartContext"
    :required-context-keys="requiredContextKeys"
    :id-prefix="`lab-int-chart-${binding.slot}`"
    :compact="chartCompact"
    :tile="chartTile"
    :legend-position="legendPosition"
  />
  <div
    v-else
    class="rounded-lg border border-lab-general-border bg-lab-general-bg p-4 text-xs text-lab-general-text-muted"
    :data-lab-integration-slot="binding.slot"
  >
    Chart Builder is not available.
  </div>
</template>
