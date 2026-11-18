<script setup lang="ts">
import { computed, useTemplateRef, watch } from 'vue';
import { makeDraggable, useDnDProvider } from '@vue-dnd-kit/core';
import type { ChessBoardPiece, ChessPieceType } from './types';

const PIECE_GLYPH: Record<ChessPieceType, string> = {
  king: '♚',
  queen: '♛',
  rook: '♜',
  bishop: '♝',
  knight: '♞',
  pawn: '♟',
};

const props = defineProps<{
  piece: ChessBoardPiece;
  canDrag: boolean;
  pieceSide: 'mine' | 'opp';
}>();

const el = useTemplateRef<HTMLElement>('el');
const provider = useDnDProvider();
const dragDisabled = computed(() => !props.canDrag);

const { isDragging } = makeDraggable(el, {
  disabled: dragDisabled.value,
  data: () => props.piece,
});

watch(dragDisabled, (disabled) => {
  const node = el.value;
  if (!node) {
    return;
  }
  const entry = provider.entities.draggableMap.get(node);
  if (entry) {
    entry.disabled = disabled;
  }
});

const pieceClass = computed(() => {
  const base =
    'relative z-[1] cursor-grab select-none touch-none leading-none active:cursor-grabbing [font-family:"Segoe_UI_Symbol","Noto_Sans_Symbols2",Symbola,sans-serif] [font-variant-emoji:text]';
  const tone =
    props.pieceSide === 'mine'
      ? 'text-[var(--lab-accent-primary,var(--lab-button-border-hover))] [text-shadow:0_1px_2px_color-mix(in_srgb,var(--lab-general-text)_25%,transparent)]'
      : 'text-lab-chat-log-error [text-shadow:0_1px_2px_color-mix(in_srgb,var(--lab-general-bg)_40%,transparent)]';
  return `${base} ${tone}`;
});
</script>

<template>
  <div
    ref="el"
    :class="[pieceClass, { 'pointer-events-none opacity-0': isDragging }]"
    :style="{ fontSize: 'calc(var(--lab-game-cell-size) * 0.62)' }"
    aria-hidden="true"
  >
    {{ PIECE_GLYPH[props.piece.type] }}
  </div>
</template>
