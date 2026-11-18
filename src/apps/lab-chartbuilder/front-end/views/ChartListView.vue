<script setup lang="ts">
import { onMounted } from 'vue';
import Button from 'primevue/button';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Message from 'primevue/message';
import Tag from 'primevue/tag';
import type { ChartSchema } from '@/shared/charts';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import { labRecordActionButtonPt } from '@/shared/constants/lab-record-automation';
import { useCharts } from '../composables/useCharts';

const props = defineProps<{
  serverUrl: string;
}>();

const emit = defineEmits<{
  create: [];
  edit: [chartKey: string];
  back: [];
  'request-delete': [chartKey: string];
}>();

const { generateUniqueId } = useUniqueElementId();
const { charts, loading, error, loadCharts, deleteChart } = useCharts(props.serverUrl);

onMounted(() => {
  void loadCharts();
});

function onDelete(row: ChartSchema): void {
  emit('request-delete', row.chartKey);
}

async function confirmDeleteChart(chartKey: string): Promise<void> {
  const row = charts.value.find((c) => c.chartKey === chartKey);
  if (!row) {
    return;
  }
  if (!confirm(`Delete chart "${row.name}"?`)) {
    return;
  }
  try {
    await deleteChart(chartKey);
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Delete failed';
  }
}

async function refreshCatalog(): Promise<void> {
  await loadCharts();
}

defineExpose({
  refreshCatalog,
  getLoadError: () => error.value,
  confirmDeleteChart,
});
</script>

<template>
  <div class="chart-list-view flex flex-col gap-4">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <Button
        :id="generateUniqueId('cb-list-back')"
        label="Back"
        severity="secondary"
        text
        icon="pi pi-arrow-left"
        @click="emit('back')"
      />
      <div class="flex flex-wrap gap-2">
        <Button
          :id="generateUniqueId('cb-list-refresh')"
          label="Refresh"
          icon="pi pi-refresh"
          severity="secondary"
          outlined
          :loading="loading"
          aria-label="Refresh chart library"
          @click="refreshCatalog"
        />
        <Button
          :id="generateUniqueId('cb-list-new')"
          label="New chart"
          icon="pi pi-plus"
          @click="emit('create')"
        />
      </div>
    </div>

    <Message v-if="error" severity="error" :closable="false">{{ error }}</Message>

    <div class="lab-app-panel min-w-0 overflow-x-auto">
    <DataTable
      :value="charts"
      :loading="loading"
      striped-rows
      size="small"
      class="w-full"
      :pt="{ root: { attrs: { id: generateUniqueId('cb-charts-table') } } }"
    >
      <Column field="name" header="Name" body-class="text-lab-general-text" />
      <Column field="chartKey" header="Key" body-class="text-lab-general-text">
        <template #body="{ data }">
          <code class="text-xs text-lab-general-text">{{ data.chartKey }}</code>
        </template>
      </Column>
      <Column field="chartType" header="Type" body-class="text-lab-general-text" />
      <Column header="Status">
        <template #body="{ data }">
          <Tag
            :value="data.is_active !== false ? 'Active' : 'Inactive'"
            :severity="data.is_active !== false ? 'success' : 'secondary'"
          />
        </template>
      </Column>
      <Column header="Actions" style="width: 10rem">
        <template #body="{ data }">
          <div class="flex gap-1">
            <Button
              icon="pi pi-pencil"
              severity="secondary"
              text
              rounded
              aria-label="Edit"
              :pt="labRecordActionButtonPt(generateUniqueId, 'cb-chart', 'edit', data.chartKey, data.name)"
              @click="emit('edit', data.chartKey)"
            />
            <Button
              icon="pi pi-trash"
              severity="danger"
              text
              rounded
              aria-label="Delete"
              :pt="labRecordActionButtonPt(generateUniqueId, 'cb-chart', 'delete', data.chartKey, data.name)"
              @click="onDelete(data)"
            />
          </div>
        </template>
      </Column>
    </DataTable>
    </div>
  </div>
</template>
