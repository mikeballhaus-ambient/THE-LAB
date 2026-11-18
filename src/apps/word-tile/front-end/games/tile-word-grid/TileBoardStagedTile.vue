<script setup lang="ts">
import { computed, useTemplateRef, watch } from 'vue';
import { makeDraggable, useDnDProvider } from '@vue-dnd-kit/core';
import { centerTileDragPreview, TW_TILE_DND_GROUP } from './tile-grid-dnd';

const props = defineProps<{
  letter: string;
  row: number;
  col: number;
  interactable: boolean;
}>();

const emit = defineEmits<{
  recall: [];
}>();

const tileRef = useTemplateRef<HTMLElement>('tileRef');
const provider = useDnDProvider();

const dragDisabled = computed(() => !props.interactable);

const { isDragging } = makeDraggable(tileRef, {
  disabled: dragDisabled.value,
  groups: [TW_TILE_DND_GROUP],
  events: {
    onSelfDragStart() {
      centerTileDragPreview(provider);
    },
  },
  data: () => ({
    kind: 'staged' as const,
    letter: props.letter,
    row: props.row,
    col: props.col,
  }),
});

watch(dragDisabled, (disabled) => {
  const el = tileRef.value;
  if (!el) {
    return;
  }
  const entry = provider.entities.draggableMap.get(el);
  if (entry) {
    entry.disabled = disabled;
  }
});
</script>

<template>
  <span
    ref="tileRef"
    class="tw-board-cell__tile tw-board-cell__tile--staged touch-none"
    :class="{
      'tw-board-cell__tile--dragging': isDragging,
      'tw-board-cell__tile--dragging-source': isDragging,
      'cursor-grab': interactable,
    }"
    title="Drag to another square, or double-click to return to rack"
    @dblclick.stop="emit('recall')"
  >{{ letter }}</span>
</template>

<style scoped>
.tw-board-cell__tile {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 92%;
  height: 92%;
  border-radius: 3px;
  border: 1px solid var(--tw-tile-face-border, color-mix(in srgb, var(--lab-general-border) 70%, transparent));
  font-weight: 800;
  line-height: 1;
  background: var(
    --tw-tile-face,
    color-mix(in srgb, var(--lab-prime-surface-100) 75%, var(--lab-prime-surface-300))
  );
  color: var(--tw-tile-ink, var(--lab-prime-content-primary, var(--lab-general-text)));
  -webkit-text-fill-color: var(--tw-tile-ink, var(--lab-prime-content-primary, var(--lab-general-text)));
  box-shadow: inset 0 -2px 0 color-mix(in srgb, var(--lab-general-border) 25%, transparent);
}

.tw-board-cell__tile--staged {
  outline: 2px solid color-mix(in srgb, var(--lab-accent-primary) 65%, var(--lab-general-border));
  outline-offset: -1px;
}

.tw-board-cell__tile--dragging {
  opacity: 0.45;
}

.tw-board-cell__tile--dragging-source {
  pointer-events: none;
}
</style>