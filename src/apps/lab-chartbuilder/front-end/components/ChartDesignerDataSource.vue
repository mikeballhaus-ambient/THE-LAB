<script setup lang="ts">
import { computed, onMounted, watch } from 'vue';
import Select from 'primevue/select';
import InputText from 'primevue/inputtext';
import type { ChartDataMapping } from '@/shared/charts/chart-data-mapping';
import type { ChartSchema } from '@/shared/charts';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import { useChartConnectors } from '../composables/useChartConnectors';

const props = defineProps<{
  serverUrl: string;
  modelValue: ChartSchema;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: ChartSchema];
}>();

const { generateUniqueId } = useUniqueElementId();
const { connectors, loadConnectors } = useChartConnectors(props.serverUrl);

const mode = computed({
  get: () => (props.modelValue.dataConnectorId != null ? 'connector' : 'host'),
  set: (value: 'host' | 'connector') => {
    if (value === 'host') {
      patch({
        dataConnectorId: undefined,
        dataMapping: undefined,
        allowedFilters: undefined,
      });
      return;
    }
    const first = connectors.value[0];
    patch({
      dataConnectorId: first?.id,
      dataMapping: defaultMapping(),
      allowedFilters: [],
    });
  },
});

const connectorOptions = computed(() =>
  connectors.value.map((c) => ({
    label: `${c.appName} — ${c.entityName}`,
    value: c.id,
  })),
);

const selectedConnectorId = computed({
  get: () => props.modelValue.dataConnectorId ?? null,
  set: (id: number | null) => {
    patch({
      dataConnectorId: id ?? undefined,
      dataMapping: id != null ? props.modelValue.dataMapping ?? defaultMapping() : undefined,
    });
  },
});

const groupByField = computed({
  get: () =>
    props.modelValue.dataMapping?.mode === 'aggregate'
      ? props.modelValue.dataMapping.groupByField
      : 'status',
  set: (field: string) => {
    patch({
      dataMapping: {
        mode: 'aggregate',
        groupByField: field,
        measure: 'count',
        datasetLabel: props.modelValue.name,
      },
    });
  },
});

const datasetLabel = computed({
  get: () =>
    props.modelValue.dataMapping?.mode === 'aggregate'
      ? props.modelValue.dataMapping.datasetLabel ?? ''
      : '',
  set: (label: string) => {
    const mapping = props.modelValue.dataMapping;
    if (mapping?.mode !== 'aggregate') {
      return;
    }
    patch({ dataMapping: { ...mapping, datasetLabel: label } });
  },
});

function defaultMapping(): ChartDataMapping {
  return {
    mode: 'aggregate',
    groupByField: 'status',
    measure: 'count',
    datasetLabel: props.modelValue.name,
  };
}

function patch(partial: Partial<ChartSchema>): void {
  emit('update:modelValue', { ...props.modelValue, ...partial });
}

onMounted(() => {
  void loadConnectors();
});

watch(
  () => props.serverUrl,
  () => {
    void loadConnectors();
  },
);
</script>

<template>
  <div class="lab-app-panel flex flex-col gap-3" :id="generateUniqueId('cb-designer-data-source')">
    <p class="text-sm font-semibold m-0 text-lab-general-text">Data source</p>
    <Select
      v-model="mode"
      :options="[
        { label: 'Host supplies data at render time', value: 'host' },
        { label: 'Data connector (server fetch + aggregate)', value: 'connector' },
      ]"
      option-label="label"
      option-value="value"
      class="w-full"
      :pt="{ root: { attrs: { id: generateUniqueId('cb-data-source-mode') } } }"
    />
    <template v-if="mode === 'connector'">
      <Select
        v-model="selectedConnectorId"
        :options="connectorOptions"
        option-label="label"
        option-value="value"
        placeholder="Select connector"
        class="w-full"
        :pt="{ root: { attrs: { id: generateUniqueId('cb-data-source-connector') } } }"
      />
      <p v-if="connectorOptions.length === 0" class="text-xs text-amber-600 dark:text-amber-400 m-0">
        No connectors registered — open <strong>Data connectors</strong> from the home screen.
      </p>
      <div v-else class="grid gap-2 sm:grid-cols-2">
        <div>
          <label class="text-xs text-lab-general-text-muted" :id="generateUniqueId('cb-group-by-label')">Group by field</label>
          <InputText
            v-model="groupByField"
            class="w-full"
            :pt="{ root: { attrs: { id: generateUniqueId('cb-group-by-field') } } }"
          />
        </div>
        <div>
          <label class="text-xs text-lab-general-text-muted" :id="generateUniqueId('cb-dataset-label-caption')">Dataset label</label>
          <InputText
            v-model="datasetLabel"
            class="w-full"
            :pt="{ root: { attrs: { id: generateUniqueId('cb-dataset-label') } } }"
          />
        </div>
      </div>
      <p class="text-xs text-lab-general-text-muted m-0">
        Render uses <code class="text-xs">POST …/render/:chartKey</code> with <code class="text-xs">{ context }</code>.
        Integration-bound charts set filters via the wizard; add filter keys in a later designer pass if needed.
      </p>
    </template>
    <p v-else class="text-xs text-lab-general-text-muted m-0">
      Embed with <code class="text-xs">ChartReportWidget</code> or pass <code class="text-xs">data</code> in the render body.
    </p>
  </div>
</template>
