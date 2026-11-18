<script setup lang="ts">
import { computed, useTemplateRef, watch } from 'vue';
import { makeDraggable, useDnDProvider } from '@vue-dnd-kit/core';
import CheckersPieceDisc from '../../assets/checkers-piece-disc.svg';
import type { BoardPiece } from './types';

const props = defineProps<{
  piece: BoardPiece;
  canDrag: boolean;
  pieceSide: 'mine' | 'opp';
  chainActive?: boolean;
  label: string;
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

const wrapperClass = computed(() => {
  const base =
    props.pieceSide === 'mine'
      ? 'checkers-piece checkers-piece--mine'
      : 'checkers-piece checkers-piece--opp';
  return props.chainActive ? `${base} checkers-piece--chain` : base;
});
</script>

<template>
  <div
    ref="el"
    :class="[wrapperClass, { 'checkers-piece--ghost': isDragging }]"
  >
    <CheckersPieceDisc class="checkers-piece__svg" aria-hidden="true" />
    <span v-if="props.label" class="checkers-piece__king">{{ props.label }}</span>
  </div>
</template>

<style scoped>
.checkers-piece {
  position: relative;
  z-index: 1;
  cursor: grab;
  touch-action: none;
  width: calc(var(--lab-game-cell-size) * 0.84);
  height: calc(var(--lab-game-cell-size) * 0.84);
  display: flex;
  align-items: center;
  justify-content: center;
  user-select: none;
}

.checkers-piece:active {
  cursor: grabbing;
}

.checkers-piece__svg {
  width: 100%;
  height: 100%;
  display: block;
  overflow: visible;
}

.checkers-piece__king {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: calc(var(--lab-game-cell-size) * 0.22);
  font-weight: 700;
  color: var(--lab-button-text);
  line-height: 1;
  pointer-events: none;
  text-shadow: 0 1px 2px color-mix(in srgb, var(--lab-general-text) 35%, transparent);
}

.checkers-piece--mine {
  --checkers-fill: var(--lab-accent-primary, var(--lab-button-border-hover));
  --checkers-rim: color-mix(in srgb, var(--checkers-fill) 38%, var(--lab-general-bg));
}

.checkers-piece--opp {
  --checkers-fill: var(--lab-chat-log-error);
  --checkers-rim: color-mix(in srgb, var(--checkers-fill) 42%, var(--lab-general-bg));
}

:global(.app-light) .checkers-piece--mine {
  --checkers-rim: color-mix(in srgb, var(--checkers-fill) 55%, var(--lab-general-text));
}

:global(.app-light) .checkers-piece--opp {
  --checkers-rim: color-mix(in srgb, var(--checkers-fill) 58%, var(--lab-general-text));
}

.checkers-piece--ghost {
  opacity: 0;
  pointer-events: none;
}

.checkers-piece--chain {
  outline: 2px solid color-mix(in srgb, var(--lab-accent-primary) 70%, transparent);
  outline-offset: 2px;
  border-radius: 9999px;
}
</style>
