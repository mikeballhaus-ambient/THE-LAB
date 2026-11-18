<script setup lang="ts">
import { useTemplateRef } from 'vue';
import { makeDroppable, type IDragEvent } from '@vue-dnd-kit/core';
import type { ChessBoardPiece } from './types';

const props = defineProps<{
  row: number;
  col: number;
  disabled?: boolean;
  acceptDrop?: boolean;
  occupant?: ChessBoardPiece | null;
}>();

const emit = defineEmits<{
  dropped: [piece: ChessBoardPiece, row: number, col: number];
}>();

const el = useTemplateRef<HTMLElement>('el');

function pieceFromDrag(event: IDragEvent): ChessBoardPiece | undefined {
  const removed = event.helpers.suggestRemove()?.removedItems?.[0];
  if (removed) {
    return removed as ChessBoardPiece;
  }
  const entry = event.draggedItems[0];
  if (!entry) {
    return undefined;
  }
  const raw = entry.data;
  return (typeof raw === 'function' ? raw() : raw) as ChessBoardPiece;
}

makeDroppable(
  el,
  {
    events: {
      onDrop(event) {
        if (props.disabled || !props.acceptDrop) {
          return;
        }
        const piece = pieceFromDrag(event);
        if (piece) {
          emit('dropped', piece, props.row, props.col);
        }
      },
    },
  },
  () => (props.occupant ? [props.occupant] : []),
);
</script>

<template>
  <div
    ref="el"
    class="relative flex h-full w-full min-h-[var(--lab-game-cell-size)] min-w-[var(--lab-game-cell-size)] items-center justify-center"
  >
    <slot />
  </div>
</template>
