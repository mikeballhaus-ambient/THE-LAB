<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import Button from 'primevue/button';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Message from 'primevue/message';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import type { Task } from '@/apps/lab-tasklist/shared/types/task.types';
import { parseCrmTaskMetadata } from '../../shared/types/crm-task-metadata';
import { useCrmTasksApi } from '../composables/useCrmTasksApi';

const props = defineProps<{
  taskListServerUrl: string;
}>();

const emit = defineEmits<{
  (e: 'open-create'): void;
  (e: 'open-edit', taskId: number): void;
}>();

const { generateUniqueId } = useUniqueElementId();

const tasksApi = computed(() => useCrmTasksApi(props.taskListServerUrl));

const loading = ref(false);
const loadError = ref<string | null>(null);
const tasks = ref<Task[]>([]);

async function refresh(): Promise<void> {
  loading.value = true;
  loadError.value = null;
  try {
    tasks.value = await tasksApi.value.fetchScopedTasks();
  } catch (err) {
    loadError.value = err instanceof Error ? err.message : 'Failed to load tasks';
    tasks.value = [];
  } finally {
    loading.value = false;
  }
}

function taskEntityKey(task: Task): string {
  const meta = parseCrmTaskMetadata(task.metadata);
  return meta?.entityKey ?? '—';
}

function taskRecordLabel(task: Task): string {
  const meta = parseCrmTaskMetadata(task.metadata);
  if (meta?.recordLabel) {
    return meta.recordLabel;
  }
  if (meta) {
    return `#${meta.recordId}`;
  }
  return '—';
}

onMounted(() => {
  void refresh();
});

defineExpose({ refresh });
</script>

<template>
  <div class="crm-tasks-view flex flex-col gap-3 min-h-0" :id="generateUniqueId('crm-tasks-view')">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <div>
        <h2
          class="text-lg font-semibold m-0 text-lab-general-text"
          :id="generateUniqueId('crm-tasks-heading')"
        >
          Tasks
        </h2>
        <p
          class="text-sm text-lab-general-text-muted m-0 mt-1"
          :id="generateUniqueId('crm-tasks-subheading')"
        >
          CRM-scoped tasks (stored in Task List, not visible in the Task List app)
        </p>
      </div>
      <Button
        label="New task"
        icon="pi pi-plus"
        size="small"
        :disabled="loading"
        :pt="{ root: { attrs: { id: generateUniqueId('crm-new-task-btn') } } }"
        @click="emit('open-create')"
      />
    </div>

    <Message v-if="loadError" severity="error" :closable="false">{{ loadError }}</Message>

    <DataTable
      :value="tasks"
      :loading="loading"
      striped-rows
      size="small"
      class="crm-tasks-table text-sm"
      :pt="{ root: { attrs: { id: generateUniqueId('crm-tasks-table') } } }"
    >
      <Column field="title" header="Title" />
      <Column header="Entity">
        <template #body="{ data }">
          {{ taskEntityKey(data as Task) }}
        </template>
      </Column>
      <Column header="Record">
        <template #body="{ data }">
          {{ taskRecordLabel(data as Task) }}
        </template>
      </Column>
      <Column field="status" header="Status" />
      <Column field="priority" header="Priority" />
      <Column header="Actions" style="width: 6rem">
        <template #body="{ data }">
          <Button
            label="Edit"
            size="small"
            text
            :pt="{ root: { attrs: { id: generateUniqueId(`crm-edit-task-${data.id}`) } } }"
            @click="emit('open-edit', (data as Task).id)"
          />
        </template>
      </Column>
      <template #empty>
        <p class="text-lab-general-text-muted text-sm m-2">No CRM tasks yet.</p>
      </template>
    </DataTable>
  </div>
</template>
