<script setup lang="ts">
import { computed } from 'vue';
import { TaskStats } from '../../shared/types';
import Accordion from 'primevue/accordion';
import AccordionPanel from 'primevue/accordionpanel';
import AccordionHeader from 'primevue/accordionheader';
import AccordionContent from 'primevue/accordioncontent';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';

interface Props {
  stats?: TaskStats;
}

const props = withDefaults(defineProps<Props>(), {
  stats: () => ({
    total: 0,
    completed: 0,
    pending: 0,
    inProgress: 0,
    cancelled: 0,
    byPriority: {
      low: 0,
      medium: 0,
      high: 0,
      urgent: 0
    }
  } as TaskStats)
});

const { generateUniqueId } = useUniqueElementId();

// Calculate completion percentage
const completionPercentage = computed(() => {
  const { total, completed } = props.stats;
  if (total === 0) return 0;
  return Math.round((completed / total) * 100);
});

// Get status color
const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    completed: 'text-green-600 dark:text-green-400',
    pending: 'text-yellow-600 dark:text-yellow-400',
    in_progress: 'text-blue-600 dark:text-blue-400',
    cancelled: 'text-red-600 dark:text-red-400'
  };
  return colors[status] || 'text-gray-600';
};

// Get priority color
const getPriorityColor = (priority: string) => {
  const colors: Record<string, string> = {
    urgent: 'text-red-600 dark:text-red-400',
    high: 'text-orange-600 dark:text-orange-400',
    medium: 'text-yellow-600 dark:text-yellow-400',
    low: 'text-green-600 dark:text-green-400'
  };
  return colors[priority] || 'text-gray-600';
};

// Format number with comma
const formatNumber = (num: number) => {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};
</script>

<template>
  <Accordion :id="generateUniqueId('accordion')" :value="null" expandIcon="pi pi-plus" collapseIcon="pi pi-minus">
    <AccordionPanel :id="generateUniqueId('panel-0')" value="0">
      <AccordionHeader :id="generateUniqueId('header')">
        <h2 :id="generateUniqueId('stats-title')" class="flex items-center gap-2 text-xl font-semibold text-lab-general-text">
          <i :id="generateUniqueId('chart-icon')" class="pi pi-chart-bar text-lab-general-text-muted"></i>
          Task List Statistics
        </h2>
      </AccordionHeader>
      <AccordionContent :id="generateUniqueId('content')">
        <!-- Completion Progress -->
        <div :id="generateUniqueId('completion-progress')" class="mb-6">
          <div :id="generateUniqueId('completion-rate-container')" class="flex justify-between items-center mb-2">
            <span :id="generateUniqueId('completion-label')" class="text-sm font-medium text-lab-general-text">Completion Rate</span>
            <span :id="generateUniqueId('completion-value')" :class="`text-lg font-bold ${getStatusColor('completed')}`">
              {{ completionPercentage }}%
            </span>
          </div>
          <div class="w-full bg-lab-prime-surface-200 rounded-full h-2.5">
            <div
              :id="generateUniqueId('progress-bar')"
              class="bg-green-600 dark:bg-green-400 h-2.5 rounded-full transition-all duration-500"
              :style="`width: ${completionPercentage}%`"
            ></div>
          </div>
          <p :id="generateUniqueId('completion-text')" class="text-xs text-lab-general-text-muted mt-1">
            {{ formatNumber(stats.completed) }} of {{ formatNumber(stats.total) }} tasks completed
          </p>
        </div>

        <!-- Status Breakdown -->
        <div :id="generateUniqueId('status-breakdown')" class="mb-6">
          <h3 :id="generateUniqueId('status-heading')" class="text-sm font-medium text-lab-general-text mb-3">By Status</h3>
          <div class="space-y-2">
            <div :id="generateUniqueId('completed-row')" class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <i :id="generateUniqueId('check-icon')" class="pi pi-check-circle text-green-500"></i>
                <span class="text-sm text-lab-general-text-muted">Completed</span>
              </div>
              <span :class="`font-semibold ${getStatusColor('completed')}`">
                {{ formatNumber(stats.completed) }}
              </span>
            </div>

            <div :id="generateUniqueId('pending-row')" class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <i :id="generateUniqueId('clock-icon')" class="pi pi-clock text-yellow-500"></i>
                <span class="text-sm text-lab-general-text-muted">Pending</span>
              </div>
              <span :class="`font-semibold ${getStatusColor('pending')}`">
                {{ formatNumber(stats.pending) }}
              </span>
            </div>

            <div :id="generateUniqueId('in-progress-row')" class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <i :id="generateUniqueId('spinner-icon')" class="pi pi-spinner text-blue-500 animate-spin"></i>
                <span class="text-sm text-lab-general-text-muted">In Progress</span>
              </div>
              <span :class="`font-semibold ${getStatusColor('in_progress')}`">
                {{ formatNumber(stats.inProgress) }}
              </span>
            </div>

            <div :id="generateUniqueId('cancelled-row')" class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <i :id="generateUniqueId('times-icon')" class="pi pi-times-circle text-red-500"></i>
                <span class="text-sm text-lab-general-text-muted">Cancelled</span>
              </div>
              <span :class="`font-semibold ${getStatusColor('cancelled')}`">
                {{ formatNumber(stats.cancelled) }}
              </span>
            </div>
          </div>
        </div>

        <!-- Priority Breakdown -->
        <div :id="generateUniqueId('priority-breakdown')">
          <h3 :id="generateUniqueId('priority-heading')" class="text-sm font-medium text-lab-general-text mb-3">By Priority</h3>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div v-for="(count, priority) in stats.byPriority" :key="priority" :id="generateUniqueId(`priority-card-${priority}`)" class="lab-app-kpi text-center">
              <div :class="`text-xs font-medium mb-1 ${getPriorityColor(priority)}`">
                {{ priority.charAt(0).toUpperCase() + priority.slice(1) }}
              </div>
              <div class="text-2xl font-bold text-lab-general-text">
                {{ formatNumber(count) }}
              </div>
            </div>
          </div>
        </div>
      </AccordionContent>
    </AccordionPanel>
  </Accordion>
</template>