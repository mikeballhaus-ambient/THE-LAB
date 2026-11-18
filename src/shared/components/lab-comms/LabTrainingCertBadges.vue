<script setup lang="ts">
import type { TrainingCertBadge } from '@/apps/training-quizzes/shared/types';

withDefaults(
  defineProps<{
    badges?: TrainingCertBadge[] | null;
    /** When true, show a compact row suitable for message meta lines. */
    compact?: boolean;
  }>(),
  {
    badges: () => [],
    compact: false,
  },
);
</script>

<template>
  <span
    v-if="badges && badges.length > 0"
    class="lab-training-cert-badges inline-flex flex-wrap items-center gap-0.5"
    :class="compact ? 'lab-training-cert-badges--compact' : ''"
    role="list"
    aria-label="Training certifications"
  >
    <span
      v-for="badge in badges"
      :key="badge.category"
      role="listitem"
      class="lab-training-cert-badges__item inline-flex items-center justify-center rounded-full border border-[color-mix(in_srgb,var(--lab-general-border)_65%,transparent)] bg-[color-mix(in_srgb,var(--lab-general-border)_32%,transparent)] text-lab-general-text-muted [&_i]:opacity-90"
      :class="compact ? 'size-[1.15rem] text-[0.6rem]' : 'size-[1.35rem] text-[0.65rem]'"
      :title="badge.title"
    >
      <i :class="badge.icon" aria-hidden="true" />
    </span>
  </span>
</template>
