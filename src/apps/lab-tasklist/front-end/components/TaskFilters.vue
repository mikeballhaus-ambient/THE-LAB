<script setup lang="ts">
import { watch } from 'vue';
import { useTaskFilters } from '../composables/useTaskFilters';
import { useToast } from 'primevue/usetoast';
import Badge from 'primevue/badge';
import Button from 'primevue/button';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';

const toast = useToast();
const { generateUniqueId } = useUniqueElementId();

// Initialize filter state
const {
  statusFilter,
  priorityFilter,
  searchQuery,
  assigneeFilter,
  dateRangeStart,
  dateRangeEnd,
  setStatusFilter,
  setPriorityFilter,
  setSearchQuery,
  setAssigneeFilter,
  setDateRangeStart,
  setDateRangeEnd,
  resetFilters,
  hasActiveFilters,
} = useTaskFilters();

// Watch for filter changes and show toast
watch([statusFilter, priorityFilter, searchQuery, assigneeFilter, dateRangeStart, dateRangeEnd], () => {
  if (hasActiveFilters.value) {
    toast.add({
      severity: 'info',
      summary: 'Filters Applied',
      detail: 'Task list has been filtered',
      life: 3000,
    });
  }
});

// Reset all filters
const handleReset = () => {
  resetFilters();
  toast.add({
    severity: 'info',
    summary: 'Filters Cleared',
    detail: 'All filters have been reset',
    life: 3000,
  });
};

// Clear specific filter
const handleClearFilter = (
  filterType: 'status' | 'priority' | 'search' | 'assignee' | 'dateRangeStart' | 'dateRangeEnd',
) => {
  switch (filterType) {
    case 'status':
      setStatusFilter('all');
      break;
    case 'priority':
      setPriorityFilter('all');
      break;
    case 'search':
      setSearchQuery('');
      break;
    case 'assignee':
      setAssigneeFilter(null);
      break;
    case 'dateRangeStart':
      setDateRangeStart(null);
      break;
    case 'dateRangeEnd':
      setDateRangeEnd(null);
      break;
  }
};
</script>

<template>
  <div :id="generateUniqueId('container')" class="task-filters lab-app-panel mb-4">
    <div class="flex flex-wrap items-center gap-4">
      <!-- Search Input -->
      <div class="flex-1 min-w-[200px]">
        <div class="relative">
          <i
            :id="generateUniqueId('search-icon')"
            class="pi pi-search absolute left-3 top-1/2 transform -translate-y-1/2 text-lab-general-text-muted"
          ></i>
          <input
            v-model="searchQuery"
            type="text"
            :id="generateUniqueId('search-input')"
            placeholder="Search tasks..."
            class="lab-app-native-field pl-10!"
          />
        </div>
      </div>

      <!-- Status Filter -->
      <div class="flex items-center gap-2">
        <label :id="generateUniqueId('status-label')" class="text-sm text-lab-general-text-muted shrink-0"
          >Status:</label
        >
        <select
          v-model="statusFilter"
          :id="generateUniqueId('status-select')"
          class="lab-app-native-field w-auto min-w-[9rem]"
        >
          <option value="all">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <!-- Priority Filter -->
      <div class="flex items-center gap-2">
        <label :id="generateUniqueId('priority-label')" class="text-sm text-lab-general-text-muted shrink-0"
          >Priority:</label
        >
        <select
          v-model="priorityFilter"
          :id="generateUniqueId('priority-select')"
          class="lab-app-native-field w-auto min-w-[9rem]"
        >
          <option value="all">All Priorities</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="urgent">Urgent</option>
        </select>
      </div>

      <!-- Date Range Start -->
      <div class="flex items-center gap-2">
        <label :id="generateUniqueId('date-start-label')" class="text-sm text-lab-general-text-muted shrink-0"
          >From:</label
        >
        <input
          v-model="dateRangeStart"
          type="date"
          :id="generateUniqueId('date-start-input')"
          class="lab-app-native-field w-auto"
        />
      </div>

      <!-- Date Range End -->
      <div class="flex items-center gap-2">
        <label :id="generateUniqueId('date-end-label')" class="text-sm text-lab-general-text-muted shrink-0">To:</label>
        <input
          v-model="dateRangeEnd"
          type="date"
          :id="generateUniqueId('date-end-input')"
          class="lab-app-native-field w-auto"
        />
      </div>

      <!-- Clear Filters Button -->
      <div class="flex items-center gap-2">
        <Button
          v-if="hasActiveFilters"
          :id="generateUniqueId('clear-btn')"
          label="Clear"
          icon="pi pi-filter-slash"
          severity="secondary"
          outlined
          size="small"
          @click="handleReset"
        />
      </div>
    </div>

    <!-- Active Filters Display -->
    <div
      v-if="hasActiveFilters"
      :id="generateUniqueId('active-filters')"
      class="mt-3 pt-3 border-t border-lab-general-border"
    >
      <div class="flex flex-wrap gap-2 items-center">
        <span :id="generateUniqueId('active-filters-label')" class="text-sm text-lab-general-text-muted"
          >Active filters:</span
        >

        <Button
          v-if="statusFilter !== 'all'"
          :id="generateUniqueId('clear-status-btn')"
          @click="handleClearFilter('status')"
          class="cursor-pointer"
          text
          size="small"
        >
          <Badge :value="statusFilter" severity="info" />
        </Button>

        <Button
          v-if="priorityFilter !== 'all'"
          :id="generateUniqueId('clear-priority-btn')"
          @click="handleClearFilter('priority')"
          class="cursor-pointer"
          text
          size="small"
        >
          <Badge :value="priorityFilter" severity="warning" />
        </Button>

        <Button
          v-if="searchQuery"
          :id="generateUniqueId('clear-search-btn')"
          @click="handleClearFilter('search')"
          class="cursor-pointer"
          text
          size="small"
        >
          <Badge :value="searchQuery" severity="secondary" />
        </Button>

        <Button
          v-if="dateRangeStart || dateRangeEnd"
          :id="generateUniqueId('clear-date-btn')"
          @click="dateRangeStart ? handleClearFilter('dateRangeStart') : handleClearFilter('dateRangeEnd')"
          class="cursor-pointer"
          text
          size="small"
        >
          <Badge :value="`${dateRangeStart || 'start'} - ${dateRangeEnd || 'end'}`" severity="success" />
        </Button>
      </div>
    </div>
  </div>
</template>
