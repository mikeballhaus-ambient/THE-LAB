<script setup lang="ts">
import { ref, watch } from 'vue';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import '@/shared/game-platform/game-board.css';
import ConnectFourDisc from '../assets/connect-four-disc.svg';
import { dropRow } from '../../back-end/rules';

/**
 * Connect Four board — renders `board` from match state; drops via `onDrop`.
 */
type CfCell = 1 | 2 | null;

const props = defineProps<{
  board: CfCell[][];
  yourSeat?: number;
  disabled?: boolean;
  hintColumn?: number | null;
  onDrop: (col: number) => void | Promise<void>;
}>();

const { generateUniqueId } = useUniqueElementId();
const ROWS = 6;
const COLS = 7;
const CONNECT = 4;

const lastLanding = ref<{ row: number; col: number } | null>(null);
let landingClearTimer: ReturnType<typeof setTimeout> | undefined;

watch(
  () => props.board,
  (next, prev) => {
    if (!prev?.length) {
      return;
    }
    for (let r = 0; r < ROWS; r += 1) {
      for (let c = 0; c < COLS; c += 1) {
        const was = prev[r]?.[c] ?? null;
        const now = next[r]?.[c] ?? null;
        if (was === null && now !== null) {
          lastLanding.value = { row: r, col: c };
          if (landingClearTimer) {
            clearTimeout(landingClearTimer);
          }
          landingClearTimer = setTimeout(() => {
            lastLanding.value = null;
            landingClearTimer = undefined;
          }, 550);
          return;
        }
      }
    }
  },
  { deep: true },
);

function seatForYou(): number {
  return props.yourSeat === 2 ? 2 : 1;
}

function isWinningCell(row: number, col: number): boolean {
  const v = props.board[row]?.[col];
  if (v === null || v === undefined) {
    return false;
  }
  const dirs: ReadonlyArray<readonly [number, number]> = [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1],
  ];
  for (const [dr, dc] of dirs) {
    let count = 1;
    for (const sign of [1, -1]) {
      let r = row + dr * sign;
      let c = col + dc * sign;
      while (
        r >= 0 &&
        r < ROWS &&
        c >= 0 &&
        c < COLS &&
        props.board[r]?.[c] === v
      ) {
        count += 1;
        r += dr * sign;
        c += dc * sign;
      }
    }
    if (count >= CONNECT) {
      return true;
    }
  }
  return false;
}

function isColumnFull(col: number): boolean {
  return props.board[0]?.[col] !== null && props.board[0]?.[col] !== undefined;
}

function drop(col: number): void {
  if (props.disabled || isColumnFull(col)) {
    return;
  }
  void props.onDrop(col);
}

function cellValue(row: number, col: number): CfCell {
  return props.board[row]?.[col] ?? null;
}

function discSide(seat: 1 | 2): 'mine' | 'opp' {
  return seat === seatForYou() ? 'mine' : 'opp';
}

function isLanding(row: number, col: number): boolean {
  const hit = lastLanding.value;
  return hit?.row === row && hit?.col === col;
}

function dropTravelRows(row: number): number {
  return row + 1;
}

function hintLandingRow(col: number): number | null {
  if (props.hintColumn !== col) {
    return null;
  }
  const row = dropRow(props.board, col);
  return row >= 0 ? row : null;
}
</script>

<template>
  <div class="c4-board lab-game-surface">
    <section class="c4-board__frame lab-form-section" :id="generateUniqueId('c4-board-section')">
      <h4 class="lab-form-section__title" :id="generateUniqueId('c4-board-title')">
        <span class="lab-form-section__icon"><i class="pi pi-th-large" aria-hidden="true" /></span>
        Board
      </h4>
      <p class="lab-form-section__lead m-0">
        Choose a column to drop your disc. Four in a row wins — horizontal, vertical, or diagonal.
      </p>

      <div class="c4-board__grid lab-game-board" :id="generateUniqueId('c4-board')">
        <div
          v-for="c in COLS"
          :key="`col-${c - 1}`"
          class="c4-board__column"
          :class="{ 'c4-board__column--quarks-hint': props.hintColumn === c - 1 }"
        >
          <button
            type="button"
            class="c4-board__drop lab-game-cell lab-game-cell--action"
            :class="{
              'lab-game-cell--quarks-hint': props.hintColumn === c - 1,
              'lab-game-cell--quarks-hint-to': props.hintColumn === c - 1,
            }"
            :disabled="props.disabled || isColumnFull(c - 1)"
            :title="`Drop in column ${c - 1}`"
            :id="generateUniqueId(`c4-drop-${c - 1}`)"
            @click="drop(c - 1)"
          >
            <i class="pi pi-arrow-down" aria-hidden="true" />
            <span class="sr-only">Column {{ c - 1 }}</span>
          </button>

          <div class="c4-board__cells">
            <div
              v-for="r in ROWS"
              :key="`cell-${r - 1}-${c - 1}`"
              class="c4-board__cell"
              :class="{
                'c4-board__cell--quarks-hint':
                  hintLandingRow(c - 1) === r - 1,
              }"
              :id="generateUniqueId(`c4-cell-${r - 1}-${c - 1}`)"
            >
              <div
                class="c4-board__hole"
                :class="{
                  'c4-board__hole--quarks-hint':
                    hintLandingRow(c - 1) === r - 1,
                }"
                aria-hidden="true"
              />
              <div
                v-if="cellValue(r - 1, c - 1)"
                class="c4-board__disc"
                :class="[
                  `c4-board__disc--${discSide(cellValue(r - 1, c - 1) as 1 | 2)}`,
                  {
                    'c4-board__disc--win': isWinningCell(r - 1, c - 1),
                    'c4-board__disc--landing': isLanding(r - 1, c - 1),
                  },
                ]"
                :style="
                  isLanding(r - 1, c - 1)
                    ? { '--c4-drop-rows': String(dropTravelRows(r - 1)) }
                    : undefined
                "
              >
                <ConnectFourDisc class="c4-board__disc-svg" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <ul
        class="c4-board__legend list-none m-0 p-0 flex flex-wrap gap-3 text-sm text-lab-general-text-muted"
        :id="generateUniqueId('c4-legend')"
      >
        <li class="flex items-center gap-2">
          <span class="c4-board__legend-swatch c4-board__disc--mine" aria-hidden="true">
            <ConnectFourDisc class="c4-board__disc-svg" />
          </span>
          You
        </li>
        <li class="flex items-center gap-2">
          <span class="c4-board__legend-swatch c4-board__disc--opp" aria-hidden="true">
            <ConnectFourDisc class="c4-board__disc-svg" />
          </span>
          Opponent
        </li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.c4-board {
  width: 100%;
  max-width: 36rem;
}

.c4-board__frame {
  width: 100%;
  padding: 1rem 1.25rem;
}

.c4-board__grid {
  --lab-game-cell-size: 2.65rem;
  --lab-game-cell-gap: 0.35rem;
  display: flex;
  flex-direction: row;
  gap: var(--lab-game-cell-gap);
  margin-top: 0.75rem;
  padding: 0.65rem;
  border-radius: 0.5rem;
  background: color-mix(in srgb, var(--lab-general-bg-muted, var(--lab-general-bg)) 55%, var(--lab-general-border));
  border: 2px solid var(--lab-general-border);
  box-shadow: inset 0 2px 12px color-mix(in srgb, var(--lab-general-bg) 40%, transparent);
}

.c4-board__column {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--lab-game-cell-gap);
  flex: 1;
  min-width: 0;
}

.c4-board__drop {
  width: var(--lab-game-cell-size);
  height: calc(var(--lab-game-cell-size) * 0.55);
  min-height: 2rem;
  font-size: 0.85rem;
}

.c4-board__column--quarks-hint {
  position: relative;
  border-radius: 0.35rem;
  padding: 0.15rem 0.1rem 0;
  background: color-mix(
    in srgb,
    var(--lab-section-accent, var(--lab-button-border-hover)) 12%,
    transparent
  );
}

.c4-board__drop.lab-game-cell--quarks-hint {
  z-index: 2;
}

.c4-board__hole--quarks-hint {
  outline: 2px solid color-mix(
    in srgb,
    var(--lab-section-accent, var(--lab-button-border-hover)) 88%,
    var(--lab-general-text)
  );
  outline-offset: -2px;
  box-shadow:
    inset 0 0 0 1px color-mix(in srgb, var(--lab-section-accent, var(--lab-button-border-hover)) 35%, transparent),
    0 0 10px 2px color-mix(in srgb, var(--lab-section-accent, var(--lab-button-border-hover)) 40%, transparent);
}

.c4-board__cells {
  display: flex;
  flex-direction: column;
  gap: var(--lab-game-cell-gap);
  width: 100%;
}

.c4-board__cell {
  position: relative;
  width: var(--lab-game-cell-size);
  height: var(--lab-game-cell-size);
  margin: 0 auto;
}

.c4-board__hole {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: color-mix(in srgb, var(--lab-general-bg) 92%, var(--lab-general-border));
  box-shadow: inset 0 2px 6px color-mix(in srgb, var(--lab-general-bg) 30%, black);
  border: 2px solid color-mix(in srgb, var(--lab-general-border) 85%, transparent);
}

.c4-board__disc {
  position: absolute;
  inset: 4%;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  z-index: 1;
}

.c4-board__disc-svg {
  width: 100%;
  height: 100%;
  display: block;
}

.c4-board__disc--mine {
  --c4-disc-fill: var(--lab-accent-primary, var(--lab-button-border-hover));
  --c4-disc-rim: color-mix(in srgb, var(--lab-accent-primary, var(--lab-button-border-hover)) 55%, var(--lab-general-text));
}

.c4-board__disc--opp {
  --c4-disc-fill: var(--lab-chat-log-error);
  --c4-disc-rim: color-mix(in srgb, var(--lab-chat-log-error) 65%, var(--lab-general-bg));
}

.c4-board__disc--win {
  filter: drop-shadow(0 0 6px color-mix(in srgb, var(--lab-general-text) 55%, transparent));
  outline: 2px solid color-mix(in srgb, var(--lab-general-text) 70%, transparent);
  outline-offset: 2px;
  border-radius: 50%;
}

.c4-board__disc--landing {
  animation: c4-disc-drop 0.48s cubic-bezier(0.22, 1.05, 0.42, 1) forwards;
}

@keyframes c4-disc-drop {
  from {
    transform: translateY(
      calc(-1 * var(--c4-drop-rows, 3) * (var(--lab-game-cell-size) + var(--lab-game-cell-gap)))
    );
    opacity: 0.92;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.c4-board__legend {
  margin-top: 0.85rem;
}

.c4-board__legend-swatch {
  display: inline-flex;
  width: 1.25rem;
  height: 1.25rem;
}

.c4-board__legend-swatch .c4-board__disc-svg {
  width: 100%;
  height: 100%;
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

@media (max-width: 520px) {
  .c4-board__grid {
    --lab-game-cell-size: 2.15rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .c4-board__disc--landing {
    animation: none;
  }
}
</style>

<!-- Unscoped: scoped + chat-log-error beats :global(.app-light) inside SFC; html.app-light wins. -->
<style>
html.app-light .c4-board .c4-board__disc--mine,
html.app-light .c4-board .c4-board__legend-swatch.c4-board__disc--mine {
  --c4-disc-fill: var(--lab-button-bg, var(--lab-accent-primary));
  --c4-disc-rim: color-mix(
    in srgb,
    var(--lab-button-bg-hover, var(--lab-button-bg)) 58%,
    var(--lab-chat-input-text, var(--lab-chat-log-text))
  );
}

html.app-light .c4-board .c4-board__disc--opp,
html.app-light .c4-board .c4-board__legend-swatch.c4-board__disc--opp {
  --c4-disc-fill: var(--lab-chat-input-text, var(--lab-chat-log-text));
  --c4-disc-rim: color-mix(
    in srgb,
    var(--lab-chat-input-text, var(--lab-chat-log-text)) 72%,
    var(--lab-general-bg)
  );
}

html.app-light .c4-board .c4-board__disc,
html.app-light .c4-board .c4-board__legend-swatch {
  filter: drop-shadow(
    0 1px 2px color-mix(in srgb, var(--lab-chat-input-text, #0f172a) 22%, transparent)
  );
}
</style>
