<script setup lang="ts">
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import type { HumanHeadToHeadStats } from '../types';

defineProps<{
  opponentDisplayName: string;
  stats: HumanHeadToHeadStats | null;
  loading: boolean;
}>();

const { generateUniqueId } = useUniqueElementId();
</script>

<template>
  <div
    class="tw-human-series-bar flex w-full max-w-[var(--tw-board-size,36rem)] flex-wrap items-baseline justify-center gap-x-[0.65rem] gap-y-[0.35rem] rounded-md border border-[color-mix(in_srgb,var(--lab-general-border)_50%,transparent)] bg-[color-mix(in_srgb,var(--lab-general-bg-muted)_30%,var(--lab-general-bg))] px-3 py-[0.4rem] text-[0.8rem]"
    :id="generateUniqueId('tw-human-series-bar')"
    role="status"
  >
    <span class="tw-human-series-bar__label text-[0.72rem] font-semibold uppercase tracking-wide text-lab-general-text-muted">Series vs {{ opponentDisplayName }}</span>
    <span v-if="loading" class="tw-human-series-bar__value text-lab-general-text-muted">…</span>
    <span
      v-else-if="stats && stats.totalGames > 0"
      class="tw-human-series-bar__value tabular-nums text-lab-general-text"
      :id="generateUniqueId('tw-human-series-record')"
    >
      <span class="font-medium">{{ stats.wins }}</span>
      <span class="text-lab-general-text-muted">–</span>
      <span class="font-medium">{{ stats.losses }}</span>
      <span v-if="stats.draws > 0" class="text-lab-general-text-muted">
        ({{ stats.draws }} draw{{ stats.draws === 1 ? '' : 's' }})
      </span>
      <span class="tw-human-series-bar__games text-[0.75rem] text-lab-general-text-muted">
        · {{ stats.totalGames }} game{{ stats.totalGames === 1 ? '' : 's' }}
      </span>
    </span>
    <span v-else class="tw-human-series-bar__value text-lab-general-text-muted">First match together</span>
  </div>
</template>
