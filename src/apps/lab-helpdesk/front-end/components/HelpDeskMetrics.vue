<script setup lang="ts">
import { computed } from 'vue';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import type { ConnectorTicket } from '../composables/useHelpDeskApi';
import {
  countHighPriority,
  countOpenQueue,
  countTicketsByStatus,
} from '../../shared/utils/dashboard-aggregates';

const props = defineProps<{
  tickets: ConnectorTicket[];
  loading: boolean;
}>();

const { generateUniqueId } = useUniqueElementId();

const total = computed(() => props.tickets.length);
const openQueue = computed(() => countOpenQueue(props.tickets));
const resolved = computed(() => countTicketsByStatus(props.tickets, 'resolved'));
const closed = computed(() => countTicketsByStatus(props.tickets, 'closed'));
const urgentHigh = computed(() => countHighPriority(props.tickets));
</script>

<template>
  <section class="help-desk-metrics flex flex-col gap-4" :id="generateUniqueId('hd-metrics')">
    <div>
      <h2 class="text-xl font-semibold m-0 text-lab-general-text" :id="generateUniqueId('hd-metrics-title')">
        Reports
      </h2>
      <p class="text-sm text-lab-general-text-muted m-0 mt-1">Ticket volume, queue health, and priority mix.</p>
    </div>

    <p v-if="loading" class="text-sm text-lab-general-text-muted m-0">Loading reports…</p>

    <template v-else>
      <div class="grid grid-cols-[repeat(auto-fit,minmax(8.75rem,1fr))] gap-3 min-w-0">
        <div class="lab-app-panel" :id="generateUniqueId('hd-stat-total')">
          <p class="lab-app-kpi-label m-0">Total tickets</p>
          <p class="text-2xl font-semibold m-0 mt-1 tabular-nums text-lab-general-text">{{ total }}</p>
        </div>
        <div
          class="lab-app-panel border border-[color-mix(in_srgb,rgb(245_158_11)_35%,var(--lab-general-border))]"
        >
          <p class="lab-app-kpi-label m-0">In queue</p>
          <p class="text-2xl font-semibold m-0 mt-1 tabular-nums text-amber-600 dark:text-amber-300">{{ openQueue }}</p>
        </div>
        <div class="lab-app-panel">
          <p class="lab-app-kpi-label m-0">Resolved</p>
          <p class="text-2xl font-semibold m-0 mt-1 tabular-nums text-emerald-600 dark:text-emerald-400">{{ resolved }}</p>
        </div>
        <div class="lab-app-panel">
          <p class="lab-app-kpi-label m-0">Closed</p>
          <p class="text-2xl font-semibold m-0 mt-1 tabular-nums text-lab-general-text">{{ closed }}</p>
        </div>
        <div
          class="lab-app-panel border border-[color-mix(in_srgb,rgb(244_63_94)_35%,var(--lab-general-border))]"
        >
          <p class="lab-app-kpi-label m-0">High / urgent</p>
          <p class="text-2xl font-semibold m-0 mt-1 tabular-nums text-rose-600 dark:text-rose-300">{{ urgentHigh }}</p>
        </div>
      </div>

      <div class="help-desk-reports-charts min-w-0 w-full">
        <slot name="charts" />
      </div>
    </template>
  </section>
</template>
