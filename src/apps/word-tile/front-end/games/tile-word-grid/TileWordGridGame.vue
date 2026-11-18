<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { getLabSessionId, labPlatformFetchInit } from '@/shared/composables/useLabPlatformAuth';
import { useCatalogMatchGameHint } from '@/shared/game-platform/composables/useCatalogMatchGameHint';
import { useLabGameHintAsideProps } from '@/shared/game-platform/composables/useLabGameHintAsideProps';
import { LAB_GAME_HINT_SKU_BEST_PLAY } from '@/shared/game-platform/lab-game-hints';
import { LabGameHintAsideControls } from '@/shared/game-platform/ui';
import { useLabVirtualBank } from '@/shared/composables/useLabVirtualBank';
import { WORD_TILE_CONFIG } from '../../../shared/game-config';
import { DnDProvider } from '@vue-dnd-kit/core';
import Button from 'primevue/button';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import TurnTimerHud from '@/shared/game-platform/ui/TurnTimerHud.vue';
import HumanMatchSeriesBar from '@/shared/game-platform/ui/HumanMatchSeriesBar.vue';
import GameBoardRow from '@/shared/game-platform/ui/GameBoardRow.vue';
import PlayerTurnsPanel from '@/shared/game-platform/ui/PlayerTurnsPanel.vue';
import type { MatchPlayerTurn } from '../../composables/useMatchPlayerTurns';
import { asPlatformMatchView, type MatchView } from '../../composables/useTurnBasedMatch';
import { useHumanHeadToHead } from '../../composables/useHumanHeadToHead';
import { WORD_TILE_GAME_IDS } from '../../../shared/types';
import { TILE_LETTER_SCORES } from '../../../shared/tile-word-grid-constants';
import TileBoardCell from './TileBoardCell.vue';
import TileBoardDropLayer from './TileBoardDropLayer.vue';
import TileDragPreview from './TileDragPreview.vue';
import TileRackLetter from './TileRackLetter.vue';
import type { BoardCellCoord } from './tile-board-drop-hit';
import type { TileDragPayload } from './tile-grid-dnd';
import { tileWordGridPremiumAt } from '../../../shared/tile-word-grid-board-premiums';

const props = defineProps<{
  match: MatchView;
  opponentDisplayName: string;
  serverUrl?: string;
  onMove: (move: Record<string, unknown>) => Promise<void>;
  playerTurns?: MatchPlayerTurn[];
  livePlayerTurn?: MatchPlayerTurn | null;
  waitingForOpponent?: boolean;
  agentResolvingMove?: boolean;
  /** Optional parent-provided ghost placements (otherwise computed after hint unlock). */
  ghostPlacements?: ReadonlyArray<{ row: number; col: number; letter: string }> | null;
}>();

const emit = defineEmits<{
  finished: [];
}>();

const isAiMatch = computed(() => props.match.opponentKind === 'ai');
const isMatchGame = computed(
  () => props.match.opponentKind === 'ai' || props.match.opponentKind === 'human',
);

const serverUrlRef = computed(() => props.serverUrl?.replace(/\/$/, '') ?? '');
const { stats: h2hStats, loading: h2hLoading, load: loadH2h } = useHumanHeadToHead(serverUrlRef);

const isHumanMatch = computed(() => props.match.opponentKind === 'human');

const isMyTurn = computed(
  () => props.match.status === 'active' && props.match.currentSeat === props.match.yourSeat,
);

const opponentUserId = computed(() => {
  if (!isHumanMatch.value) {
    return 0;
  }
  return props.match.yourSeat === 1
    ? (props.match.player2Id ?? 0)
    : (props.match.player1Id ?? 0);
});

async function refreshHeadToHead(): Promise<void> {
  if (!isHumanMatch.value || opponentUserId.value <= 0) {
    return;
  }
  await loadH2h(WORD_TILE_GAME_IDS.TILE_WORD_GRID, opponentUserId.value);
}

const { generateUniqueId } = useUniqueElementId();
const busy = ref(false);
const error = ref<string | null>(null);
interface StagedPlacement {
  row: number;
  col: number;
  letter: string;
  rackIndex: number;
}

const stagedPlacements = ref<StagedPlacement[]>([]);
const ghostHintPlacements = ref<ReadonlyArray<{ row: number; col: number; letter: string }>>([]);
const ghostHintSummary = ref<string | null>(null);
const isAuthenticated = ref(Boolean(getLabSessionId()));

const virtualBank = useLabVirtualBank({ serverUrl: serverUrlRef });

const bestPlayHint = useCatalogMatchGameHint({
  hostAppId: WORD_TILE_CONFIG.appId,
  skuId: LAB_GAME_HINT_SKU_BEST_PLAY,
  serverUrl: serverUrlRef,
  match: computed(() => asPlatformMatchView(props.match)),
  buildTurnKey: () => {
    const rev = (props.match as { stateRevision?: number }).stateRevision ?? 0;
    return `${rev}:${props.match.currentSeat ?? 0}`;
  },
  onPurchased: () => void virtualBank.refresh(),
});

const bestPlayAside = useLabGameHintAsideProps(bestPlayHint);

const effectiveGhostPlacements = computed(() => {
  if (props.ghostPlacements) {
    return props.ghostPlacements;
  }
  return bestPlayHint.showOverlay.value ? ghostHintPlacements.value : [];
});

function dismissBestPlayHint(): void {
  ghostHintPlacements.value = [];
  ghostHintSummary.value = null;
  bestPlayHint.consumeUnlock();
}

async function refreshBestPlayGhost(): Promise<void> {
  const base = serverUrlRef.value;
  if (!base || !bestPlayHint.showOverlay.value || !isMyTurn.value) {
    ghostHintPlacements.value = [];
    ghostHintSummary.value = null;
    return;
  }
  try {
    const response = await fetch(
      `${base}/api/game-hints/best-play`,
      labPlatformFetchInit({
        method: 'POST',
        body: JSON.stringify({
          state: props.match.state,
          seat: props.match.yourSeat,
        }),
      }),
    );
    const json = (await response.json()) as {
      success?: boolean;
      data?: { placements: { row: number; col: number; letter: string }[]; score: number; words: string[] };
    };
    if (!response.ok || !json.success || !json.data) {
      ghostHintPlacements.value = [];
      ghostHintSummary.value = null;
      return;
    }
    ghostHintPlacements.value = json.data.placements;
    const word = json.data.words[0] ?? 'Play';
    ghostHintSummary.value = `${word.toUpperCase()} — ${json.data.score} pts`;
  } catch {
    ghostHintPlacements.value = [];
    ghostHintSummary.value = null;
  }
}

/** Fetch once per purchase/mock — do not watch turnRemainingMs (timer ticks re-fetched hints). */
watch(
  () => bestPlayHint.unlocked.value,
  (unlocked, wasUnlocked) => {
    if (unlocked && !wasUnlocked && isMyTurn.value) {
      void refreshBestPlayGhost();
      return;
    }
    if (!unlocked) {
      ghostHintPlacements.value = [];
      ghostHintSummary.value = null;
    }
  },
);
const dropHoverCell = ref<BoardCellCoord | null>(null);
const exchangeMode = ref(false);
const exchangePick = ref<string[]>([]);

type GridState = {
  board: ({ letter: string; seat: number } | null)[][];
  racks: Record<number, string[]>;
  scores: Record<number, number>;
  bag: string[];
  premiums: (string | null)[][] | null;
};

const state = computed(() => props.match.state as GridState);

const opponentSeat = computed(() => (props.match.yourSeat === 1 ? 2 : 1));

function scoreForSeat(seat: number): number {
  const fromMatch = props.match.scores[seat];
  if (fromMatch != null) {
    return fromMatch;
  }
  const fromState = state.value.scores[seat];
  return fromState ?? 0;
}

function stagedAt(row: number, col: number): string | null {
  return stagedPlacements.value.find((p) => p.row === row && p.col === col)?.letter ?? null;
}

function ghostAt(row: number, col: number): string | null {
  return (
    effectiveGhostPlacements.value.find((p) => p.row === row && p.col === col)?.letter ?? null
  );
}

function clearStaging(): void {
  stagedPlacements.value = [];
  exchangePick.value = [];
  exchangeMode.value = false;
}

watch(
  () => props.match.currentSeat,
  () => {
    clearStaging();
    dismissBestPlayHint();
    error.value = null;
  },
);

watch(
  () => props.match.status,
  (status) => {
    if (status === 'finished') {
      clearStaging();
      void refreshHeadToHead();
      emit('finished');
    }
  },
);

watch(
  [isHumanMatch, opponentUserId, () => props.match.matchId],
  () => {
    void refreshHeadToHead();
  },
  { immediate: true },
);

function canDropAtCell(row: number, col: number): boolean {
  if (!isMyTurn.value || busy.value || exchangeMode.value) {
    return false;
  }
  return state.value.board[row]?.[col] == null;
}

function onDropTile(
  { row, col }: { row: number; col: number },
  drag: TileDragPayload,
): void {
  if (!isMyTurn.value || exchangeMode.value) {
    return;
  }
  if (state.value.board[row][col] != null) {
    return;
  }
  const atTarget = stagedPlacements.value.find((p) => p.row === row && p.col === col);
  if (drag.kind === 'staged') {
    const existing = stagedPlacements.value.find((p) => p.row === drag.row && p.col === drag.col);
    if (!existing) {
      return;
    }
    if (existing.row === row && existing.col === col) {
      return;
    }
    if (atTarget) {
      stagedPlacements.value = stagedPlacements.value.map((p) => {
        if (p.row === drag.row && p.col === drag.col) {
          return { row, col, letter: p.letter, rackIndex: p.rackIndex };
        }
        if (p.row === row && p.col === col) {
          return { row: drag.row, col: drag.col, letter: p.letter, rackIndex: p.rackIndex };
        }
        return p;
      });
      return;
    }
    stagedPlacements.value = [
      ...stagedPlacements.value.filter((p) => !(p.row === drag.row && p.col === drag.col)),
      { row, col, letter: existing.letter, rackIndex: existing.rackIndex },
    ];
    return;
  }
  const used = new Set(stagedPlacements.value.map((p) => p.rackIndex));
  if (used.has(drag.rackIndex)) {
    return;
  }
  const withoutTarget = atTarget
    ? stagedPlacements.value.filter((p) => !(p.row === row && p.col === col))
    : stagedPlacements.value;
  stagedPlacements.value = [
    ...withoutTarget,
    { row, col, letter: drag.letter, rackIndex: drag.rackIndex },
  ];
}

function recall(row: number, col: number): void {
  stagedPlacements.value = stagedPlacements.value.filter((p) => !(p.row === row && p.col === col));
}

function buildPlacements(): { row: number; col: number; letter: string }[] {
  return stagedPlacements.value.map(({ row, col, letter }) => ({ row, col, letter }));
}

async function submitPlay(): Promise<void> {
  const placements = buildPlacements();
  if (placements.length === 0) {
    error.value = 'Place tiles on the board first';
    return;
  }
  busy.value = true;
  error.value = null;
  dismissBestPlayHint();
  try {
    await props.onMove({ type: 'place', placements });
    clearStaging();
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Move failed';
  } finally {
    busy.value = false;
  }
}

async function pass(): Promise<void> {
  busy.value = true;
  error.value = null;
  dismissBestPlayHint();
  try {
    await props.onMove({ type: 'pass' });
    clearStaging();
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Pass failed';
  } finally {
    busy.value = false;
  }
}

async function resign(): Promise<void> {
  busy.value = true;
  error.value = null;
  try {
    await props.onMove({ type: 'resign' });
    clearStaging();
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Resign failed';
  } finally {
    busy.value = false;
  }
}

function toggleExchangeLetter(letter: string): void {
  if (!exchangeMode.value) {
    return;
  }
  const rack = state.value.racks[props.match.yourSeat] ?? [];
  const pick = [...exchangePick.value];
  const idx = pick.indexOf(letter);
  if (idx >= 0) {
    pick.splice(idx, 1);
  } else if (pick.length < rack.length) {
    pick.push(letter);
  }
  exchangePick.value = pick;
}

async function submitExchange(): Promise<void> {
  if (exchangePick.value.length === 0) {
    return;
  }
  busy.value = true;
  error.value = null;
  dismissBestPlayHint();
  try {
    await props.onMove({ type: 'exchange', letters: exchangePick.value });
    clearStaging();
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Exchange failed';
  } finally {
    busy.value = false;
  }
}

const rackLetters = computed(() => {
  const rack = state.value.racks[props.match.yourSeat] ?? [];
  const used = new Set(stagedPlacements.value.map((p) => p.rackIndex));
  return rack
    .map((letter, index) => ({ letter, index }))
    .filter((item) => !used.has(item.index));
});

watch(
  () => props.match.turnRemainingMs,
  (ms) => {
    if (ms <= 0 && isMyTurn.value) {
      void pass();
    }
  },
);
</script>

<template>
  <DnDProvider>
    <template #preview>
      <TileDragPreview />
    </template>
    <div
      class="tw-word-grid-game"
      :class="{ 'tw-word-grid-game--vs-ai': isAiMatch }"
      :id="generateUniqueId('tile-word-grid')"
    >
      <header class="tw-word-grid-hud" :id="generateUniqueId('twg-hud')">
        <div class="tw-word-grid-hud__start">
          <TurnTimerHud :turn-remaining-ms="match.turnRemainingMs" />
        </div>
        <div class="tw-word-grid-hud__center text-sm text-lab-general-text">
          <span class="font-medium">You: {{ scoreForSeat(match.yourSeat) }}</span>
          <span class="text-lab-general-text-muted mx-1.5" aria-hidden="true">·</span>
          <span class="font-medium">{{ opponentDisplayName }}: {{ scoreForSeat(opponentSeat) }}</span>
        </div>
        <div class="tw-word-grid-hud__end text-sm text-lab-general-text-muted">
          <span>Bag: {{ state.bag?.length ?? 0 }}</span>
          <span v-if="match.status === 'finished'" class="tw-word-grid-status tw-word-grid-status--done">
            Match over
          </span>
          <span v-else-if="!isMyTurn" class="tw-word-grid-status">
            {{ opponentDisplayName }}'s turn
          </span>
        </div>
      </header>

      <HumanMatchSeriesBar
        v-if="isHumanMatch"
        :opponent-display-name="opponentDisplayName"
        :stats="h2hStats"
        :loading="h2hLoading"
      />

      <GameBoardRow :show-aside="isMatchGame" class="tw-word-grid-board-row">
        <div class="tw-word-grid-board-shell">
          <TileBoardDropLayer
            :board-id="generateUniqueId('twg-board')"
            :enabled="isMyTurn && !busy && !exchangeMode"
            :can-drop-at="canDropAtCell"
            v-model:drop-hover="dropHoverCell"
            @drop="onDropTile"
          >
            <template v-for="(r, ri) in state.board" :key="ri">
              <TileBoardCell
                v-for="(cell, ci) in r"
                :key="`${ri}-${ci}`"
                :row="ri"
                :col="ci"
                :letter="cell?.letter ?? null"
                :premium="tileWordGridPremiumAt(ri, ci)"
                :staged-letter="stagedAt(ri, ci)"
                :ghost-letter="ghostAt(ri, ci)"
                :interactable="isMyTurn && !busy"
                :drop-hover="dropHoverCell?.row === ri && dropHoverCell?.col === ci"
                @recall="recall"
              />
            </template>
          </TileBoardDropLayer>
        </div>
        <template v-if="isMatchGame" #aside>
          <div class="flex flex-col gap-3 min-h-0 flex-1">
            <LabGameHintAsideControls
              v-if="match.status === 'active'"
              :sku-label="bestPlayAside.skuLabel"
              :cost-quarks="bestPlayAside.costQuarks"
              :unlocked="bestPlayAside.unlocked"
              :loading="bestPlayAside.loading"
              :disabled="!isAuthenticated || !serverUrlRef || !isMyTurn"
              :dev-mock-enabled="bestPlayAside.devMockEnabled"
              @purchase="
                async () => {
                  const ok = await bestPlayHint.purchaseHint();
                  if (ok) {
                    await refreshBestPlayGhost();
                  }
                }
              "
              @mock-purchase="
                () => {
                  bestPlayHint.mockPurchaseHint();
                  void refreshBestPlayGhost();
                }
              "
            />
            <p
              v-if="ghostHintSummary && bestPlayHint.showOverlay"
              class="tw-best-play-summary m-0 text-sm font-semibold"
              :id="generateUniqueId('twg-ghost-summary')"
            >
              Suggested play: {{ ghostHintSummary }}
            </p>
            <PlayerTurnsPanel
              class="min-h-0 flex-1"
              :turns="props.playerTurns ?? []"
              :live-turn="props.livePlayerTurn"
              :waiting-for-opponent="props.waitingForOpponent ?? false"
              :resolving-move="props.agentResolvingMove ?? false"
            />
          </div>
        </template>
      </GameBoardRow>

      <section class="tw-word-grid-controls" :id="generateUniqueId('twg-controls')">
        <div class="tw-word-grid-rack">
          <span class="tw-word-grid-rack__label">Rack</span>
          <div class="tw-word-grid-rack__tiles">
            <template v-if="!exchangeMode">
              <TileRackLetter
                v-for="item in rackLetters"
                :key="`${item.letter}-${item.index}`"
                :letter="item.letter"
                :rack-index="item.index"
                :score="TILE_LETTER_SCORES[item.letter] ?? 0"
                :disabled="!isMyTurn || busy"
              />
            </template>
            <button
              v-for="(letter, i) in exchangeMode ? (state.racks[match.yourSeat] ?? []) : []"
              :key="`ex-${i}-${letter}`"
              type="button"
              class="tw-rack-tile tw-word-grid-exchange-tile"
              :class="exchangePick.includes(letter) ? 'tw-word-grid-exchange-tile--picked' : ''"
              :id="generateUniqueId(`twg-ex-${i}`)"
              @click="toggleExchangeLetter(letter)"
            >
              {{ letter }}
            </button>
          </div>
        </div>

        <div class="tw-word-grid-actions">
          <Button
            label="Play word"
            size="small"
            :disabled="!isMyTurn || busy || exchangeMode"
            :pt="{ root: { attrs: { id: generateUniqueId('twg-play') } } }"
            @click="submitPlay"
          />
          <Button
            label="Recall"
            size="small"
            severity="secondary"
            :disabled="!isMyTurn || busy || stagedPlacements.length === 0"
            :pt="{ root: { attrs: { id: generateUniqueId('twg-recall') } } }"
            @click="clearStaging"
          />
          <Button
            label="Pass"
            size="small"
            severity="secondary"
            :disabled="!isMyTurn || busy || exchangeMode"
            :pt="{ root: { attrs: { id: generateUniqueId('twg-pass') } } }"
            @click="pass"
          />
          <Button
            :label="exchangeMode ? 'Confirm exchange' : 'Exchange'"
            size="small"
            severity="secondary"
            :disabled="!isMyTurn || busy || (state.bag?.length ?? 0) < 7"
            :pt="{ root: { attrs: { id: generateUniqueId('twg-exchange') } } }"
            @click="exchangeMode ? submitExchange() : (exchangeMode = true)"
          />
          <Button
            label="Resign"
            size="small"
            severity="danger"
            :disabled="!isMyTurn || busy"
            :pt="{ root: { attrs: { id: generateUniqueId('twg-resign') } } }"
            @click="resign"
          />
        </div>
        <p v-if="error" class="tw-word-grid-error">{{ error }}</p>
      </section>
    </div>
  </DnDProvider>
</template>

<style scoped>
.tw-best-play-summary {
  padding: 0.5rem 0.65rem;
  border-radius: 4px;
  color: var(--lab-general-text);
  border: 1px solid color-mix(in srgb, var(--lab-section-accent, var(--lab-button-border-hover)) 55%, var(--lab-general-border));
  background: color-mix(in srgb, var(--lab-section-accent, var(--lab-button-border-hover)) 12%, var(--lab-general-bg));
}

.tw-word-grid-game {
  /* Tile letters must use content/general text — prime-surface-950 is inverted on light presets. */
  --tw-tile-ink: var(--lab-prime-content-primary, var(--lab-general-text));
  --tw-tile-ink-muted: var(--lab-general-text-muted);
  --tw-tile-face: color-mix(
    in srgb,
    var(--lab-form-control-bg, var(--lab-prime-surface-100)) 35%,
    var(--lab-prime-surface-200) 65%
  );
  --tw-tile-face-border: color-mix(in srgb, var(--lab-general-text) 22%, var(--lab-general-border));
  --tw-board-size: min(72vmin, 42rem);
  --twg-board-bg: color-mix(in srgb, var(--lab-prime-surface-300) 32%, var(--lab-general-bg-muted));
  --twg-board-border: color-mix(in srgb, var(--lab-general-border) 80%, var(--lab-prime-surface-400));
  width: 100%;
  max-width: 100%;
  margin-inline: 0;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 1rem;
  padding: 0.25rem 0.5rem 1rem;
  box-sizing: border-box;
}

/* Board + thinking panel share a row — keep the grid smaller than solo layout */
.tw-word-grid-game--vs-ai {
  --tw-board-size: min(32rem, min(46vmin, 38vw));
  /* Board square + padding + border — caps thinking panel height */
  --tw-board-block-height: calc(var(--tw-board-size) + 1rem + 4px);
}

.tw-word-grid-game--vs-ai .tw-word-grid-hud {
  max-width: 100%;
}

@media (max-width: 52rem) {
  .tw-word-grid-game--vs-ai {
    --tw-board-size: min(72vmin, 42rem);
    --tw-board-block-height: calc(var(--tw-board-size) + 1rem + 4px);
  }
}

.tw-word-grid-hud {
  width: 100%;
  max-width: var(--tw-board-size);
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0.75rem;
  border-radius: 0.375rem;
  border: 1px solid color-mix(in srgb, var(--lab-general-border) 55%, transparent);
  background: color-mix(in srgb, var(--lab-general-bg-muted) 35%, var(--lab-general-bg));
}

.tw-word-grid-hud__start {
  justify-self: start;
  min-width: 0;
}

.tw-word-grid-hud__center {
  justify-self: center;
  text-align: center;
  white-space: nowrap;
}

.tw-word-grid-hud__end {
  justify-self: end;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.125rem;
  min-width: 0;
  text-align: right;
}

.tw-word-grid-status {
  color: var(--lab-general-text-muted);
  font-size: 0.75rem;
}

.tw-word-grid-status--done {
  color: color-mix(in srgb, var(--lab-accent-primary) 75%, var(--lab-general-text));
}

.tw-word-grid-board-row {
  width: 100%;
}

.tw-word-grid-board-row :deep(.tw-game-board-row) {
  align-items: flex-start;
}

.tw-word-grid-board-row :deep(.tw-game-board-row__main) {
  width: var(--tw-board-size);
  max-width: 100%;
  flex: 0 0 auto;
}

.tw-word-grid-game--vs-ai .tw-word-grid-board-row :deep(.tw-game-board-row__aside) {
  height: var(--tw-board-block-height);
  max-height: var(--tw-board-block-height);
  overflow: hidden;
  align-self: flex-start;
  min-height: 0;
}

.tw-word-grid-board-shell {
  width: 100%;
  max-width: var(--tw-board-size);
  display: flex;
  justify-content: flex-start;
}

.tw-word-grid-board {
  width: 100%;
  aspect-ratio: 1;
  display: grid;
  grid-template-columns: repeat(15, minmax(0, 1fr));
  grid-template-rows: repeat(15, minmax(0, 1fr));
  gap: 2px;
  padding: 0.5rem;
  border-radius: 0.5rem;
  border: 2px solid var(--twg-board-border);
  background: var(--twg-board-bg);
  box-shadow:
    0 4px 24px color-mix(in srgb, var(--lab-general-border) 30%, transparent),
    inset 0 0 0 1px color-mix(in srgb, var(--lab-prime-surface-50) 25%, transparent);
}

.tw-word-grid-controls {
  width: 100%;
  max-width: var(--tw-board-size);
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 0.75rem;
}

.tw-word-grid-rack {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 0.65rem 0.75rem;
  border-radius: 0.375rem;
  border: 1px solid color-mix(in srgb, var(--lab-general-border) 45%, transparent);
  background: color-mix(in srgb, var(--lab-general-bg-muted) 25%, var(--lab-general-bg));
}

.tw-word-grid-rack__label {
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--lab-general-text-muted);
}

.tw-word-grid-rack__tiles {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-start;
  gap: 0.35rem;
}

.tw-word-grid-exchange-tile {
  width: 2.65rem;
  height: 2.65rem;
  border-radius: 0.25rem;
  border: 1px solid var(--lab-general-border);
  background: var(--lab-general-bg);
  font-size: 0.875rem;
  font-weight: 700;
  color: var(--lab-general-text);
  cursor: pointer;
}

.tw-word-grid-exchange-tile--picked {
  border-color: color-mix(in srgb, var(--lab-accent-primary) 60%, var(--lab-general-border));
  background: color-mix(in srgb, var(--lab-accent-primary) 12%, var(--lab-general-bg));
}

.tw-word-grid-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-start;
  gap: 0.5rem;
}

.tw-word-grid-error {
  margin: 0;
  text-align: center;
  font-size: 0.875rem;
  color: color-mix(in srgb, var(--lab-accent-danger, #f87171) 90%, var(--lab-general-text));
}

@media (max-width: 40rem) {
  .tw-word-grid-hud {
    grid-template-columns: 1fr;
    text-align: center;
  }

  .tw-word-grid-hud__start,
  .tw-word-grid-hud__center,
  .tw-word-grid-hud__end {
    justify-self: center;
    align-items: center;
    text-align: center;
  }

  .tw-word-grid-hud__end {
    flex-direction: row;
    flex-wrap: wrap;
    justify-content: center;
    gap: 0.5rem;
  }
}
</style>
