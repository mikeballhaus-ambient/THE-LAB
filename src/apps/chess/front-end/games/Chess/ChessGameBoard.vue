<script setup lang="ts">
import { computed, ref, toRef, watch } from 'vue';
import { useDnDProvider } from '@vue-dnd-kit/core';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import '@/shared/game-platform/game-board.css';
import {
  isLegalMove,
  legalMovesFrom,
  squareName,
  type ChessColor as RulesColor,
  type ChessPiece,
} from '../../../shared/chess-rules';
import ChessCellDrop from './ChessCellDrop.vue';
import ChessPieceDrag from './ChessPieceDrag.vue';
import ChessPromotionDialog from './ChessPromotionDialog.vue';
import { useOpponentPieceSlides } from './useOpponentPieceSlides';
import type {
  ChessBoardPiece,
  ChessColor,
  ChessPieceType,
  ChessSquareRef,
  PromotionChoice,
} from './types';

const PIECE_GLYPH: Record<ChessPieceType, string> = {
  king: '♚',
  queen: '♛',
  rook: '♜',
  bishop: '♝',
  knight: '♞',
  pawn: '♟',
};

interface DepartingCapture {
  key: string;
  row: number;
  col: number;
  side: 'mine' | 'opp';
  type: ChessPieceType;
}

const props = defineProps<{
  pieces: ChessBoardPiece[];
  yourColor?: ChessColor;
  youInCheck?: boolean;
  opponentInCheck?: boolean;
  disabled?: boolean;
  quarksHint?: { from: { row: number; col: number }; to: { row: number; col: number } } | null;
  onMove: (
    from: ChessSquareRef,
    to: ChessSquareRef,
    promotion?: PromotionChoice,
  ) => void | Promise<void>;
}>();

const { generateUniqueId } = useUniqueElementId();
const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const selected = ref<ChessSquareRef | null>(null);
const promotionVisible = ref(false);
const pendingMove = ref<{ from: ChessSquareRef; to: ChessSquareRef } | null>(null);
const departingCaptures = ref<DepartingCapture[]>([]);
const dragError = ref<string | null>(null);

const piecesRef = toRef(props, 'pieces');
const yourColorRef = toRef(props, 'yourColor');
const { activeSlides, hiddenGridPieceIds } = useOpponentPieceSlides(piecesRef, yourColorRef);

const { state, entities } = useDnDProvider();

const draggingPiece = computed<ChessBoardPiece | null>(() => {
  if (state.value !== 'dragging') {
    return null;
  }
  const [node] = entities.draggingMap.keys();
  if (!node) {
    return null;
  }
  return (entities.draggableMap.get(node)?.data?.() as ChessBoardPiece) ?? null;
});

watch(
  () => props.disabled,
  (isDisabled) => {
    if (isDisabled) {
      selected.value = null;
      dragError.value = null;
    }
  },
);

watch(draggingPiece, (piece) => {
  if (piece) {
    selected.value = { row: piece.row, col: piece.col };
    dragError.value = null;
  }
});

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
        type: p.type,
      });
      window.setTimeout(() => {
        departingCaptures.value = departingCaptures.value.filter((d) => d.key !== key);
      }, 480);
    }
  },
);

const viewRows = computed(() =>
  props.yourColor === 'black'
    ? Array.from({ length: 8 }, (_, i) => 7 - i)
    : Array.from({ length: 8 }, (_, i) => i),
);
const viewCols = computed(() =>
  props.yourColor === 'black'
    ? Array.from({ length: 8 }, (_, i) => 7 - i)
    : Array.from({ length: 8 }, (_, i) => i),
);

const kingSquare = computed(() => {
  if (!props.yourColor) {
    return null;
  }
  const king = props.pieces.find((p) => p.type === 'king' && p.color === props.yourColor);
  return king ? { row: king.row, col: king.col } : null;
});

const opponentColor = computed((): ChessColor | undefined => {
  if (props.yourColor === 'white') {
    return 'black';
  }
  if (props.yourColor === 'black') {
    return 'white';
  }
  return undefined;
});

const opponentKingSquare = computed(() => {
  if (!opponentColor.value) {
    return null;
  }
  const king = props.pieces.find((p) => p.type === 'king' && p.color === opponentColor.value);
  return king ? { row: king.row, col: king.col } : null;
});

const highlightSource = computed((): ChessSquareRef | null => {
  if (draggingPiece.value) {
    return { row: draggingPiece.value.row, col: draggingPiece.value.col };
  }
  return selected.value;
});

const validTargets = computed<Set<string>>(() => {
  const from = highlightSource.value;
  if (!from || props.disabled || !props.yourColor) {
    return new Set();
  }
  const moves = legalMovesFrom(
    props.pieces as ChessPiece[],
    props.yourColor as RulesColor,
    from,
  );
  return new Set(moves.map((m) => `${m.row},${m.col}`));
});

function gridIndexRow(logicalRow: number): number {
  const idx = viewRows.value.indexOf(logicalRow);
  return idx >= 0 ? idx : logicalRow;
}

function gridIndexCol(logicalCol: number): number {
  const idx = viewCols.value.indexOf(logicalCol);
  return idx >= 0 ? idx : logicalCol;
}

function slideStyle(slide: (typeof activeSlides.value)[number]): Record<string, string | number> {
  const lr = slide.atDestination ? slide.toRow : slide.fromRow;
  const lc = slide.atDestination ? slide.toCol : slide.fromCol;
  return {
    '--slide-col': gridIndexCol(lc),
    '--slide-row': gridIndexRow(lr),
  };
}

function slideSide(slide: (typeof activeSlides.value)[number]): 'mine' | 'opp' {
  return slide.color === props.yourColor ? 'mine' : 'opp';
}

function pieceAt(row: number, col: number): ChessBoardPiece | null {
  const p = props.pieces.find((piece) => piece.row === row && piece.col === col) ?? null;
  if (p && hiddenGridPieceIds.value.has(p.id)) {
    return null;
  }
  return p;
}

function departingAt(row: number, col: number): DepartingCapture[] {
  return departingCaptures.value.filter((d) => d.row === row && d.col === col);
}

function isLight(row: number, col: number): boolean {
  return (row + col) % 2 === 0;
}

function isSelected(row: number, col: number): boolean {
  return selected.value?.row === row && selected.value?.col === col;
}

function isKingInCheckSquare(row: number, col: number): boolean {
  return (
    !!props.youInCheck &&
    !!kingSquare.value &&
    kingSquare.value.row === row &&
    kingSquare.value.col === col
  );
}

function isOpponentKingInCheckSquare(row: number, col: number): boolean {
  return (
    !!props.opponentInCheck &&
    !!opponentKingSquare.value &&
    opponentKingSquare.value.row === row &&
    opponentKingSquare.value.col === col
  );
}

function pieceSide(piece: ChessBoardPiece): 'mine' | 'opp' {
  return piece.color === props.yourColor ? 'mine' : 'opp';
}

function isOwnPiece(piece: ChessBoardPiece | null): boolean {
  return !!piece && piece.color === props.yourColor;
}

function canDrag(piece: ChessBoardPiece): boolean {
  if (props.disabled || !props.yourColor) {
    return false;
  }
  return piece.color === props.yourColor;
}

function cellClass(row: number, col: number): string {
  const parts = ['lab-game-cell', 'lab-game-cell--action', 'chess-cell'];
  parts.push(isLight(row, col) ? 'chess-cell--light' : 'chess-cell--dark');
  if (isSelected(row, col)) {
    parts.push('chess-cell--selected');
  }
  if (isKingInCheckSquare(row, col)) {
    parts.push('chess-cell--king-in-check');
  }
  if (isOpponentKingInCheckSquare(row, col)) {
    parts.push('chess-cell--opponent-in-check');
  }
  if (validTargets.value.has(`${row},${col}`)) {
    parts.push('chess-cell--valid-target');
  }
  const h = props.quarksHint;
  if (h) {
    if (h.from.row === row && h.from.col === col) {
      parts.push('lab-game-cell--quarks-hint', 'lab-game-cell--quarks-hint-from');
    }
    if (h.to.row === row && h.to.col === col) {
      parts.push('lab-game-cell--quarks-hint', 'lab-game-cell--quarks-hint-to');
    }
  }
  return parts.join(' ');
}

function needsPromotion(from: ChessSquareRef, to: ChessSquareRef): boolean {
  const piece = props.pieces.find((p) => p.row === from.row && p.col === from.col);
  if (!piece || piece.type !== 'pawn' || !props.yourColor) {
    return false;
  }
  const lastRank = props.yourColor === 'white' ? 0 : 7;
  return to.row === lastRank;
}

function tryMove(from: ChessSquareRef, to: ChessSquareRef): void {
  if (!props.yourColor) {
    return;
  }
  if (!validTargets.value.has(`${to.row},${to.col}`)) {
    dragError.value = 'That square is not a legal move.';
    return;
  }
  if (
    !isLegalMove(props.pieces as ChessPiece[], props.yourColor as RulesColor, from, to)
  ) {
    dragError.value = 'Illegal move.';
    return;
  }
  dragError.value = null;
  selected.value = null;

  if (needsPromotion(from, to)) {
    pendingMove.value = { from, to };
    promotionVisible.value = true;
    return;
  }

  submitMove(from, to);
}

function submitMove(from: ChessSquareRef, to: ChessSquareRef, promotion?: PromotionChoice): void {
  void props.onMove(from, to, promotion);
}

function onPromotionChoice(piece: ChessPieceType): void {
  const pending = pendingMove.value;
  pendingMove.value = null;
  if (!pending || piece === 'king' || piece === 'pawn') {
    return;
  }
  submitMove(pending.from, pending.to, piece);
}

function onDropped(piece: ChessBoardPiece, toRow: number, toCol: number): void {
  if (props.disabled || piece.color !== props.yourColor) {
    dragError.value = 'You can only move your own pieces.';
    return;
  }
  tryMove({ row: piece.row, col: piece.col }, { row: toRow, col: toCol });
}

function onSquare(row: number, col: number): void {
  if (props.disabled) {
    return;
  }
  const piece = pieceAt(row, col);

  if (!selected.value) {
    if (isOwnPiece(piece)) {
      selected.value = { row, col };
      dragError.value = null;
    }
    return;
  }

  if (isSelected(row, col)) {
    selected.value = null;
    return;
  }

  if (isOwnPiece(piece)) {
    selected.value = { row, col };
    dragError.value = null;
    return;
  }

  tryMove(selected.value, { row, col });
}
</script>

<template>
  <div class="lab-game-surface chess-game-board">
    <p
      v-if="props.opponentInCheck && !props.youInCheck"
      class="chess-opponent-check-banner m-0 text-xs"
      :id="generateUniqueId('ch-opp-check-banner')"
    >
      {{ opponentColor === 'white' ? 'White' : 'Black' }} king is in check.
    </p>
    <p
      v-if="props.youInCheck"
      class="chess-check-banner m-0 text-xs"
      :id="generateUniqueId('ch-check-banner')"
    >
      You are in check.
    </p>
    <p v-if="dragError" class="chess-drag-error m-0 text-xs" :id="generateUniqueId('ch-drag-error')">
      {{ dragError }}
    </p>
    <p class="m-0 text-xs text-lab-general-text-muted" :id="generateUniqueId('ch-hint')">
      <template v-if="selected">
        Selected {{ squareName(selected.row, selected.col) }} — drop on a highlighted square or click
        a target.
      </template>
      <template v-else>Drag your piece to a highlighted square, or click piece then square.</template>
    </p>

    <div class="chess-board-wrap">
      <div class="chess-rank-labels">
        <span v-for="row in viewRows" :key="`rank-${row}`" class="chess-rank-label">
          {{ 8 - row }}
        </span>
      </div>

      <div class="lab-game-board chess-board" :id="generateUniqueId('ch-board')">
        <div v-for="row in viewRows" :key="`row-${row}`" class="lab-game-board-row">
          <div
            v-for="col in viewCols"
            :key="`sq-${row}-${col}`"
            :class="cellClass(row, col)"
            :id="generateUniqueId(`ch-${row}-${col}`)"
            role="button"
            tabindex="0"
            :aria-disabled="props.disabled ? 'true' : undefined"
            :title="squareName(row, col)"
            @click="onSquare(row, col)"
            @keydown.enter.prevent="onSquare(row, col)"
            @keydown.space.prevent="onSquare(row, col)"
          >
            <ChessCellDrop
              :row="row"
              :col="col"
              :disabled="props.disabled"
              :accept-drop="validTargets.has(`${row},${col}`)"
              :occupant="pieceAt(row, col)"
              @dropped="onDropped"
            >
              <span
                v-if="validTargets.has(`${row},${col}`) && !pieceAt(row, col)"
                class="chess-target-dot"
                aria-hidden="true"
              />
              <span
                v-if="
                  validTargets.has(`${row},${col}`) &&
                  pieceAt(row, col) &&
                  !isOwnPiece(pieceAt(row, col))
                "
                class="chess-capture-marker"
                aria-hidden="true"
              />
              <ChessPieceDrag
                v-if="pieceAt(row, col)"
                :piece="pieceAt(row, col)!"
                :can-drag="canDrag(pieceAt(row, col)!)"
                :piece-side="pieceSide(pieceAt(row, col)!)"
              />
              <span
                v-for="dep in departingAt(row, col)"
                :key="dep.key"
                class="chess-piece chess-piece--captured"
                :class="dep.side === 'mine' ? 'chess-piece--mine' : 'chess-piece--opp'"
                aria-hidden="true"
              >
                {{ PIECE_GLYPH[dep.type] }}
              </span>
            </ChessCellDrop>
          </div>
        </div>

        <div class="chess-slide-layer" aria-hidden="true">
          <div
            v-for="slide in activeSlides"
            :key="slide.key"
            class="chess-slide-host"
            :style="slideStyle(slide)"
          >
            <span
              class="chess-piece chess-slide-piece"
              :class="slideSide(slide) === 'mine' ? 'chess-piece--mine' : 'chess-piece--opp'"
            >
              {{ PIECE_GLYPH[slide.type] }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <div class="chess-file-labels">
      <span v-for="col in viewCols" :key="`file-${col}`" class="chess-file-label">
        {{ files[col] }}
      </span>
    </div>

    <ChessPromotionDialog
      v-if="props.yourColor"
      v-model:visible="promotionVisible"
      :your-color="props.yourColor"
      @choose="onPromotionChoice"
    />
  </div>
</template>

<style scoped>
.chess-check-banner {
  color: var(--lab-chat-log-error);
  font-weight: 600;
}

.chess-opponent-check-banner {
  color: color-mix(in srgb, var(--lab-accent-primary) 85%, var(--lab-general-text));
  font-weight: 600;
}

.chess-drag-error {
  color: var(--lab-chat-log-error);
}

.chess-board-wrap {
  display: flex;
  align-items: stretch;
  gap: 0.35rem;
}

.chess-rank-labels {
  display: flex;
  flex-direction: column;
  justify-content: space-around;
  padding: 0.5rem 0;
  gap: var(--lab-game-cell-gap);
}

.chess-rank-label {
  height: var(--lab-game-cell-size);
  display: flex;
  align-items: center;
  font-size: 0.65rem;
  color: var(--lab-general-text-muted);
}

.chess-file-labels {
  display: flex;
  gap: var(--lab-game-cell-gap);
  padding-left: calc(0.5rem + 1.1rem);
  margin-top: 0.25rem;
}

.chess-file-label {
  width: var(--lab-game-cell-size);
  text-align: center;
  font-size: 0.65rem;
  color: var(--lab-general-text-muted);
}

.chess-board {
  position: relative;
}

.chess-cell--light {
  position: relative;
  background-color: color-mix(in srgb, var(--lab-general-bg-muted) 72%, var(--lab-general-bg));
}

.chess-cell--dark {
  position: relative;
  background-color: color-mix(in srgb, var(--lab-general-border) 58%, var(--lab-general-bg-muted));
}

.chess-cell--selected.chess-cell--light,
.chess-cell--selected.chess-cell--dark {
  box-shadow: inset 0 0 0 2px var(--lab-accent-primary);
}

.chess-cell--king-in-check.chess-cell--light,
.chess-cell--king-in-check.chess-cell--dark {
  box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--lab-chat-log-error) 75%, transparent);
  background-color: color-mix(in srgb, var(--lab-chat-log-error) 22%, var(--lab-general-bg-muted));
}

.chess-cell--opponent-in-check.chess-cell--light,
.chess-cell--opponent-in-check.chess-cell--dark {
  box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--lab-accent-primary) 65%, transparent);
  background-color: color-mix(in srgb, var(--lab-accent-primary) 18%, var(--lab-general-bg-muted));
}

.chess-cell--valid-target.chess-cell--light {
  background-color: color-mix(in srgb, var(--lab-accent-primary) 22%, var(--lab-general-bg-muted));
}

.chess-cell--valid-target.chess-cell--dark {
  background-color: color-mix(in srgb, var(--lab-accent-primary) 28%, var(--lab-general-border));
}

.chess-cell.lab-game-cell--quarks-hint {
  z-index: 2;
  background-color: color-mix(
    in srgb,
    var(--lab-section-accent, var(--lab-button-border-hover)) 32%,
    var(--lab-general-bg-muted, var(--lab-general-bg)) 68%
  );
}

.chess-target-dot {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: calc(var(--lab-game-cell-size) * 0.28);
  height: calc(var(--lab-game-cell-size) * 0.28);
  border-radius: 9999px;
  background: color-mix(in srgb, var(--lab-accent-primary) 55%, transparent);
  pointer-events: none;
  z-index: 0;
}

.chess-capture-marker {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: calc(var(--lab-game-cell-size) * 0.78);
  height: calc(var(--lab-game-cell-size) * 0.78);
  border-radius: 9999px;
  box-shadow: inset 0 0 0 3px color-mix(in srgb, var(--lab-accent-primary) 65%, transparent);
  pointer-events: none;
  z-index: 0;
}

.chess-cell[aria-disabled='true'] {
  cursor: not-allowed;
  opacity: 0.72;
}

.chess-piece {
  font-size: calc(var(--lab-game-cell-size) * 0.62);
  line-height: 1;
  user-select: none;
  position: relative;
  z-index: 1;
  font-family: 'Segoe UI Symbol', 'Noto Sans Symbols2', 'Symbola', sans-serif;
  font-variant-emoji: text;
}

.chess-piece--mine {
  color: var(--lab-accent-primary, var(--lab-button-border-hover));
  text-shadow: 0 1px 2px color-mix(in srgb, var(--lab-general-text) 25%, transparent);
}

.chess-piece--opp {
  color: var(--lab-chat-log-error);
  text-shadow: 0 1px 2px color-mix(in srgb, var(--lab-general-bg) 40%, transparent);
}

.chess-piece--captured {
  position: absolute;
  inset: 0;
  margin: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2;
  animation: chess-capture-out 0.45s ease forwards;
  pointer-events: none;
}

@keyframes chess-capture-out {
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

.chess-slide-layer {
  position: absolute;
  inset: 0.5rem;
  pointer-events: none;
  z-index: 4;
}

.chess-slide-host {
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

.chess-slide-piece {
  pointer-events: none;
}
</style>
