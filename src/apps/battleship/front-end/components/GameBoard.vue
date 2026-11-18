<script setup lang="ts">
import { computed } from 'vue';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import '@/shared/game-platform/game-board.css';

/**
 * Pure Battleship renderer — two boards, fog of war respected.
 *
 * Enemy grid is interactive; your fleet grid is view-only (shots land here but you never click it).
 */
type ShotResult = 'hit' | 'miss';

const props = defineProps<{
  ownShipCells: string[];
  myShots: Record<string, ShotResult>;
  incomingShots: Record<string, ShotResult>;
  /** Enemy ships you have fully sunk (from match scores). */
  enemyShipsSunk: number;
  enemyShipTotal: number;
  shipsAfloat: number;
  totalShips: number;
  disabled?: boolean;
  hintFireCell?: { row: number; col: number } | null;
  onFire: (row: number, col: number) => void | Promise<void>;
}>();

const { generateUniqueId } = useUniqueElementId();
const SIZE = 8;
const cells = Array.from({ length: SIZE }, (_, r) =>
  Array.from({ length: SIZE }, (_, c) => ({ row: r, col: c })),
);

const ownShips = computed(() => new Set(props.ownShipCells));

function key(row: number, col: number): string {
  return `${row},${col}`;
}

function enemyShot(row: number, col: number): ShotResult | undefined {
  return props.myShots[key(row, col)];
}

function incomingShot(row: number, col: number): ShotResult | undefined {
  return props.incomingShots[key(row, col)];
}

function hasOwnShip(row: number, col: number): boolean {
  return ownShips.value.has(key(row, col));
}

function alreadyShot(row: number, col: number): boolean {
  return key(row, col) in props.myShots;
}

function fire(row: number, col: number): void {
  if (props.disabled || alreadyShot(row, col)) {
    return;
  }
  void props.onFire(row, col);
}

const ownShipsLost = computed(() => props.totalShips - props.shipsAfloat);
</script>

<template>
  <div class="bs-board lab-game-surface">
    <div class="bs-board__pair">
      <section
        class="bs-board__panel bs-board__panel--enemy lab-form-section"
        :id="generateUniqueId('bs-enemy-section')"
      >
        <h4 class="lab-form-section__title" :id="generateUniqueId('bs-enemy-title')">
          <span class="lab-form-section__icon"><i class="pi pi-crosshairs" aria-hidden="true" /></span>
          Enemy waters
        </h4>
        <p class="lab-form-section__lead m-0">
          Tap a square to fire. Hits and misses stay marked.
        </p>

        <div
          class="bs-board__fleet-track"
          :id="generateUniqueId('bs-enemy-sink-track')"
          role="status"
          :aria-label="`${props.enemyShipsSunk} of ${props.enemyShipTotal} enemy ships sunk`"
        >
          <p class="bs-board__fleet-track__text m-0">
            <span class="bs-board__fleet-track__count">{{ props.enemyShipsSunk }}</span>
            of {{ props.enemyShipTotal }} enemy ships sunk
          </p>
          <div
            class="bs-board__fleet-pips"
            :id="generateUniqueId('bs-enemy-sink-pips')"
            aria-hidden="true"
          >
            <span
              v-for="n in props.enemyShipTotal"
              :key="`enemy-${n}`"
              class="bs-board__fleet-pip"
              :class="{ 'bs-board__fleet-pip--sunk': n <= props.enemyShipsSunk }"
            />
          </div>
        </div>

        <div class="lab-game-board bs-board__grid" :id="generateUniqueId('bs-enemy-board')">
          <div v-for="(row, r) in cells" :key="`e-${r}`" class="lab-game-board-row">
            <button
              v-for="cell in row"
              :key="`e-${cell.row}-${cell.col}`"
              type="button"
              class="lab-game-cell lab-game-cell--action bs-cell"
              :class="{
                'bs-cell--shot': alreadyShot(cell.row, cell.col),
                'bs-cell--hit': enemyShot(cell.row, cell.col) === 'hit',
                'bs-cell--miss': enemyShot(cell.row, cell.col) === 'miss',
                'lab-game-cell--quarks-hint':
                  props.hintFireCell?.row === cell.row && props.hintFireCell?.col === cell.col,
              }"
              :disabled="props.disabled || alreadyShot(cell.row, cell.col)"
              :title="`Fire at row ${cell.row}, column ${cell.col}`"
              :aria-label="`Fire at row ${cell.row}, column ${cell.col}`"
              :id="generateUniqueId(`bs-enemy-${cell.row}-${cell.col}`)"
              @click="fire(cell.row, cell.col)"
            >
              <span
                v-if="enemyShot(cell.row, cell.col) === 'hit'"
                class="bs-marker bs-marker--hit"
                aria-hidden="true"
              >
                <i class="pi pi-times" />
              </span>
              <span
                v-else-if="enemyShot(cell.row, cell.col) === 'miss'"
                class="bs-marker bs-marker--miss"
                aria-hidden="true"
              />
            </button>
          </div>
        </div>
      </section>

      <section
        class="bs-board__panel bs-board__panel--fleet lab-form-section bs-board__panel--readonly"
        :id="generateUniqueId('bs-own-section')"
        aria-label="Your fleet — view only"
      >
        <h4 class="lab-form-section__title" :id="generateUniqueId('bs-own-title')">
          <span class="lab-form-section__icon"><i class="pi pi-eye" aria-hidden="true" /></span>
          Your waters
        </h4>
        <p class="lab-form-section__lead m-0">
          <span class="bs-board__view-only-badge">View only</span>
          The opponent fires here; you do not click this grid.
        </p>

        <div
          class="bs-board__fleet-track bs-board__fleet-track--own"
          :id="generateUniqueId('bs-own-fleet-track')"
          role="status"
          :aria-label="`${ownShipsLost} of ${props.totalShips} your ships sunk`"
        >
          <p class="bs-board__fleet-track__text m-0">
            <span class="bs-board__fleet-track__count">{{ ownShipsLost }}</span>
            of {{ props.totalShips }} your ships sunk
          </p>
          <div
            class="bs-board__fleet-pips"
            :id="generateUniqueId('bs-own-fleet-pips')"
            aria-hidden="true"
          >
            <span
              v-for="n in props.totalShips"
              :key="`own-${n}`"
              class="bs-board__fleet-pip"
              :class="{ 'bs-board__fleet-pip--sunk': n <= ownShipsLost }"
            />
          </div>
        </div>

        <div class="lab-game-board bs-board__grid bs-board__grid--readonly" :id="generateUniqueId('bs-own-board')">
          <div v-for="(row, r) in cells" :key="`o-${r}`" class="lab-game-board-row">
            <div
              v-for="cell in row"
              :key="`o-${cell.row}-${cell.col}`"
              class="lab-game-cell bs-cell bs-cell--static"
              :class="{
                'bs-cell--ship': hasOwnShip(cell.row, cell.col),
                'bs-cell--hit': incomingShot(cell.row, cell.col) === 'hit',
                'bs-cell--miss': incomingShot(cell.row, cell.col) === 'miss',
              }"
              :id="generateUniqueId(`bs-own-${cell.row}-${cell.col}`)"
            >
              <span
                v-if="hasOwnShip(cell.row, cell.col) && incomingShot(cell.row, cell.col) !== 'hit'"
                class="bs-marker bs-marker--ship"
                aria-hidden="true"
              />
              <span
                v-if="incomingShot(cell.row, cell.col) === 'hit'"
                class="bs-marker bs-marker--hit"
                aria-hidden="true"
              >
                <i class="pi pi-times" />
              </span>
              <span
                v-else-if="incomingShot(cell.row, cell.col) === 'miss'"
                class="bs-marker bs-marker--miss"
                aria-hidden="true"
              />
            </div>
          </div>
        </div>
      </section>
    </div>

    <ul
      class="bs-board__legend list-none m-0 p-0 flex flex-wrap gap-x-4 gap-y-2 text-sm text-lab-general-text-muted"
      :id="generateUniqueId('bs-legend')"
    >
      <li class="flex items-center gap-2">
        <span class="bs-board__legend-swatch bs-marker bs-marker--ship" aria-hidden="true" />
        Your ship
      </li>
      <li class="flex items-center gap-2">
        <span class="bs-board__legend-swatch bs-marker bs-marker--hit" aria-hidden="true">
          <i class="pi pi-times" />
        </span>
        Hit
      </li>
      <li class="flex items-center gap-2">
        <span class="bs-board__legend-swatch bs-marker bs-marker--miss" aria-hidden="true" />
        Miss
      </li>
    </ul>
  </div>
</template>

<style scoped>
.bs-board {
  width: 100%;
  max-width: 52rem;
}

.bs-board__pair {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 1rem 1.25rem;
  width: 100%;
}

.bs-board__panel {
  flex: 1 1 16rem;
  min-width: min(100%, 16rem);
}

.bs-board__panel--readonly {
  border-style: dashed;
  border-color: color-mix(in srgb, var(--lab-general-border) 85%, transparent);
  background: color-mix(in srgb, var(--lab-general-bg-muted, var(--lab-general-bg)) 35%, var(--lab-general-bg));
}

.bs-board__fleet-track {
  margin-top: 0.65rem;
  padding: 0.45rem 0.55rem;
  border-radius: 0.4rem;
  border: 1px solid color-mix(in srgb, var(--lab-general-border) 80%, transparent);
  background: color-mix(in srgb, var(--lab-chat-log-error) 8%, var(--lab-general-bg));
}

.bs-board__fleet-track--own {
  background: color-mix(in srgb, var(--lab-accent-primary, var(--lab-button-border-hover)) 10%, var(--lab-general-bg));
}

.bs-board__fleet-track__text {
  font-size: 0.875rem;
  color: var(--lab-general-text-muted);
}

.bs-board__fleet-track__count {
  font-weight: 700;
  font-size: 1.05rem;
  color: var(--lab-general-text);
}

.bs-board__fleet-pips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  margin-top: 0.4rem;
}

.bs-board__fleet-pip {
  flex: 0 0 auto;
  width: 1.75rem;
  height: 0.5rem;
  border-radius: 0.15rem;
  background: color-mix(in srgb, var(--lab-accent-primary, var(--lab-button-border-hover)) 35%, var(--lab-general-bg));
  border: 2px solid color-mix(in srgb, var(--lab-accent-primary) 50%, var(--lab-general-border));
  opacity: 0.9;
}

.bs-board__fleet-pip--sunk {
  background: color-mix(in srgb, var(--lab-chat-log-error) 55%, var(--lab-general-bg));
  border-color: var(--lab-chat-log-error);
  opacity: 1;
  position: relative;
}

.bs-board__fleet-pip--sunk::after {
  content: '';
  position: absolute;
  inset: 0;
  margin: auto;
  width: 70%;
  height: 2px;
  background: color-mix(in srgb, var(--lab-general-bg) 75%, var(--lab-general-text));
  transform: rotate(-18deg);
  border-radius: 1px;
}

.bs-board__view-only-badge {
  display: inline-block;
  margin-right: 0.35rem;
  padding: 0.1rem 0.45rem;
  border-radius: 999px;
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: var(--lab-general-text-muted);
  background: color-mix(in srgb, var(--lab-general-border) 35%, var(--lab-general-bg));
  border: 1px solid color-mix(in srgb, var(--lab-general-border) 70%, transparent);
}

.bs-board__grid {
  --lab-game-cell-size: 2.15rem;
  --lab-game-cell-gap: 3px;
  margin-top: 0.65rem;
  padding: 0.35rem;
  background: color-mix(
    in srgb,
    var(--lab-general-bg-muted, var(--lab-general-bg)) 50%,
    var(--lab-general-border)
  );
  border: 2px solid var(--lab-general-border);
  box-shadow: inset 0 2px 10px color-mix(in srgb, var(--lab-general-bg) 35%, transparent);
}

.bs-board__grid.lab-game-board {
  padding: 0.35rem;
}

.bs-board__grid--readonly {
  opacity: 0.94;
  pointer-events: none;
  cursor: default;
  border-style: dashed;
  background: color-mix(in srgb, var(--lab-general-bg) 88%, var(--lab-general-border));
  box-shadow: none;
}

.bs-cell {
  position: relative;
  background: color-mix(in srgb, var(--lab-accent-primary, var(--lab-button-border-hover)) 8%, var(--lab-general-bg));
}

.bs-cell--static {
  cursor: default;
}

.bs-cell--shot:not(.bs-cell--hit):not(.bs-cell--miss) {
  opacity: 0.7;
}

.bs-cell--hit {
  background: color-mix(in srgb, var(--lab-chat-log-error) 42%, var(--lab-general-bg));
  border-color: color-mix(in srgb, var(--lab-chat-log-error) 65%, var(--lab-general-border));
}

.bs-cell--miss {
  background: color-mix(in srgb, var(--lab-general-border) 25%, var(--lab-general-bg));
}

.bs-marker {
  display: block;
  pointer-events: none;
}

.bs-marker--ship {
  width: calc(var(--lab-game-cell-size) * 0.72);
  height: calc(var(--lab-game-cell-size) * 0.72);
  border-radius: 0.35rem;
  background: var(--lab-accent-primary, var(--lab-button-border-hover));
  box-shadow:
    inset 0 2px 4px color-mix(in srgb, var(--lab-general-bg) 35%, transparent),
    0 1px 3px color-mix(in srgb, var(--lab-accent-primary) 40%, transparent);
  border: 2px solid color-mix(in srgb, var(--lab-accent-primary) 55%, var(--lab-general-text));
}

.bs-marker--hit {
  width: calc(var(--lab-game-cell-size) * 0.55);
  height: calc(var(--lab-game-cell-size) * 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  color: var(--lab-general-bg);
  background: var(--lab-chat-log-error);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--lab-chat-log-error) 45%, var(--lab-general-bg));
  font-size: calc(var(--lab-game-cell-size) * 0.38);
  font-weight: 700;
}

.bs-marker--miss {
  width: calc(var(--lab-game-cell-size) * 0.38);
  height: calc(var(--lab-game-cell-size) * 0.38);
  border-radius: 50%;
  border: 3px solid color-mix(in srgb, var(--lab-general-text-muted) 75%, var(--lab-general-text));
  background: color-mix(in srgb, var(--lab-general-bg) 70%, var(--lab-general-border));
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--lab-general-border) 50%, transparent);
}

/* Pop-in when a new shot marker mounts (agent fire on your grid, or your fire on enemy). */
.bs-cell .bs-marker--hit,
.bs-cell .bs-marker--miss {
  transform-origin: center center;
  animation: bs-marker-pop-in 0.62s cubic-bezier(0.34, 1.25, 0.64, 1) both;
}

@keyframes bs-marker-pop-in {
  0% {
    transform: scale(0.2);
    opacity: 0.55;
  }
  58% {
    transform: scale(1.5);
    opacity: 1;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

.bs-board__legend {
  margin-top: 0.35rem;
}

.bs-board__legend-swatch {
  flex-shrink: 0;
}

.bs-board__legend-swatch.bs-marker--ship {
  width: 1.1rem;
  height: 1.1rem;
  border-radius: 0.2rem;
}

.bs-board__legend-swatch.bs-marker--hit {
  width: 1.1rem;
  height: 1.1rem;
  font-size: 0.65rem;
}

.bs-board__legend-swatch.bs-marker--miss {
  width: 1.1rem;
  height: 1.1rem;
  border-width: 2px;
}

@media (max-width: 640px) {
  .bs-board__pair {
    flex-direction: column;
  }

  .bs-board__grid {
    --lab-game-cell-size: 1.85rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .lab-game-cell--action {
    transition: none;
  }

  .bs-cell .bs-marker--hit,
  .bs-cell .bs-marker--miss {
    animation: none;
  }
}
</style>
