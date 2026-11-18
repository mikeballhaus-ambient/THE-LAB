<script setup lang="ts">
import { computed } from 'vue';
import { DragPreview, useDnDProvider } from '@vue-dnd-kit/core';
import { isTileDragPayload } from './tile-grid-dnd';

const provider = useDnDProvider();

const letter = computed(() => {
  for (const item of provider.entities.draggingMap.values()) {
    const data = item.data;
    if (isTileDragPayload(data)) {
      return data.letter;
    }
  }
  return '';
});
</script>

<template>
  <DragPreview>
    <div v-if="letter" class="tw-drag-preview-tile tw-board-cell__tile" aria-hidden="true">
      {{ letter }}
    </div>
  </DragPreview>
</template>

<style scoped>
.tw-drag-preview-tile {
  width: clamp(1.75rem, 5.5vmin, 2.75rem);
  height: clamp(1.75rem, 5.5vmin, 2.75rem);
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 3px;
  background: color-mix(
    in srgb,
    var(--lab-prime-surface-100) 75%,
    var(--lab-prime-surface-300)
  );
  color: var(--tw-tile-ink, var(--lab-prime-content-primary, var(--lab-general-text)));
  border: 1px solid color-mix(in srgb, var(--lab-general-border) 70%, transparent);
  box-shadow:
    0 6px 16px color-mix(in srgb, var(--lab-general-border) 45%, transparent),
    inset 0 -2px 0 color-mix(in srgb, var(--lab-general-border) 25%, transparent);
}
</style>
