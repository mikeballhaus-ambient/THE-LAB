<script setup lang="ts">
import { computed } from 'vue';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import type { DashboardChartSegment } from '../../shared/utils/dashboard-aggregates';

const { generateUniqueId } = useUniqueElementId();

const props = withDefaults(
  defineProps<{
    title: string;
    segments: DashboardChartSegment[];
  }>(),
  {},
);

const slug = computed(() => props.title.replace(/\s+/g, '-').toLowerCase());

const maxValue = computed(() => Math.max(1, ...props.segments.map(s => s.value)));
</script>

<template>
  <div class="help-desk-bar-chart lab-app-panel flex flex-col gap-3 h-full">
    <h3
      class="text-sm font-semibold text-lab-general-text m-0"
      :id="generateUniqueId(`hd-bar-chart-title-${slug}`)"
    >
      {{ title }}
    </h3>
    <p v-if="segments.length === 0" class="text-sm text-lab-general-text-muted m-0">No data yet.</p>
    <ul
      v-else
      class="flex flex-col gap-2.5 m-0 p-0 list-none"
      :id="generateUniqueId(`hd-bar-chart-list-${slug}`)"
    >
      <li v-for="seg in segments" :key="seg.key" class="flex flex-col gap-1">
        <div class="flex justify-between text-xs gap-2">
          <span class="text-lab-general-text truncate">{{ seg.label }}</span>
          <span class="text-lab-general-text-muted shrink-0 tabular-nums">{{ seg.value }}</span>
        </div>
        <div class="h-2 rounded-full bg-lab-prime-surface-200/80 overflow-hidden">
          <div
            class="h-full rounded-full bg-lab-button-bg transition-all duration-300"
            :style="{ width: `${Math.max(4, (seg.value / maxValue) * 100)}%` }"
          />
        </div>
      </li>
    </ul>
  </div>
</template>
