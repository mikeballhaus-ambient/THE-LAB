<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { Task } from '../../shared/types';
import { useTasks } from '../composables/useTasks';
import { useTaskLists } from '../composables/useTaskLists';
import TaskItem from './TaskItem.vue';
import TaskFilters from './TaskFilters.vue';
import TaskListReports from './TaskListReports.vue';
import { LabIntegrationSurface } from '@/shared/integration';
import { useToast } from 'primevue/usetoast';
import { ToastMessageOptions } from 'primevue/toast';
import Button from 'primevue/button';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import { labRecordActionButtonPt } from '@/shared/constants/lab-record-automation';
import { labAppFetch } from '@/shared/composables/useLabUserHeaders';
import { TASK_LIST_APP_REGISTRY_ID } from '../../shared/constants/app-scope';

interface Props {
  serverUrl: string;
}

const props = defineProps<Props>();

const integrationSurfaceRef = ref<InstanceType<typeof LabIntegrationSurface> | null>(null);

const toast = useToast();
const { generateUniqueId } = useUniqueElementId();

// Task list state
const {
  fetchTasks,
  allTasks,
  loading: tasksLoading,
} = useTasks(props.serverUrl);

const {
  taskLists,
  fetchTaskLists,
} = useTaskLists(props.serverUrl);

// UI state
const selectedTask = ref<Task | null>(null);
const selectedList = ref<number | null>(null);
const currentListTasks = ref<Task[]>([]);

const effectiveTaskListId = computed((): number | null => {
  if (selectedList.value != null) {
    return selectedList.value;
  }
  const first = taskLists.value?.[0]?.id;
  return first != null ? first : null;
});

const integrationContext = computed((): Record<string, unknown> => {
  const ctx: Record<string, unknown> = {};
  const listId = effectiveTaskListId.value;
  if (listId != null) {
    ctx.taskListId = listId;
  }
  if (selectedTask.value?.id != null) {
    ctx.taskId = selectedTask.value.id;
  }
  return ctx;
});

const selectedListRecord = computed(() => {
  if (selectedList.value == null) {
    return undefined;
  }
  return taskLists.value?.find((row) => Number(row.id) === Number(selectedList.value));
});

/** Prefer tasks embedded on the list from GET /api/task-lists; fall back to per-list fetch. */
const visibleListTasks = computed((): Task[] => {
  const embedded = selectedListRecord.value?.tasks;
  if (embedded != null && embedded.length > 0) {
    return embedded;
  }
  return currentListTasks.value;
});

function tasksForListFromCache(listId: number): Task[] {
  const id = Number(listId);
  const list = taskLists.value?.find((row) => Number(row.id) === id);
  return list?.tasks ?? [];
}

async function loadTasksForList(listId: number): Promise<Task[]> {
  const cached = tasksForListFromCache(listId);
  if (cached.length > 0) {
    return cached;
  }
  const base = props.serverUrl.replace(/\/$/, '');
  const response = await labAppFetch(`${base}/api/tasks/list/${listId}`);
  if (!response.ok) {
    return [];
  }
  const body = (await response.json()) as { data?: Task[] | { tasks?: Task[] } };
  const payload = body.data;
  if (Array.isArray(payload)) {
    return payload;
  }
  if (payload && Array.isArray(payload.tasks)) {
    return payload.tasks;
  }
  return [];
}

async function refreshSelectedListTasks(): Promise<void> {
  if (selectedList.value == null) {
    return;
  }
  await fetchTaskLists();
  currentListTasks.value = await loadTasksForList(selectedList.value);
}

const onIntegrationSuccess = async (payload: { slot: string }): Promise<void> => {
  if (payload.slot === 'task-list.create.dialog') {
    await onTaskListFormSuccess();
    return;
  }
  if (payload.slot === 'task-list.edit.dialog') {
    await onTaskListEditSuccess();
    return;
  }
  if (payload.slot === 'task-list.delete.dialog') {
    await onTaskListDeleteSuccess();
    return;
  }
  if (payload.slot === 'task.delete.dialog') {
    await onTaskDeleteSuccess();
    return;
  }
  selectedTask.value = null;
  toast.add({
    severity: 'success',
    summary: 'Task Saved',
    detail: 'Task saved through integration binding',
    life: 3000,
  } as ToastMessageOptions);
  await fetchTasks(1, {}, { field: 'createdAt', direction: 'desc' }, 5000);
  await refreshSelectedListTasks();
};

const onTaskListFormSuccess = async (): Promise<void> => {
  toast.add({
    severity: 'success',
    summary: 'List Created',
    detail: 'Task list created through Forms Builder',
    life: 3000,
  } as ToastMessageOptions);
  await fetchTaskLists();
  const latest = taskLists.value[taskLists.value.length - 1];
  if (latest) {
    await selectList(latest.id);
  }
};

const onTaskListEditSuccess = async (): Promise<void> => {
  toast.add({
    severity: 'success',
    summary: 'List Updated',
    detail: 'Task list saved through Forms Builder',
    life: 3000,
  } as ToastMessageOptions);
  const listId = selectedList.value;
  await fetchTaskLists();
  if (listId != null) {
    await selectList(listId);
  }
};

const openCreateTaskDialog = (): void => {
  selectedTask.value = null;
  integrationSurfaceRef.value?.openSlot('task.create.dialog');
};

const openEditTaskDialog = (task: Task): void => {
  selectedTask.value = task;
  integrationSurfaceRef.value?.openSlot('task.edit.dialog');
};

const openCreateListDialog = (): void => {
  integrationSurfaceRef.value?.openSlot('task-list.create.dialog');
};

const openEditListDialog = (): void => {
  if (selectedList.value == null) {
    return;
  }
  integrationSurfaceRef.value?.openSlot('task-list.edit.dialog');
};

const openDeleteListDialog = (): void => {
  if (selectedList.value == null) {
    return;
  }
  integrationSurfaceRef.value?.openSlot('task-list.delete.dialog');
};

const onTaskListDeleteSuccess = async (): Promise<void> => {
  toast.add({
    severity: 'success',
    summary: 'List Removed',
    detail: 'Task list removed through integration binding',
    life: 3000,
  } as ToastMessageOptions);
  selectedList.value = null;
  currentListTasks.value = [];
  await fetchTaskLists();
  const first = taskLists.value[0];
  if (first) {
    await selectList(first.id);
  }
};

const onTaskDeleteSuccess = async (): Promise<void> => {
  toast.add({
    severity: 'success',
    summary: 'Task Deleted',
    detail: 'Task deleted through integration binding',
    life: 3000,
  } as ToastMessageOptions);
  selectedTask.value = null;
  await fetchTasks(1, {}, { field: 'createdAt', direction: 'desc' }, 5000);
  await refreshSelectedListTasks();
};

// Fetch all data on mount
onMounted(async () => {
  await Promise.all([
    fetchTasks(1, {}, { field: 'createdAt', direction: 'desc' }, 5000),
    fetchTaskLists(),
  ]).then(() => {
    if (taskLists.value && taskLists.value.length > 0) {
      selectList(taskLists.value[0].id)
    }
  });
});

// Edit task
const handleEditTask = (task: Task) => {
  openEditTaskDialog(task);
};

const confirmDeleteTask = (task: Task): void => {
  selectedTask.value = task;
  integrationSurfaceRef.value?.openSlot('task.delete.dialog');
};

// Select task list
const selectList = async (listId: number) => {
  const id = Number(listId);
  selectedList.value = id;
  currentListTasks.value = await loadTasksForList(id);
};

watch(
  () => taskLists.value?.map((row) => row.id),
  (ids) => {
    if (ids == null || ids.length === 0) {
      return;
    }
    if (selectedList.value == null || !Number.isFinite(Number(selectedList.value))) {
      void selectList(Number(ids[0]));
    }
  },
  { immediate: true },
);

// Get list icon based on name
const getListIcon = (listName: string) => {
  const icons: Record<string, string> = {
    'work': 'pi pi-briefcase',
    'personal': 'pi pi-user',
    'project': 'pi pi-project',
    'urgent': 'pi pi-exclamation-triangle',
    'default': 'pi pi-list'
  };
  const lowerName = listName.toLowerCase();
  for (const [key, icon] of Object.entries(icons)) {
    if (lowerName.includes(key)) return icon;
  }
  return icons.default;
};

const descriptionIcon = 'pi pi-info-circle';
</script>

<template>
  <div :id="generateUniqueId('container')" class="task-list-container lab-app-landing w-full min-w-0">
    <TaskListReports
      :tasks="allTasks"
      :task-lists="taskLists ?? []"
      :loading="tasksLoading"
    >
      <template #charts>
        <LabIntegrationSurface
          ref="integrationSurfaceRef"
          :host-app-id="TASK_LIST_APP_REGISTRY_ID"
          surface-id="task-list.workspace"
          :server-url="serverUrl"
          :context="integrationContext"
          :inline-region-ids="['reports.grid']"
          @integration-success="onIntegrationSuccess"
        />
      </template>
    </TaskListReports>

    <section class="lab-app-panel w-full min-w-0" :id="generateUniqueId('lists-panel')">
      <!-- Header -->
      <div :id="generateUniqueId('header')" class="flex justify-between mb-2">
        <!-- Task Lists Tabs -->
        <div :id="generateUniqueId('tabs-container')" class="flex items-center gap-2 overflow-x-auto pb-2">
          <Button v-for="list in taskLists" :key="list.id" :id="generateUniqueId(`list-btn-${list.id}`)"
            :label="list.name" :icon="getListIcon(list.name)"             :pt:root:class="{
              'bg-lab-button-bg! text-lab-button-text!': Number(selectedList) === Number(list.id)
            }" @click="selectList(Number(list.id))" severity="secondary" />
        </div>
        <Button :id="generateUniqueId('new-list-btn')" label="New List" icon="pi pi-plus" severity="secondary"
          @click="openCreateListDialog" />
      </div>

      <!-- Main Content -->
      <div v-if="selectedList != null" :id="generateUniqueId('main-content')" class="active-task-list-container flex flex-col gap-4">

        <!-- Task Filters -->
        <TaskFilters />

        <!-- New Task Button and Description Container -->
        <div :id="generateUniqueId('new-task-container')" class="flex justify-between items-center gap-4 flex-wrap">
          <Button :id="generateUniqueId('new-task-btn')" label="New Task" icon="pi pi-plus" severity="secondary"
            @click="openCreateTaskDialog" />
          <div :id="generateUniqueId('description-container')" class="flex items-center gap-2 min-w-0 flex-1 justify-end">
            <i :id="generateUniqueId('info-icon')" :class="descriptionIcon" class="text-lab-general-text-muted shrink-0"></i>
            <div class="text-lg text-lab-general-text-muted truncate max-w-md">
              {{ selectedList != null ? taskLists?.find((l) => Number(l.id) === Number(selectedList))?.description || 'No description' : '' }}
            </div>
            <Button
              v-if="selectedList != null"
              label="Edit List"
              icon="pi pi-pencil"
              severity="secondary"
              size="small"
              :pt="
                labRecordActionButtonPt(
                  generateUniqueId,
                  'task-list',
                  'edit',
                  selectedList,
                  selectedListRecord?.name ?? 'Task list',
                )
              "
              @click="openEditListDialog"
            />
            <Button
              v-if="selectedList != null"
              label="Remove List"
              icon="pi pi-trash"
              severity="danger"
              size="small"
              outlined
              :pt="
                labRecordActionButtonPt(
                  generateUniqueId,
                  'task-list',
                  'delete',
                  selectedList,
                  selectedListRecord?.name ?? 'Task list',
                )
              "
              @click="openDeleteListDialog"
            />
          </div>
        </div>

        <!-- Task Items -->
        <section
          v-if="visibleListTasks.length !== 0"
          :id="generateUniqueId('tasks-container')"
          class="task-list-items flex flex-col min-w-0"
          aria-label="Tasks in this list"
        >
          <TaskItem
            v-for="task in visibleListTasks"
            :key="task.id"
            :task="task"
            :on-edit="handleEditTask"
            :on-delete="confirmDeleteTask"
          />
        </section>

        <!-- Empty State -->
        <div v-else :id="generateUniqueId('empty-state')"
          class="text-center py-12 lab-app-panel rounded-lg">
          <i :id="generateUniqueId('inbox-icon')" class="pi pi-inbox text-6xl text-lab-general-text-muted mb-4"></i>
          <h3 :id="generateUniqueId('empty-title')" class="text-lg font-medium text-lab-general-text mb-2">
            No tasks in this list
          </h3>
          <p :id="generateUniqueId('empty-text')" class="text-lab-general-text-muted">
            Create your first task to get started
          </p>
        </div>
      </div>

      <!-- No List Selected -->
      <div v-else :id="generateUniqueId('no-list-selected')" class="text-center py-12">
        <i :id="generateUniqueId('list-icon')" class="pi pi-list text-4xl text-lab-general-text-muted mb-3"></i>
        <h3 :id="generateUniqueId('select-list-title')" class="text-lg font-medium text-lab-general-text m-0">
          Select a task list
        </h3>
        <p :id="generateUniqueId('select-list-text')" class="text-lab-general-text-muted mt-2 m-0">
          Choose a list above or create a new one
        </p>
      </div>
    </section>
  </div>

</template>