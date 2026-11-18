<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import Button from 'primevue/button';
import Message from 'primevue/message';
import type { ChartSchema } from '@/shared/charts';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import { useCharts } from '../composables/useCharts';
import { generateChartKey } from '../utils/chart-key';
import ChartDesignerPreview from '../components/ChartDesignerPreview.vue';
import ChartIntegrationUnboundHint from '../components/ChartIntegrationUnboundHint.vue';
import { LabIntegrationSurface } from '@/shared/integration';
import { CHART_BUILDER_APP_ID } from '@/shared/config/chart-builder-url';
import {
  CHART_BUILDER_DESIGNER_SLOTS,
  CHART_BUILDER_DESIGNER_SURFACE,
} from '../constants/integration-slots';

const props = defineProps<{
  serverUrl: string;
  chartKey: string | null;
}>();

const emit = defineEmits<{
  saved: [];
  cancel: [];
}>();

const { generateUniqueId } = useUniqueElementId();
const { getChart } = useCharts(props.serverUrl);

const loading = ref(false);
const saving = ref(false);
const error = ref<string | null>(null);
const designerIntegrationRef = ref<InstanceType<typeof LabIntegrationSurface> | null>(null);
const inlineDesignerSlots = ref<string[]>([]);
const showSharedFormActions = ref(false);
const DESIGNER_FORMS_REGION = 'designer.forms';

const draft = ref<ChartSchema>({
  chartKey: generateChartKey(),
  name: 'Untitled chart',
  chartType: 'bar',
  options: { title: 'Sample chart', legendDisplay: true },
  layout: { size: 100 },
  is_active: true,
});

const integrationContext = computed((): Record<string, unknown> => {
  const key = props.chartKey ?? draft.value.chartKey;
  if (!key) {
    return {};
  }
  const connectorId = draft.value.dataConnectorId;
  const showConnectorMapping =
    props.chartKey != null && connectorId != null && connectorId > 0;
  return {
    chartKey: key,
    loadChartRecord: props.chartKey != null,
    integrationSlotVisibility: {
      [CHART_BUILDER_DESIGNER_SLOTS.metadata]: true,
      [CHART_BUILDER_DESIGNER_SLOTS.connector]: showConnectorMapping,
    },
  };
});

const showMetadataHint = computed(
  () => !inlineDesignerSlots.value.includes(CHART_BUILDER_DESIGNER_SLOTS.metadata),
);
const showConnectorHint = computed(
  () =>
    props.chartKey != null
    && draft.value.dataConnectorId != null
    && draft.value.dataConnectorId > 0
    && !inlineDesignerSlots.value.includes(CHART_BUILDER_DESIGNER_SLOTS.connector),
);

async function refreshDesignerBindingState(): Promise<void> {
  await designerIntegrationRef.value?.refresh();
  inlineDesignerSlots.value =
    designerIntegrationRef.value?.getInlineSlotsInRegion(DESIGNER_FORMS_REGION) ?? [];
  showSharedFormActions.value =
    designerIntegrationRef.value?.regionHideButtons(DESIGNER_FORMS_REGION) ?? false;
}

async function reloadDraftFromServer(): Promise<void> {
  const key = props.chartKey ?? draft.value.chartKey;
  if (!key) {
    return;
  }
  const existing = await getChart(key);
  if (existing) {
    draft.value = { ...existing };
  }
}

async function saveDesigner(): Promise<void> {
  if (!designerIntegrationRef.value) {
    return;
  }
  saving.value = true;
  error.value = null;
  try {
    await designerIntegrationRef.value.submitInlineRegion(DESIGNER_FORMS_REGION);
    await reloadDraftFromServer();
    await refreshDesignerBindingState();
    emit('saved');
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to save chart';
  } finally {
    saving.value = false;
  }
}

onMounted(async () => {
  if (props.chartKey) {
    loading.value = true;
    error.value = null;
    try {
      const existing = await getChart(props.chartKey);
      if (!existing) {
        error.value = 'Chart not found';
        return;
      }
      draft.value = { ...existing };
    } finally {
      loading.value = false;
    }
  }
  await nextTick();
  await refreshDesignerBindingState();
});

watch(
  () => props.chartKey,
  async () => {
    await nextTick();
    await refreshDesignerBindingState();
  },
);
</script>

<template>
  <div class="chart-designer-view flex flex-col gap-4">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <Button
        :id="generateUniqueId('cb-designer-cancel')"
        label="Back"
        severity="secondary"
        text
        icon="pi pi-arrow-left"
        @click="emit('cancel')"
      />
    </div>

    <Message v-if="error" severity="error" :closable="false">{{ error }}</Message>

    <div v-if="loading" class="text-muted-color">Loading…</div>
    <div v-else class="flex flex-col gap-6 lg:flex-row lg:items-start">
      <div class="min-w-0 flex-1 flex flex-col gap-4">
        <LabIntegrationSurface
          ref="designerIntegrationRef"
          :host-app-id="CHART_BUILDER_APP_ID"
          :surface-id="CHART_BUILDER_DESIGNER_SURFACE"
          :server-url="props.serverUrl"
          :context="integrationContext"
          :inline-region-ids="['designer.forms']"
          :hide-empty-regions="false"
        />
        <div
          v-if="showSharedFormActions"
          class="flex flex-wrap justify-end gap-2"
        >
          <Button
            :id="generateUniqueId('cb-designer-form-cancel')"
            label="Cancel"
            severity="secondary"
            outlined
            :disabled="saving"
            @click="emit('cancel')"
          />
          <Button
            :id="generateUniqueId('cb-designer-form-save')"
            :label="props.chartKey ? 'Update' : 'Save'"
            :loading="saving"
            @click="saveDesigner"
          />
        </div>
        <ChartIntegrationUnboundHint
          v-if="showMetadataHint"
          :slot-id="CHART_BUILDER_DESIGNER_SLOTS.metadata"
          label="Chart metadata"
        />
        <ChartIntegrationUnboundHint
          v-if="showConnectorHint"
          :slot-id="CHART_BUILDER_DESIGNER_SLOTS.connector"
          label="Data source / connector mapping"
        />
      </div>
      <div class="flex min-w-0 flex-1 flex-col lg:sticky lg:top-4 lg:self-start">
        <h3 :id="generateUniqueId('cb-preview-title')" class="mb-2 text-lg font-semibold">
          Preview (sample data)
        </h3>
        <ChartDesignerPreview :schema="draft" />
      </div>
    </div>
  </div>
</template>
