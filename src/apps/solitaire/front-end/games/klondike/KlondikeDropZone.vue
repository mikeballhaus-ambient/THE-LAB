<script setup lang="ts">
import { computed, useTemplateRef } from 'vue';
import { makeDroppable } from '@vue-dnd-kit/core';
import type { KlondikeDropTarget } from './klondike-dnd';
import { isKlondikeDragSource } from './klondike-dnd';

const props = defineProps<{
  target: KlondikeDropTarget;
  /** Shown when the zone has no card (e.g. foundation suit hint). */
  placeholder?: string;
  empty?: boolean;
  quarksHintTo?: boolean;
}>();

const emit = defineEmits<{
  drop: [target: KlondikeDropTarget, source: import('./klondike-dnd').KlondikeDragSource];
}>();

const zoneRef = useTemplateRef<HTMLElement>('zoneRef');

const { isDragOver } = makeDroppable(zoneRef, {
  events: {
    onDrop(event) {
      const data = event.draggedItems[0]?.data;
      if (!isKlondikeDragSource(data)) {
        return;
      }
      emit('drop', props.target, data);
    },
  },
});

const showPlaceholder = computed(() => props.empty !== false && props.placeholder);
</script>

<template>
  <div
    ref="zoneRef"
    class="tw-klondike-zone"
    :class="{
      'tw-klondike-zone--over': isDragOver,
      'tw-klondike-zone--tableau': target.kind === 'tableau',
      'lab-game-cell--quarks-hint lab-game-cell--quarks-hint-to': props.quarksHintTo === true,
    }"
  >
    <span v-if="showPlaceholder" class="tw-klondike-zone__placeholder" aria-hidden="true">
      {{ placeholder }}
    </span>
    <slot />
  </div>
</template>

<style scoped>
.tw-klondike-zone {
  position: relative;
  min-width: 4.5rem;
  min-height: 6.25rem;
  border-radius: 0.45rem;
  border: 1px solid color-mix(in srgb, var(--lab-general-border) 55%, transparent);
  background: color-mix(in srgb, var(--lab-general-bg) 72%, var(--lab-general-border));
  box-shadow: inset 0 2px 10px rgb(0 0 0 / 0.14);
  transition:
    background-color 0.12s ease,
    border-color 0.12s ease,
    box-shadow 0.12s ease;
}

.tw-klondike-zone--tableau {
  min-height: 6.25rem;
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: stretch;
}

.tw-klondike-zone--over {
  border-color: color-mix(in srgb, var(--lab-accent-primary) 55%, var(--lab-general-border));
  background: color-mix(in srgb, var(--lab-accent-primary) 10%, var(--lab-general-bg));
  box-shadow:
    inset 0 0 0 1px color-mix(in srgb, var(--lab-accent-primary) 35%, transparent),
    inset 0 2px 10px rgb(0 0 0 / 0.12);
}

.tw-klondike-zone__placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.35rem;
  font-weight: 600;
  color: color-mix(in srgb, var(--lab-general-text-muted) 45%, transparent);
  pointer-events: none;
  user-select: none;
}
</style>
