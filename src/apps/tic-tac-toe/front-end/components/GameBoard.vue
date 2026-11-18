<script setup lang="ts">
import { computed } from 'vue';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import '@/shared/game-platform/game-board.css';

/**
 * Pure board renderer — `board` from match state; clicks via `onPlace`.
 */
const props = defineProps<{
  board: (1 | 2 | null)[];
  yourSeat?: number;
  disabled?: boolean;
  hintIndex?: number | null;
  onPlace: (index: number) => void | Promise<void>;
}>();

const { generateUniqueId } = useUniqueElementId();

const WIN_LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

const youSeat = computed(() => (props.yourSeat === 2 ? 2 : 1));

function isWinningCell(index: number): boolean {
  return WIN_LINES.some(
    ([a, b, c]) =>
      props.board[a!] !== null &&
      props.board[a!] === props.board[b!] &&
      props.board[a!] === props.board[c!] &&
      (a === index || b === index || c === index),
  );
}

function markSide(seat: 1 | 2): 'mine' | 'opp' {
  return seat === youSeat.value ? 'mine' : 'opp';
}

function markLabel(seat: 1 | 2): 'X' | 'O' {
  return seat === 1 ? 'X' : 'O';
}

function click(index: number): void {
  if (props.disabled || props.board[index] !== null) {
    return;
  }
  void props.onPlace(index);
}
</script>

<template>
  <div class="ttt-board lab-game-surface">
    <section class="ttt-board__frame lab-form-section" :id="generateUniqueId('ttt-board-section')">
      <h4 class="lab-form-section__title" :id="generateUniqueId('ttt-board-title')">
        <span class="lab-form-section__icon"><i class="pi pi-th-large" aria-hidden="true" /></span>
        Board
      </h4>
      <p class="lab-form-section__lead m-0">
        Tap an empty cell. You play
        <span class="ttt-board__mark ttt-board__mark--mine" aria-hidden="true">{{ markLabel(youSeat) }}</span>;
        your opponent plays
        <span
          class="ttt-board__mark ttt-board__mark--opp"
          aria-hidden="true"
        >{{ markLabel(youSeat === 1 ? 2 : 1) }}</span>.
      </p>

      <div class="lab-game-board ttt-board__grid" :id="generateUniqueId('ttt-grid')">
        <div class="lab-game-board-row">
          <button
            v-for="i in 3"
            :key="i - 1"
            type="button"
            class="lab-game-cell lab-game-cell--action ttt-cell"
            :class="{
              'ttt-cell--win': isWinningCell(i - 1),
              'lab-game-cell--quarks-hint': props.hintIndex === i - 1,
            }"
            :disabled="props.disabled || props.board[i - 1] !== null"
            :id="generateUniqueId(`ttt-cell-${i - 1}`)"
            @click="click(i - 1)"
          >
            <span
              v-if="props.board[i - 1]"
              class="ttt-board__mark"
              :class="`ttt-board__mark--${markSide(props.board[i - 1] as 1 | 2)}`"
            >
              {{ markLabel(props.board[i - 1] as 1 | 2) }}
            </span>
          </button>
        </div>
        <div class="lab-game-board-row">
          <button
            v-for="i in 3"
            :key="i + 2"
            type="button"
            class="lab-game-cell lab-game-cell--action ttt-cell"
            :class="{
              'ttt-cell--win': isWinningCell(i + 2),
              'lab-game-cell--quarks-hint': props.hintIndex === i + 2,
            }"
            :disabled="props.disabled || props.board[i + 2] !== null"
            :id="generateUniqueId(`ttt-cell-${i + 2}`)"
            @click="click(i + 2)"
          >
            <span
              v-if="props.board[i + 2]"
              class="ttt-board__mark"
              :class="`ttt-board__mark--${markSide(props.board[i + 2] as 1 | 2)}`"
            >
              {{ markLabel(props.board[i + 2] as 1 | 2) }}
            </span>
          </button>
        </div>
        <div class="lab-game-board-row">
          <button
            v-for="i in 3"
            :key="i + 5"
            type="button"
            class="lab-game-cell lab-game-cell--action ttt-cell"
            :class="{
              'ttt-cell--win': isWinningCell(i + 5),
              'lab-game-cell--quarks-hint': props.hintIndex === i + 5,
            }"
            :disabled="props.disabled || props.board[i + 5] !== null"
            :id="generateUniqueId(`ttt-cell-${i + 5}`)"
            @click="click(i + 5)"
          >
            <span
              v-if="props.board[i + 5]"
              class="ttt-board__mark"
              :class="`ttt-board__mark--${markSide(props.board[i + 5] as 1 | 2)}`"
            >
              {{ markLabel(props.board[i + 5] as 1 | 2) }}
            </span>
          </button>
        </div>
      </div>

      <ul
        class="ttt-board__legend list-none m-0 p-0 flex flex-wrap gap-3 text-sm text-lab-general-text-muted"
        :id="generateUniqueId('ttt-legend')"
      >
        <li class="flex items-center gap-2">
          <span class="ttt-board__mark ttt-board__mark--mine" aria-hidden="true">{{ markLabel(youSeat) }}</span>
          You
        </li>
        <li class="flex items-center gap-2">
          <span class="ttt-board__mark ttt-board__mark--opp" aria-hidden="true">{{
            markLabel(youSeat === 1 ? 2 : 1)
          }}</span>
          Opponent
        </li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.ttt-board {
  width: 100%;
  max-width: 22rem;
}

.ttt-board__frame {
  width: 100%;
  padding: 0.75rem 1rem;
}

.ttt-board__grid {
  --lab-game-cell-size: 4.25rem;
  --lab-game-cell-gap: 0.35rem;
  margin-top: 0.75rem;
  padding: 0.5rem;
  background: color-mix(
    in srgb,
    var(--lab-general-bg-muted, var(--lab-general-bg)) 55%,
    var(--lab-general-border)
  );
  border: 2px solid var(--lab-general-border);
  box-shadow: inset 0 2px 10px color-mix(in srgb, var(--lab-general-bg) 35%, transparent);
}

.ttt-board__grid.lab-game-board {
  padding: 0.5rem;
}

.ttt-cell {
  background: color-mix(in srgb, var(--lab-general-bg) 92%, var(--lab-general-border));
}

.ttt-cell--win {
  outline: 2px solid color-mix(in srgb, var(--lab-accent-primary) 65%, var(--lab-general-text));
  outline-offset: 2px;
  z-index: 1;
}

.ttt-board__mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: calc(var(--lab-game-cell-size) * 0.52);
  font-weight: 800;
  line-height: 1;
  user-select: none;
}

.ttt-board__mark--mine {
  color: var(--lab-accent-primary, var(--lab-button-border-hover));
  text-shadow: 0 1px 2px color-mix(in srgb, var(--lab-general-text) 20%, transparent);
}

.ttt-board__mark--opp {
  color: var(--lab-chat-log-error);
  text-shadow: 0 1px 2px color-mix(in srgb, var(--lab-general-bg) 35%, transparent);
}

.ttt-board__legend {
  margin-top: 0.85rem;
}

.ttt-board__legend .ttt-board__mark {
  font-size: 1.15rem;
  min-width: 1.25rem;
}

@media (max-width: 520px) {
  .ttt-board__grid {
    --lab-game-cell-size: 3.35rem;
  }
}
</style>
