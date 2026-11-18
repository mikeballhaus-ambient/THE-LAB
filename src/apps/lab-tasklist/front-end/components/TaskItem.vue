<script setup lang="ts">
import { Task, TaskStatus, TaskPriority } from '../../shared/types';
import Button from 'primevue/button';
import Badge from 'primevue/badge';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import { labRecordActionButtonPt } from '@/shared/constants/lab-record-automation';
import { formatCalendarDateDisplay, parseDueDateValue } from '@/shared/utils/calendar-date';

interface Props {
  task: Task;
  onEdit?: (task: Task) => void;
  onDelete?: (task: Task) => void;
}

const props = withDefaults(defineProps<Props>(), {
  onEdit: () => {},
  onDelete: () => {},
});

const { generateUniqueId } = useUniqueElementId();

const formatDate = (date?: Date | string) => {
  if (!date) return 'No due date';
  const label = formatCalendarDateDisplay(date);
  return label || 'Invalid date';
};

const formatTimeAgo = (date?: Date | string) => {
  if (!date) return '';
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(dateObj.getTime())) return '';
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  return `${Math.floor(diffInSeconds / 86400)}d ago`;
};

const getStatusBadgeClass = (status: TaskStatus): 'secondary' | 'warn' | 'success' | 'danger' => {
  switch (status) {
    case 'pending':
      return 'secondary';
    case 'in_progress':
      return 'warn';
    case 'completed':
      return 'success';
    case 'cancelled':
      return 'danger';
    default:
      return 'secondary';
  }
};

const getPrioritySeverity = (priority: TaskPriority): 'secondary' | 'info' | 'warn' | 'danger' => {
  switch (priority) {
    case 'low':
      return 'secondary';
    case 'medium':
      return 'info';
    case 'high':
      return 'warn';
    case 'urgent':
      return 'danger';
    default:
      return 'info';
  }
};

const isOverdue = () => {
  if (!props.task.dueDate) return false;
  const due = parseDueDateValue(props.task.dueDate);
  if (!due) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  return dueDay < today;
};
</script>

<template>
  <section
    :id="generateUniqueId('container')"
    class="task-item lab-form-section mb-3 last:mb-0"
    :aria-labelledby="generateUniqueId('task-title')"
  >
    <div class="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_auto] gap-3 items-start">
      <div class="min-w-0">
        <h4
          :id="generateUniqueId('task-title')"
          class="m-0 text-base font-semibold leading-snug text-lab-general-text"
        >
          {{ task.title }}
          <span
            v-if="isOverdue()"
            :id="generateUniqueId('overdue-badge')"
            class="ml-2 text-sm font-medium text-[var(--lab-danger-text)]"
          >
            <i :id="generateUniqueId('overdue-icon')" class="pi pi-exclamation-triangle mr-1" aria-hidden="true" />
            Overdue
          </span>
        </h4>

        <p
          v-if="task.description"
          :id="generateUniqueId('task-description')"
          class="lab-form-section__lead text-sm mt-2 mb-0 line-clamp-2"
        >
          {{ task.description }}
        </p>

        <div :id="generateUniqueId('meta-info')" class="flex flex-wrap items-center gap-2 mt-3 text-xs">
          <Badge
            :id="generateUniqueId('status-badge')"
            :value="task.status"
            class="min-w-[4.5rem] justify-center"
            :severity="getStatusBadgeClass(task.status)"
          />
          <Badge
            :id="generateUniqueId('priority-badge')"
            :value="task.priority"
            class="min-w-[4.5rem] justify-center"
            :severity="getPrioritySeverity(task.priority)"
          />
          <div
            v-if="task.dueDate"
            :id="generateUniqueId('due-date-container')"
            class="flex items-center text-lab-general-text-muted"
          >
            <i :id="generateUniqueId('calendar-icon')" class="pi pi-calendar mr-1" aria-hidden="true" />
            <span>{{ formatDate(task.dueDate) }}</span>
          </div>
        </div>
      </div>

      <div :id="generateUniqueId('actions-container')" class="flex flex-wrap gap-2 md:justify-end shrink-0">
        <Button
          label="Edit"
          icon="pi pi-pencil"
          severity="secondary"
          outlined
          size="small"
          :pt="labRecordActionButtonPt(generateUniqueId, 'task', 'edit', task.id, task.title)"
          @click="onEdit(task)"
        />
        <Button
          label="Delete"
          icon="pi pi-trash"
          severity="danger"
          outlined
          size="small"
          :pt="labRecordActionButtonPt(generateUniqueId, 'task', 'delete', task.id, task.title)"
          @click="onDelete(task)"
        />
      </div>
    </div>

    <div
      v-if="task.completedAt"
      :id="generateUniqueId('completion-time')"
      class="mt-3 pt-3 border-t border-lab-general-border"
    >
      <div class="flex items-center text-xs text-lab-general-text-muted">
        <i :id="generateUniqueId('check-icon')" class="pi pi-check-circle mr-1 text-emerald-500" aria-hidden="true" />
        <span>Completed {{ formatTimeAgo(task.completedAt) }}</span>
      </div>
    </div>
  </section>
</template>

<style scoped>
.task-item.lab-form-section {
  margin-bottom: 0.75rem;
  border: 1px solid color-mix(in srgb, var(--lab-card-border) 88%, var(--lab-general-border));
  border-left-width: 3px;
  border-left-color: color-mix(in srgb, var(--lab-section-accent, var(--lab-button-border-hover)) 90%, transparent);
  background: color-mix(
    in srgb,
    var(--lab-surface-card, var(--lab-general-bg)) 82%,
    var(--lab-general-border)
  );
  box-shadow: 0 1px 2px color-mix(in srgb, var(--lab-general-border) 35%, transparent);
}

</style>
