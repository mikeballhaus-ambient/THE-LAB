<script setup lang="ts">
import { computed, useTemplateRef, watch } from 'vue';
import { makeDraggable, useDnDProvider } from '@vue-dnd-kit/core';
import type { Card, Suit } from './useKlondike';
import type { KlondikeDragSource } from './klondike-dnd';

const SUIT_SYMBOL: Record<Suit, string> = {
  spades: '♠',
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
};

function rankDisplay(rank: Card['rank']): string {
  if (rank === 1) return 'A';
  if (rank === 11) return 'J';
  if (rank === 12) return 'Q';
  if (rank === 13) return 'K';
  return String(rank);
}

const props = defineProps<{
  card: Card;
  dragSource?: KlondikeDragSource | null;
  draggable?: boolean;
  stackZIndex?: number;
  liftedHidden?: boolean;
  quarksHintFrom?: boolean;
}>();

const emit = defineEmits<{
  dblclick: [];
  dragStart: [source: KlondikeDragSource];
  dragEnd: [];
}>();

const cardRef = useTemplateRef<HTMLElement>('cardRef');
const provider = useDnDProvider();

const dragDisabled = computed(() => props.draggable === false || !props.dragSource);

const { isDragging } = makeDraggable(cardRef, {
  disabled: dragDisabled.value,
  data: () => props.dragSource,
  events: {
    onSelfDragStart() {
      if (props.dragSource) {
        emit('dragStart', props.dragSource);
      }
    },
    onSelfDragEnd() {
      emit('dragEnd');
    },
    onSelfDragCancel() {
      emit('dragEnd');
    },
  },
});

watch(dragDisabled, (disabled) => {
  const el = cardRef.value;
  if (!el) {
    return;
  }
  const entry = provider.entities.draggableMap.get(el);
  if (entry) {
    entry.disabled = disabled;
  }
});

const rank = computed(() => rankDisplay(props.card.rank));
const suitSymbol = computed(() => SUIT_SYMBOL[props.card.suit]);
const isRed = computed(
  () => props.card.suit === 'hearts' || props.card.suit === 'diamonds',
);
</script>

<template>
  <div
    ref="cardRef"
    class="tw-klondike-card lab-game-cell select-none"
    :class="{
      'tw-klondike-card--face-up': card.faceUp,
      'tw-klondike-card--face-down': !card.faceUp,
      'tw-klondike-card--dragging': isDragging,
      'tw-klondike-card--lifted-hidden': liftedHidden,
      'tw-klondike-card--red': card.faceUp && isRed,
      'tw-klondike-card--black': card.faceUp && !isRed,
      'tw-klondike-card--grab': draggable !== false && dragSource,
      'lab-game-cell--quarks-hint lab-game-cell--quarks-hint-from': quarksHintFrom === true,
    }"
    :style="stackZIndex !== undefined ? { zIndex: stackZIndex } : undefined"
    @dblclick="emit('dblclick')"
  >
    <template v-if="card.faceUp">
      <span class="tw-klondike-card__corner tw-klondike-card__corner--tl" aria-hidden="true">
        <span class="tw-klondike-card__rank">{{ rank }}</span>
        <span class="tw-klondike-card__suit-sm">{{ suitSymbol }}</span>
      </span>
      <span class="tw-klondike-card__pip" aria-hidden="true">{{ suitSymbol }}</span>
      <span class="tw-klondike-card__corner tw-klondike-card__corner--br" aria-hidden="true">
        <span class="tw-klondike-card__rank">{{ rank }}</span>
        <span class="tw-klondike-card__suit-sm">{{ suitSymbol }}</span>
      </span>
      <span class="sr-only">{{ rank }} of {{ card.suit }}</span>
    </template>
    <span v-else class="tw-klondike-card__back" aria-hidden="true" />
  </div>
</template>

<style scoped>
.tw-klondike-card {
  width: 4.5rem;
  height: 6.25rem;
  touch-action: none;
  position: relative;
  border-radius: 0.45rem;
  border: 1px solid color-mix(in srgb, var(--lab-general-border) 90%, var(--lab-prime-surface-950));
  box-sizing: border-box;
}

.tw-klondike-card--grab {
  cursor: grab;
}

.tw-klondike-card--grab:active {
  cursor: grabbing;
}

.tw-klondike-card--face-up {
  background: linear-gradient(165deg, #fafafa 0%, #eef2f7 100%);
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 0.35),
    0 2px 6px rgb(0 0 0 / 0.22),
    0 0 0 1px rgb(15 23 42 / 0.12);
}

.tw-klondike-card--red,
.tw-klondike-card--red .tw-klondike-card__rank,
.tw-klondike-card--red .tw-klondike-card__suit-sm,
.tw-klondike-card--red .tw-klondike-card__pip {
  color: #c62828;
}

.tw-klondike-card--black,
.tw-klondike-card--black .tw-klondike-card__rank,
.tw-klondike-card--black .tw-klondike-card__suit-sm,
.tw-klondike-card--black .tw-klondike-card__pip {
  color: #0f172a;
}

.tw-klondike-card__corner {
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  line-height: 1;
  pointer-events: none;
  font-weight: 700;
}

.tw-klondike-card__corner--tl {
  top: 0.28rem;
  left: 0.32rem;
}

.tw-klondike-card__corner--br {
  bottom: 0.28rem;
  right: 0.32rem;
  transform: rotate(180deg);
}

.tw-klondike-card__rank {
  font-size: 0.72rem;
  letter-spacing: -0.03em;
}

.tw-klondike-card__suit-sm {
  font-size: 0.62rem;
  margin-top: 0.05rem;
}

.tw-klondike-card__pip {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  line-height: 1;
  opacity: 0.92;
  pointer-events: none;
}

.tw-klondike-card--face-down {
  background: linear-gradient(
    145deg,
    color-mix(in srgb, var(--lab-button-bg) 70%, var(--lab-prime-surface-800)),
    color-mix(in srgb, var(--lab-prime-surface-900) 55%, var(--lab-general-bg))
  );
  box-shadow:
    inset 0 0 0 1px color-mix(in srgb, var(--lab-accent-primary) 25%, var(--lab-card-border)),
    0 2px 6px rgb(0 0 0 / 0.25);
}

.tw-klondike-card__back {
  position: absolute;
  inset: 0.35rem;
  border-radius: 0.3rem;
  border: 1px solid color-mix(in srgb, var(--lab-accent-primary) 35%, var(--lab-card-border));
  background:
    radial-gradient(
      circle at 30% 25%,
      color-mix(in srgb, var(--lab-accent-primary) 22%, transparent),
      transparent 55%
    ),
    repeating-linear-gradient(
      45deg,
      color-mix(in srgb, var(--lab-prime-surface-700) 40%, transparent) 0 3px,
      color-mix(in srgb, var(--lab-prime-surface-900) 30%, transparent) 3px 6px
    );
}

.tw-klondike-card--dragging,
.tw-klondike-card--lifted-hidden {
  opacity: 0;
  pointer-events: none;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>
