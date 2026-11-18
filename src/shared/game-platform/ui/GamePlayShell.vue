<script setup lang="ts">
import Button from 'primevue/button';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import GameIcon from './GameIcon.vue';

defineProps<{
  title: string;
  faIcon: string;
  subtitle?: string;
}>();

const emit = defineEmits<{
  lobby: [];
}>();

const { generateUniqueId } = useUniqueElementId();
</script>

<template>
  <div class="tw-game-session flex flex-col gap-3 min-h-0 flex-1">
    <header
      :id="generateUniqueId('tw-play-header')"
      class="tw-game-session__header flex flex-wrap items-center justify-between gap-3 border-b border-[color-mix(in_srgb,var(--lab-general-border)_55%,transparent)] pb-3"
    >
      <div class="flex items-center gap-3 min-w-0">
        <GameIcon :icon="faIcon" size="md" />
        <div class="min-w-0">
          <h2
            :id="generateUniqueId('tw-play-title')"
            class="text-lg font-semibold m-0 text-lab-general-text truncate"
          >
            {{ title }}
          </h2>
          <p
            v-if="subtitle"
            class="tw-game-session__subtitle m-0 mt-0.5 text-sm text-lab-general-text-muted"
          >
            {{ subtitle }}
          </p>
        </div>
      </div>
      <Button
        class="tw-game-session__lobby-btn me-3 shrink-0"
        label="Back to lobby"
        icon="pi pi-arrow-left"
        size="small"
        severity="secondary"
        :pt="{ root: { attrs: { id: generateUniqueId('tw-back-lobby') } } }"
        @click="emit('lobby')"
      />
    </header>
    <div class="tw-game-session__body flex-1 min-h-0 overflow-auto flex flex-col items-stretch">
      <slot />
    </div>
  </div>
</template>
