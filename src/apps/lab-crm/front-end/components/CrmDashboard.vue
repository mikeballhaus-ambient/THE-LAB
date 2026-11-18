<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import { useCrmApi } from '../composables/useCrmApi';
import type { ConnectorEntityRecord, EntityDefinition } from '../../shared/types/entity.types';
import {
  countTasksByStatus,
  formatCurrency,
  sumNumericField,
} from '../../shared/utils/dashboard-aggregates';
import type { Task } from '@/apps/lab-tasklist/shared/types/task.types';
import { useCrmTasksApi } from '../composables/useCrmTasksApi';
import EntityIcon from './EntityIcon.vue';

const props = defineProps<{
  serverUrl: string;
  definitions: EntityDefinition[];
  taskListServerUrl?: string;
}>();

const { generateUniqueId } = useUniqueElementId();
const api = useCrmApi(props.serverUrl);

const loading = ref(true);
const loadError = ref<string | null>(null);

const contactCount = ref(0);
const leadCount = ref(0);
const salesCount = ref(0);
const serviceCount = ref(0);
const pipelineTotal = ref(0);
const wonTotal = ref(0);

const salesRecords = ref<ConnectorEntityRecord[]>([]);

const crmTasks = ref<Task[]>([]);
const taskLoadError = ref<string | null>(null);

const taskTotal = computed(() => crmTasks.value.length);
const taskPending = computed(() => countTasksByStatus(crmTasks.value, 'pending'));
const taskInProgress = computed(() => countTasksByStatus(crmTasks.value, 'in_progress'));
const taskCompleted = computed(() => countTasksByStatus(crmTasks.value, 'completed'));

const salesDef = computed(() => props.definitions.find((d) => d.entityKey === 'sales'));
const serviceDef = computed(() => props.definitions.find((d) => d.entityKey === 'service'));
const showTaskMetrics = computed(() => Boolean(props.taskListServerUrl?.trim()));

async function load(): Promise<void> {
  loading.value = true;
  loadError.value = null;
  try {
    const [contacts, leads, sales, service] = await Promise.all([
      api.fetchRecords('contacts'),
      api.fetchRecords('leads'),
      api.fetchRecords('sales'),
      api.fetchRecords('service'),
    ]);
    contactCount.value = contacts.records.length;
    leadCount.value = leads.records.length;
    salesCount.value = sales.records.length;
    serviceCount.value = service.records.length;
    salesRecords.value = sales.records;
    pipelineTotal.value = sumNumericField(sales.records, 'amount');
    wonTotal.value = sumNumericField(
      sales.records.filter((r) => String(r.stage ?? '') === 'closed-won'),
      'amount',
    );

    taskLoadError.value = null;
    crmTasks.value = [];
    const taskUrl = props.taskListServerUrl?.trim();
    if (taskUrl) {
      try {
        const tasksApi = useCrmTasksApi(taskUrl);
        crmTasks.value = await tasksApi.fetchScopedTasks();
      } catch (taskErr) {
        taskLoadError.value =
          taskErr instanceof Error ? taskErr.message : 'Failed to load CRM task metrics';
      }
    }
  } catch (err) {
    loadError.value = err instanceof Error ? err.message : 'Failed to load dashboard';
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  void load();
});

defineExpose({ refresh: load });
</script>

<template>
  <div class="crm-dashboard flex flex-col gap-4 p-1">
    <div class="flex flex-wrap items-end justify-between gap-2">
      <div>
        <h2
          class="text-xl font-semibold m-0 text-lab-general-text"
          :id="generateUniqueId('crm-dashboard-title')"
        >
          Dashboard
        </h2>
        <p class="text-sm text-lab-general-text-muted m-0 mt-1">
          KPI summary; charts below are wired via CRM integration bindings.
        </p>
      </div>
    </div>

    <p v-if="loading" class="text-sm text-lab-general-text-muted">Loading dashboard…</p>
    <p v-else-if="loadError" class="text-sm text-red-400">{{ loadError }}</p>

    <template v-else>
      <div class="grid grid-cols-[repeat(auto-fit,minmax(8.75rem,1fr))] gap-3 min-w-0">
        <div class="lab-app-panel" :id="generateUniqueId('crm-stat-contacts')">
          <p class="lab-app-kpi-label m-0">Contacts</p>
          <p class="text-2xl font-semibold m-0 mt-1 tabular-nums text-lab-general-text">{{ contactCount }}</p>
        </div>
        <div class="lab-app-panel">
          <p class="lab-app-kpi-label m-0">Leads</p>
          <p class="text-2xl font-semibold m-0 mt-1 tabular-nums text-lab-general-text">{{ leadCount }}</p>
        </div>
        <div class="lab-app-panel">
          <p class="lab-app-kpi-label m-0 flex items-center gap-1">
            <EntityIcon v-if="salesDef" :icon="salesDef.icon" size="sm" />
            Open deals
          </p>
          <p class="text-2xl font-semibold m-0 mt-1 tabular-nums text-lab-general-text">{{ salesCount }}</p>
        </div>
        <div class="lab-app-panel">
          <p class="lab-app-kpi-label m-0">Pipeline value</p>
          <p class="text-2xl font-semibold m-0 mt-1 tabular-nums truncate text-lab-general-text">
            {{ formatCurrency(pipelineTotal) }}
          </p>
        </div>
        <div class="lab-app-panel">
          <p class="lab-app-kpi-label m-0">Closed won</p>
          <p class="text-2xl font-semibold m-0 mt-1 text-emerald-600 dark:text-emerald-400 tabular-nums truncate">
            {{ formatCurrency(wonTotal) }}
          </p>
        </div>
        <div class="lab-app-panel">
          <p class="lab-app-kpi-label m-0 flex items-center gap-1">
            <EntityIcon v-if="serviceDef" :icon="serviceDef.icon" size="sm" />
            Service cases
          </p>
          <p class="text-2xl font-semibold m-0 mt-1 tabular-nums text-lab-general-text">{{ serviceCount }}</p>
        </div>
      </div>

      <template v-if="showTaskMetrics">
        <div class="flex flex-wrap items-baseline justify-between gap-2 pt-1">
          <h3
            class="text-sm font-semibold text-lab-general-text m-0"
            :id="generateUniqueId('crm-dashboard-tasks-heading')"
          >
            CRM tasks
          </h3>
          <p
            v-if="taskLoadError"
            class="text-xs text-amber-400 m-0"
            :id="generateUniqueId('crm-dashboard-tasks-error')"
          >
            {{ taskLoadError }}
          </p>
        </div>
        <div
          v-if="!taskLoadError"
          class="grid grid-cols-[repeat(auto-fit,minmax(8.75rem,1fr))] gap-3 min-w-0"
        >
          <div
            class="lab-app-panel border border-[color-mix(in_srgb,var(--lab-button-border)_45%,var(--lab-general-border))]"
            :id="generateUniqueId('crm-stat-tasks-total')"
          >
            <p class="lab-app-kpi-label m-0">Total tasks</p>
            <p class="text-2xl font-semibold m-0 mt-1 tabular-nums text-lab-general-text">{{ taskTotal }}</p>
          </div>
          <div
            class="lab-app-panel border border-[color-mix(in_srgb,var(--lab-button-border)_45%,var(--lab-general-border))]"
          >
            <p class="lab-app-kpi-label m-0">Pending</p>
            <p class="text-2xl font-semibold m-0 mt-1 tabular-nums text-lab-general-text">{{ taskPending }}</p>
          </div>
          <div
            class="lab-app-panel border border-[color-mix(in_srgb,var(--lab-button-border)_45%,var(--lab-general-border))]"
          >
            <p class="lab-app-kpi-label m-0">In progress</p>
            <p class="text-2xl font-semibold m-0 mt-1 tabular-nums text-lab-general-text">{{ taskInProgress }}</p>
          </div>
          <div
            class="lab-app-panel border border-[color-mix(in_srgb,var(--lab-button-border)_45%,var(--lab-general-border))]"
          >
            <p class="lab-app-kpi-label m-0">Completed</p>
            <p class="text-2xl font-semibold m-0 mt-1 tabular-nums text-emerald-600 dark:text-emerald-400">
              {{ taskCompleted }}
            </p>
          </div>
        </div>
      </template>
    </template>
  </div>
</template>
