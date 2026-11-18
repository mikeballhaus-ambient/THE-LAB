<script setup lang="ts">
import { watch, watchEffect, useTemplateRef } from 'vue';
import { makeDroppable, useDnDProvider } from '@vue-dnd-kit/core';
import { boardCellAtPreviewCenter, type BoardCellCoord } from './tile-board-drop-hit';
import type { TileDragPayload } from './tile-grid-dnd';
import { isTileDragPayload, TW_TILE_DND_GROUP } from './tile-grid-dnd';

const props = defineProps<{
  boardId: string;
  enabled: boolean;
  canDropAt: (row: number, col: number) => boolean;
}>();

const emit = defineEmits<{
  drop: [cell: BoardCellCoord, drag: TileDragPayload];
}>();

const dropHover = defineModel<BoardCellCoord | null>('dropHover', { default: null });

const boardRef = useTemplateRef<HTMLElement>('boardRef');
const provider = useDnDProvider();

makeDroppable(boardRef, {
  groups: [TW_TILE_DND_GROUP],
  groupMatch: 'some',
  disabled: !props.enabled,
  events: {
    onDrop(event) {
      const drag = event.draggedItems[0]?.data;
      if (!isTileDragPayload(drag)) {
        return;
      }
      const cell = boardCellAtPreviewCenter(boardRef.value, provider);
      if (!cell || !props.canDropAt(cell.row, cell.col)) {
        return;
      }
      emit('drop', cell, drag);
    },
  },
});

watch(
  () => props.enabled,
  (enabled) => {
    const el = boardRef.value;
    if (!el) {
      return;
    }
    const entry = provider.entities.droppableMap.get(el);
    if (entry) {
      entry.disabled = !enabled;
    }
  },
);

watchEffect(() => {
  void provider.state.value;
  void provider.preview.position.value;
  void provider.preview.size.value;
  void provider.scrollPosition.x;
  void provider.scrollPosition.y;

  if (provider.state.value !== 'dragging' || !props.enabled) {
    dropHover.value = null;
    return;
  }
  const cell = boardCellAtPreviewCenter(boardRef.value, provider);
  if (cell && props.canDropAt(cell.row, cell.col)) {
    dropHover.value = cell;
  } else {
    dropHover.value = null;
  }
});
</script>

<template>
  <div
    ref="boardRef"
    class="tw-word-grid-board"
    :id="boardId"
  >
    <slot />
  </div>
</template>
