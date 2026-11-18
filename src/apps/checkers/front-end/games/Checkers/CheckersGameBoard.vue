<script setup lang="ts">
import { computed, ref, toRef, watch } from 'vue';
import { useDnDProvider } from '@vue-dnd-kit/core';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import '@/shared/game-platform/game-board.css';
import CheckersPieceDisc from '../../assets/checkers-piece-disc.svg';
import {
  legalMovesFor,
  validateMove,
  type CheckersColor,
  type CheckersPiece,
  type CheckersState,
} from '../../../shared/checkers-rules';
import CheckersCellDrop from './CheckersCellDrop.vue';
import CheckersPieceDrag from './CheckersPieceDrag.vue';
import { useOpponentPieceSlides } from './useOpponentPieceSlides';
import type { BoardPiece } from './types';

interface DepartingCapture {
  key: string;
  row: number;
  col: number;
  side: 'mine' | 'opp';
}

const props = defineProps<{
  pieces: BoardPiece[];
  yourSeat?: number;
  currentSeat?: number;
  jumpChainPieceId?: number | null;
  disabled?: boolean;
  quarksHint?: {
    from: { row: number; col: number };
    to: { row: number; col: number };
    chainLandings?: { row: number; col: number }[];
    chainCaptureCount?: number;
  } | null;
  onMove: (pieceId: number, toRow: number, toCol: number) => void | Promise<void>;
}>();

const { generateUniqueId } = useUniqueElementId();
const SIZE = 8;
const rows = Array.from({ length: SIZE }, (_, i) => i);
const departingCaptures = ref<DepartingCapture[]>([]);

const piecesRef = toRef(props, 'pieces');
const yourSeatRef = toRef(props, 'yourSeat');
const { activeSlides, hiddenGridPieceIds, slideStyle } = useOpponentPieceSlides(
  piecesRef,
  yourSeatRef,
);

watch(
  () => props.pieces,
  (next, prev) => {
    if (!prev?.length) {
      return;
    }
    const nextIds = new Set(next.map((p) => p.id));
    for (const p of prev) {
      if (nextIds.has(p.id)) {
        continue;
      }
      const key = `cap-${p.id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      departingCaptures.value.push({
        key,
        row: p.row,
        col: p.col,
        side: pieceSide(p),
      });
      window.setTimeout(() => {
        departingCaptures.value = departingCaptures.value.filter((d) => d.key !== key);
      }, 480);
    }
  },
);

const { state, entities } = useDnDProvider();
const dragError = ref<string | null>(null);

const draggingPiece = computed<BoardPiece | null>(() => {
  if (state.value !== 'dragging') {
    return null;
  }
  const [node] = entities.draggingMap.keys();
  if (!node) {
    return null;
  }
  return (entities.draggableMap.get(node)?.data?.() as BoardPiece) ?? null;
});

const rulesState = computed((): CheckersState => ({
  pieces: props.pieces as CheckersPiece[],
  currentSeat: (props.currentSeat ?? props.yourSeat ?? 1) as CheckersColor,
  winnerSeat: null,
  finished: false,
  moveCount: 0,
  jumpChainPieceId: props.jumpChainPieceId ?? null,
}));

const validTargets = computed<Set<string>>(() => {
  const piece = draggingPiece.value;
  if (!piece || props.disabled) {
    return new Set();
  }
  const moves = legalMovesFor(rulesState.value, piece as CheckersPiece);
  return new Set(moves.map((m) => `${m.row},${m.col}`));
});

function pieceAt(row: number, col: number): BoardPiece | null {
  const p = props.pieces.find((piece) => piece.row === row && piece.col === col) ?? null;
  if (p && hiddenGridPieceIds.value.has(p.id)) {
    return null;
  }
  return p;
}

function isDark(row: number, col: number): boolean {
  return (row + col) % 2 === 1;
}

function canDrag(piece: BoardPiece): boolean {
  if (props.disabled) {
    return false;
  }
  if (piece.color !== props.yourSeat) {
    return false;
  }
  if (props.currentSeat != null && props.currentSeat !== props.yourSeat) {
    return false;
  }
  if (props.jumpChainPieceId != null && piece.id !== props.jumpChainPieceId) {
    return false;
  }
  return true;
}

function departingAt(row: number, col: number): DepartingCapture[] {
  return departingCaptures.value.filter((d) => d.row === row && d.col === col);
}

function pieceChainActive(piece: BoardPiece): boolean {
  return props.jumpChainPieceId != null && piece.id === props.jumpChainPieceId;
}

function cellClass(row: number, col: number, validTarget: boolean): string {
  const parts = ['lab-game-cell', 'checkers-cell'];
  parts.push(isDark(row, col) ? 'checkers-cell--dark' : 'checkers-cell--light');
  if (validTarget) {
    parts.push('checkers-cell--valid-target');
  }
  const h = props.quarksHint;
  if (h) {
    if (h.from.row === row && h.from.col === col) {
      parts.push('lab-game-cell--quarks-hint', 'lab-game-cell--quarks-hint-from');
    }
    const hops = h.chainLandings?.length ? h.chainLandings : [h.to];
    const isHop = hops.some((p) => p.row === row && p.col === col);
    if (isHop) {
      parts.push('lab-game-cell--quarks-hint', 'lab-game-cell--quarks-hint-to');
      const hopIndex = hops.findIndex((p) => p.row === row && p.col === col);
      const finalHop = hops.length - 1;
      if (hopIndex >= 0 && hopIndex < finalHop) {
        parts.push('lab-game-cell--quarks-hint-chain');
      }
    }
  }
  return parts.join(' ');
}

function pieceSide(piece: BoardPiece): 'mine' | 'opp' {
  return piece.color === props.yourSeat ? 'mine' : 'opp';
}

function onDropped(piece: BoardPiece, toRow: number, toCol: number): void {
  if (props.disabled || piece.color !== props.yourSeat) {
    dragError.value = 'You can only move your own pieces.';
    return;
  }
  const seat = (props.yourSeat ?? 1) as CheckersColor;
  const move = { type: 'move' as const, pieceId: piece.id, toRow, toCol };
  const check = validateMove(rulesState.value, move, seat);
  if (!check.ok) {
    dragError.value = check.error ?? 'Illegal move.';
    return;
  }
  dragError.value = null;
  void props.onMove(piece.id, toRow, toCol);
}
</script>

<template>
  <div class="lab-game-surface checkers-game-board">
    <p v-if="dragError" class="checkers-drag-error m-0 text-xs" :id="generateUniqueId('ck-drag-error')">
      {{ dragError }}
    </p>
    <div class="lab-game-board checkers-board" :id="generateUniqueId('ck-board')">
      <div v-for="r in rows" :key="`r-${r}`" class="lab-game-board-row">
        <div
          v-for="c in rows"
          :key="`c-${r}-${c}`"
          :class="cellClass(r, c, validTargets.has(`${r},${c}`))"
          :id="generateUniqueId(`ck-cell-${r}-${c}`)"
        >
          <CheckersCellDrop
            :row="r"
            :col="c"
            :playable="isDark(r, c)"
            :disabled="props.disabled"
            :accept-drop="validTargets.has(`${r},${c}`)"
            :occupant="pieceAt(r, c)"
            @dropped="onDropped"
          >
            <span
              v-if="validTargets.has(`${r},${c}`) && !pieceAt(r, c)"
              class="checkers-target-dot"
              aria-hidden="true"
            />
            <CheckersPieceDrag
              v-if="pieceAt(r, c)"
              :piece="pieceAt(r, c)!"
              :can-drag="canDrag(pieceAt(r, c)!)"
              :piece-side="pieceSide(pieceAt(r, c)!)"
              :chain-active="pieceChainActive(pieceAt(r, c)!)"
              :label="pieceAt(r, c)!.isKing ? 'K' : ''"
            />
            <div
              v-for="dep in departingAt(r, c)"
              :key="dep.key"
              class="checkers-piece checkers-piece--captured"
              :class="dep.side === 'mine' ? 'checkers-piece--mine' : 'checkers-piece--opp'"
              aria-hidden="true"
            >
              <CheckersPieceDisc class="checkers-piece__svg" />
            </div>
          </CheckersCellDrop>
        </div>
      </div>
      <div class="checkers-slide-layer" aria-hidden="true">
        <div
          v-for="slide in activeSlides"
          :key="slide.key"
          class="checkers-slide-host"
          :style="slideStyle(slide)"
        >
          <div
            class="checkers-piece checkers-slide-piece"
            :class="slide.side === 'mine' ? 'checkers-piece--mine' : 'checkers-piece--opp'"
          >
            <CheckersPieceDisc class="checkers-piece__svg" />
            <span v-if="slide.isKing" class="checkers-piece__king">K</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.checkers-drag-error {
  color: var(--lab-chat-log-error);
}

.checkers-board {
  position: relative;
}

.checkers-slide-layer {
  position: absolute;
  inset: 0.5rem;
  pointer-events: none;
  z-index: 4;
}

.checkers-slide-host {
  position: absolute;
  top: 0;
  left: 0;
  width: var(--lab-game-cell-size);
  height: var(--lab-game-cell-size);
  display: flex;
  align-items: center;
  justify-content: center;
  transform: translate(
    calc(var(--slide-col) * (var(--lab-game-cell-size) + var(--lab-game-cell-gap))),
    calc(var(--slide-row) * (var(--lab-game-cell-size) + var(--lab-game-cell-gap)))
  );
  transition: transform 0.48s cubic-bezier(0.32, 0.72, 0, 1);
}

.checkers-slide-piece {
  position: relative;
  z-index: 1;
  cursor: default;
  touch-action: none;
  width: calc(var(--lab-game-cell-size) * 0.84);
  height: calc(var(--lab-game-cell-size) * 0.84);
  display: flex;
  align-items: center;
  justify-content: center;
  user-select: none;
  pointer-events: none;
}

.checkers-slide-piece.checkers-piece--mine {
  --checkers-fill: var(--lab-accent-primary, var(--lab-button-border-hover));
  --checkers-rim: color-mix(in srgb, var(--checkers-fill) 38%, var(--lab-general-bg));
}

.checkers-slide-piece.checkers-piece--opp {
  --checkers-fill: var(--lab-chat-log-error);
  --checkers-rim: color-mix(in srgb, var(--checkers-fill) 42%, var(--lab-general-bg));
}

.checkers-slide-piece .checkers-piece__svg {
  width: 100%;
  height: 100%;
  display: block;
  overflow: visible;
}

.checkers-slide-piece .checkers-piece__king {
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

.checkers-cell--light {
  background-color: color-mix(in srgb, var(--lab-general-bg-muted) 72%, var(--lab-general-bg));
}

.checkers-cell--dark {
  background-color: color-mix(in srgb, var(--lab-general-border) 58%, var(--lab-general-bg-muted));
}

/* Scoped board tones override imported game-board.css — keep Quarks wash visible */
.checkers-cell.lab-game-cell--quarks-hint {
  z-index: 2;
  background-color: color-mix(
    in srgb,
    var(--lab-section-accent, var(--lab-button-border-hover)) 32%,
    var(--lab-general-bg-muted, var(--lab-general-bg)) 68%
  );
}

.checkers-cell--valid-target.checkers-cell--dark {
  background-color: color-mix(in srgb, var(--lab-accent-primary) 28%, var(--lab-general-border));
}

.checkers-target-dot {
  position: absolute;
  width: calc(var(--lab-game-cell-size) * 0.28);
  height: calc(var(--lab-game-cell-size) * 0.28);
  border-radius: 9999px;
  background: color-mix(in srgb, var(--lab-accent-primary) 55%, transparent);
  pointer-events: none;
}

.checkers-piece--captured {
  position: absolute;
  inset: 0;
  margin: auto;
  width: calc(var(--lab-game-cell-size) * 0.84);
  height: calc(var(--lab-game-cell-size) * 0.84);
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  z-index: 2;
  animation: checkers-capture-out 0.45s ease forwards;
}

.checkers-piece--captured.checkers-piece--mine {
  --checkers-fill: var(--lab-accent-primary, var(--lab-button-border-hover));
  --checkers-rim: color-mix(in srgb, var(--checkers-fill) 38%, var(--lab-general-bg));
}

.checkers-piece--captured.checkers-piece--opp {
  --checkers-fill: var(--lab-chat-log-error);
  --checkers-rim: color-mix(in srgb, var(--checkers-fill) 42%, var(--lab-general-bg));
}

.checkers-piece--captured .checkers-piece__svg {
  width: 100%;
  height: 100%;
  display: block;
}

@keyframes checkers-capture-out {
  0% {
    transform: scale(1) translateX(0);
    opacity: 1;
  }
  18% {
    transform: scale(1.04) translateX(-3px);
    opacity: 1;
  }
  36% {
    transform: scale(0.98) translateX(3px);
    opacity: 0.95;
  }
  54% {
    transform: scale(0.92) translateX(-2px);
    opacity: 0.85;
  }
  72% {
    transform: scale(0.72) translateX(2px);
    opacity: 0.55;
  }
  100% {
    transform: scale(0.28);
    opacity: 0;
  }
}
</style>
