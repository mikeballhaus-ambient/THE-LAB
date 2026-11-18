<script setup lang="ts">
import { computed } from 'vue';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import {
  TIMESHEET_APPROVAL_STATUS_LABELS,
  type TimesheetApprovalStatus,
} from '../../shared/utils/timesheet-approval-status';

const props = defineProps<{
  status: TimesheetApprovalStatus;
}>();

const { generateUniqueId } = useUniqueElementId();

const label = computed(() => TIMESHEET_APPROVAL_STATUS_LABELS[props.status]);

const badgeClass = computed(() => {
  switch (props.status) {
    case 'pending':
      return 'border-[color-mix(in_srgb,var(--lab-general-border)_70%,transparent)] bg-[color-mix(in_srgb,var(--lab-general-bg)_50%,var(--lab-general-bg-subtle))] text-lab-general-text-muted';
    case 'approved':
      return 'border-[color-mix(in_srgb,var(--lab-success-text,var(--lab-general-border))_35%,var(--lab-general-border))] bg-[color-mix(in_srgb,var(--lab-success-text,var(--lab-general-text))_12%,var(--lab-general-bg))] text-lab-general-text';
    case 'rejected':
      return 'border-[color-mix(in_srgb,var(--lab-danger-text,var(--lab-general-border))_35%,var(--lab-general-border))] bg-[color-mix(in_srgb,var(--lab-danger-text,var(--lab-general-text))_10%,var(--lab-general-bg))] text-lab-general-text';
    default:
      return '';
  }
});
</script>

<template>
  <span
    class="timesheet-approval-status-badge inline-flex max-w-full items-center rounded-md border px-2 py-0.5 text-xs font-medium"
    :class="badgeClass"
    :id="generateUniqueId(`timesheet-approval-status-${status}`)"
  >
    {{ label }}
  </span>
</template>
