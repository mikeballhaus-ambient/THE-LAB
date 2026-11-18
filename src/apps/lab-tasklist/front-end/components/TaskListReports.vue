<script setup lang="ts">
import { computed } from 'vue';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import type { Task, TaskList } from '../../shared/types';

const props = defineProps<{
  tasks: Task[];
  taskLists: TaskList[];
  loading?: boolean;
}>();

const { generateUniqueId } = useUniqueElementId();

const totalTasks = computed(() => props.tasks.length);
const completed = computed(
  () => props.tasks.filter((t) => t.status === 'completed').length,
);
const open = computed(() => Math.max(0, totalTasks.value - completed.value));
const listCount = computed(() => props.taskLists.length);
</script>

<template>
  <section
    class="lab-form-section task-list-reports mb-0 flex flex-col gap-4"
    :id="generateUniqueId('task-list-reports')"
  >
    <h4 class="lab-form-section__title m-0" :id="generateUniqueId('task-list-reports-title')">
      <span class="lab-form-section__icon" aria-hidden="true"><i class="pi pi-chart-bar" /></span>
      Reports
    </h4>
    <p class="lab-form-section__lead m-0">Workload and completion across your lists.</p>

    <p v-if="loading" class="text-sm text-lab-general-text-muted m-0">Loading reports…</p>

    <div v-else class="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <div class="lab-app-kpi" :id="generateUniqueId('kpi-lists')">
        <span class="lab-app-kpi-label">Lists</span>
        <span class="lab-app-kpi-value">{{ listCount }}</span>
      </div>
      <div class="lab-app-kpi" :id="generateUniqueId('kpi-tasks')">
        <span class="lab-app-kpi-label">Total tasks</span>
        <span class="lab-app-kpi-value">{{ totalTasks }}</span>
      </div>
      <div class="lab-app-kpi" :id="generateUniqueId('kpi-open')">
        <span class="lab-app-kpi-label">Open</span>
        <span class="lab-app-kpi-value">{{ open }}</span>
      </div>
      <div class="lab-app-kpi" :id="generateUniqueId('kpi-completed')">
        <span class="lab-app-kpi-label">Completed</span>
        <span class="lab-app-kpi-value text-emerald-400">{{ completed }}</span>
      </div>
    </div>

    <div v-if="!loading" class="task-list-reports-charts min-w-0 w-full">
      <slot name="charts" />
    </div>
  </section>
</template>
