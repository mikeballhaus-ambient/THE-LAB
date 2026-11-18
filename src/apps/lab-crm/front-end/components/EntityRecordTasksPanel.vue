<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import Button from 'primevue/button';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Message from 'primevue/message';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import type { Task } from '@/apps/lab-tasklist/shared/types/task.types';
import { parseCrmTaskMetadata } from '../../shared/types/crm-task-metadata';
import { suggestedTasksForSalesStage } from '../../shared/config/sales-pipeline-task-suggestions';
import { useCrmTasksApi } from '../composables/useCrmTasksApi';
import type { CrmRecordIntegrationContext } from '../composables/useCrmIntegrations';

const props = defineProps<{
  taskListServerUrl: string;
  entityKey: string;
  recordId: number;
  recordLabel?: string;
  stage?: string;
  /** When true, hide task/ticket create shortcuts (approver read-only view). */
  actionsDisabled?: boolean;
  grouped?: boolean;
}>();

const emit = defineEmits<{
  (e: 'open-create', payload: CrmRecordIntegrationContext & { title?: string }): void;
  (e: 'open-edit', taskId: number): void;
}>();

const { generateUniqueId } = useUniqueElementId();

const tasksApi = computed(() => useCrmTasksApi(props.taskListServerUrl));

const loading = ref(false);
const loadError = ref<string | null>(null);
const tasks = ref<Task[]>([]);

const salesSuggestions = computed(() =>
  props.entityKey === 'sales' && props.stage
    ? suggestedTasksForSalesStage(props.stage)
    : [],
);

function recordContext(extra?: { title?: string }): CrmRecordIntegrationContext & { title?: string } {
  return {
    entityKey: props.entityKey,
    recordId: props.recordId,
    recordLabel: props.recordLabel,
    stage: props.stage,
    workflow: props.entityKey === 'sales' ? 'pipeline' : undefined,
    ...extra,
  };
}

async function refresh(): Promise<void> {
  if (!props.taskListServerUrl) {
    return;
  }
  loading.value = true;
  loadError.value = null;
  try {
    tasks.value = await tasksApi.value.fetchTasksForEntity(props.entityKey, props.recordId);
  } catch (err) {
    loadError.value = err instanceof Error ? err.message : 'Failed to load tasks';
    tasks.value = [];
  } finally {
    loading.value = false;
  }
}

function taskEntityLabel(task: Task): string {
  const meta = parseCrmTaskMetadata(task.metadata);
  if (meta?.recordLabel) {
    return meta.recordLabel;
  }
  if (meta) {
    return `${meta.entityKey} #${meta.recordId}`;
  }
  return '—';
}

watch(
  () => [props.entityKey, props.recordId, props.taskListServerUrl] as const,
  () => {
    void refresh();
  },
);

onMounted(() => {
  void refresh();
});

defineExpose({ refresh });
</script>

<template>
  <section
    class="lab-form-section entity-record-tasks-panel mb-0 flex min-w-0 flex-col gap-3"
    :class="grouped ? '' : 'border-t border-lab-general-border mt-4 pt-4'"
    :id="generateUniqueId(`crm-record-tasks-${entityKey}-${recordId}`)"
  >
    <div class="flex flex-wrap items-start justify-between gap-2">
      <h4
        class="lab-form-section__title m-0 min-w-0"
        :id="generateUniqueId('crm-record-tasks-heading')"
      >
        <span class="lab-form-section__icon" aria-hidden="true">
          <i class="pi pi-check-square" />
        </span>
        Related tasks
      </h4>
      <div class="flex flex-wrap gap-2">
        <Button
          v-for="(suggestion, idx) in salesSuggestions"
          :key="`${suggestion.title}-${idx}`"
          :label="suggestion.title"
          size="small"
          severity="secondary"
          outlined
          :disabled="actionsDisabled || loading"
          :pt="{
            root: {
              attrs: { id: generateUniqueId(`crm-suggested-task-${recordId}-${idx}`) },
            },
          }"
          @click="emit('open-create', recordContext({ title: suggestion.title }))"
        />
        <Button
          label="Add task"
          icon="pi pi-plus"
          size="small"
          :disabled="loading || actionsDisabled"
          :pt="{ root: { attrs: { id: generateUniqueId(`crm-add-record-task-${recordId}`) } } }"
          @click="emit('open-create', recordContext())"
        />
      </div>
    </div>

    <Message v-if="loadError" severity="error" :closable="false">{{ loadError }}</Message>

    <DataTable
      :value="tasks"
      :loading="loading"
      size="small"
      striped-rows
      class="text-sm"
      :pt="{ root: { attrs: { id: generateUniqueId(`crm-record-tasks-table-${recordId}`) } } }"
    >
      <Column field="title" header="Title" />
      <Column field="status" header="Status" />
      <Column field="priority" header="Priority" />
      <Column header="Context">
        <template #body="{ data }">
          {{ taskEntityLabel(data as Task) }}
        </template>
      </Column>
      <Column header="" style="width: 5rem">
        <template #body="{ data }">
          <Button
            label="Edit"
            size="small"
            text
            :pt="{
              root: { attrs: { id: generateUniqueId(`crm-edit-record-task-${(data as Task).id}`) } },
            }"
            @click="emit('open-edit', (data as Task).id)"
          />
        </template>
      </Column>
      <template #empty>
        <p class="text-lab-general-text-muted text-xs m-2">No tasks linked to this record.</p>
      </template>
    </DataTable>
  </section>
</template>
