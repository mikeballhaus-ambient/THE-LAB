<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { DnDProvider, DragPreview } from '@vue-dnd-kit/core';
import Button from 'primevue/button';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import { useKlondike } from './useKlondike';
import KlondikeCard from './KlondikeCard.vue';
import KlondikeDropZone from './KlondikeDropZone.vue';
import '@/shared/game-platform/game-board.css';
import type { Card } from './useKlondike';
import type { KlondikeDragSource, KlondikeDropTarget } from './klondike-dnd';
import { useCatalogMatchGameHint } from '@/shared/game-platform/composables/useCatalogMatchGameHint';
import { useLabGameHintAsideProps } from '@/shared/game-platform/composables/useLabGameHintAsideProps';
import { LAB_GAME_HINT_SKU_ONE_MOVE } from '@/shared/game-platform/lab-game-hints';
import GameBoardRow from '@/shared/game-platform/ui/GameBoardRow.vue';
import { LabGameHintAsideControls } from '@/shared/game-platform/ui';
import { SOLITAIRE_APP_ID } from '../../../shared/types';
import { KLONDIKE_FOUNDATION_PLACEHOLDERS } from './klondike-foundation-layout';
import { describeKlondikeOneMoveHint, findKlondikeOneMove } from './klondike-one-move-hint';

const props = defineProps<{
  serverUrl?: string;
}>();

const emit = defineEmits<{
  won: [payload: { elapsedMs: number; moves: number }];
}>();

const { generateUniqueId } = useUniqueElementId();
const game = useKlondike();

const appServerUrl = computed(() => (props.serverUrl ?? '').replace(/\/$/, ''));

const oneMoveHint = useCatalogMatchGameHint({
  hostAppId: SOLITAIRE_APP_ID,
  skuId: LAB_GAME_HINT_SKU_ONE_MOVE,
  serverUrl: appServerUrl,
  match: computed(() => null),
  buildTurnKey: () => `${game.moves.value}:${game.stock.value.length}:${game.waste.value.length}`,
});

const oneMoveAside = useLabGameHintAsideProps(oneMoveHint);

const klondikeSnapshot = computed(() => ({
  stock: game.stock.value,
  waste: game.waste.value,
  foundations: game.foundations.value,
  tableau: game.tableau.value,
}));

const quarksOneMove = computed(() => {
  if (!oneMoveHint.showOverlay.value || game.won.value) {
    return null;
  }
  return findKlondikeOneMove(klondikeSnapshot.value);
});

const quarksHintAsideLine = computed(() =>
  describeKlondikeOneMoveHint(quarksOneMove.value, klondikeSnapshot.value),
);

function consumeOneMoveHint(): void {
  oneMoveHint.consumeUnlock();
}

const TABLEAU_STACK_OFFSET = '-3.85rem';
const tableauDragLift = ref<{ col: number; fromIndex: number } | null>(null);

const liftedTableauStack = computed((): Card[] => {
  const lift = tableauDragLift.value;
  if (!lift) {
    return [];
  }
  return game.getTableauStack(lift.col, lift.fromIndex);
});

function isTableauCardLifted(col: number, cardIdx: number): boolean {
  const lift = tableauDragLift.value;
  if (!lift || lift.col !== col) {
    return false;
  }
  return cardIdx >= lift.fromIndex;
}

function onCardDragStart(source: KlondikeDragSource): void {
  if (source.kind === 'tableau') {
    tableauDragLift.value = { col: source.col, fromIndex: source.fromIndex };
  } else {
    tableauDragLift.value = null;
  }
}

function onCardDragEnd(): void {
  tableauDragLift.value = null;
}

let tick: ReturnType<typeof setInterval> | null = null;
onMounted(() => {
  tick = setInterval(() => game.pokeClock(), 1000);
});
onUnmounted(() => {
  if (tick) {
    clearInterval(tick);
    tick = null;
  }
});

function onDrop(target: KlondikeDropTarget, source: KlondikeDragSource): void {
  if (game.applyDrop(source, target)) {
    consumeOneMoveHint();
  }
}

function onCardDblClick(source: KlondikeDragSource): void {
  if (game.autoToFoundation(source)) {
    consumeOneMoveHint();
  }
}

function onDrawStock(): void {
  game.drawStock();
  consumeOneMoveHint();
}

function foundationHintTo(index: number): boolean {
  const hint = quarksOneMove.value;
  return (
    hint?.kind === 'move' &&
    hint.target.kind === 'foundation' &&
    hint.target.index === index
  );
}

function tableauHintTo(col: number): boolean {
  const hint = quarksOneMove.value;
  return hint?.kind === 'move' && hint.target.kind === 'tableau' && hint.target.col === col;
}

function tableauCardHintFrom(col: number, cardIdx: number): boolean {
  const hint = quarksOneMove.value;
  return (
    hint?.kind === 'move' &&
    hint.source.kind === 'tableau' &&
    hint.source.col === col &&
    hint.source.fromIndex === cardIdx
  );
}

function wasteHintFrom(): boolean {
  const hint = quarksOneMove.value;
  return hint?.kind === 'move' && hint.source.kind === 'waste';
}

watch(
  game.won,
  (isWon) => {
    if (isWon) {
      emit('won', { elapsedMs: game.elapsedMs(), moves: game.moves.value });
    }
  },
);
</script>

<template>
  <DnDProvider>
    <template #preview>
      <DragPreview v-slot="{ draggingMap }">
        <div
          v-if="liftedTableauStack.length > 0"
          class="tw-klondike-stack-preview"
          aria-hidden="true"
        >
          <div
            v-for="(card, stackIdx) in liftedTableauStack"
            :key="card.id"
            class="relative"
            :style="{
              marginTop: stackIdx === 0 ? '0' : TABLEAU_STACK_OFFSET,
              zIndex: stackIdx + 1,
            }"
          >
            <KlondikeCard :card="card" :draggable="false" />
          </div>
        </div>
        <template v-else>
          <div
            v-for="[node, draggable] in draggingMap"
            :key="String(node?.id ?? node)"
            class="tw-klondike-single-preview"
            v-html="draggable.initialOuterHTML"
            :style="{
              width: `${draggable.initialRect.width}px`,
              height: `${draggable.initialRect.height}px`,
            }"
          />
        </template>
      </DragPreview>
    </template>

    <div
      class="tw-klondike-game flex flex-col items-stretch w-full min-w-0 max-w-6xl"
      :id="generateUniqueId('klondike-root')"
    >
      <GameBoardRow show-aside class="tw-klondike-board-row w-full min-w-0 items-stretch">
        <div class="tw-klondike-main-col flex min-w-0 w-full flex-col gap-4">
          <section
            class="lab-form-section tw-klondike-toolbar w-full min-w-0"
            :id="generateUniqueId('klondike-toolbar-section')"
          >
            <div class="flex flex-wrap items-center justify-between gap-3 w-full">
              <div class="flex flex-wrap items-center gap-2">
                <Button
                  label="Draw"
                  icon="pi pi-sync"
                  size="small"
                  :pt="{ root: { attrs: { id: generateUniqueId('klondike-draw') } } }"
                  @click="onDrawStock"
                />
                <Button
                  label="Redeal"
                  icon="pi pi-replay"
                  size="small"
                  severity="secondary"
                  outlined
                  :disabled="game.stock.value.length > 0"
                  :pt="{ root: { attrs: { id: generateUniqueId('klondike-redeal') } } }"
                  @click="game.drawStock()"
                />
              </div>
              <div
                class="tw-klondike-stats flex flex-wrap gap-x-4 gap-y-1 text-sm"
                :id="generateUniqueId('klondike-stats')"
              >
                <span><span class="tw-klondike-stats__label">Time</span> {{ game.formattedTime }}</span>
                <span><span class="tw-klondike-stats__label">Moves</span> {{ game.moves.value }}</span>
              </div>
            </div>
          </section>

          <section
            class="lab-form-section tw-klondike-table w-full min-w-0"
            :id="generateUniqueId('klondike-table-section')"
          >
          <h4 class="lab-form-section__title" :id="generateUniqueId('klondike-table-title')">
            <span class="lab-form-section__icon"><i class="pi pi-th-large" aria-hidden="true" /></span>
            Table
          </h4>
          <p class="lab-form-section__lead">
            Draw from the stock, build foundations ace to king, and stack alternating colors on the tableau.
            Double-click a card to send it toward a foundation when allowed.
          </p>

          <div class="tw-klondike-table__felt flex flex-col gap-5 w-full min-w-0">
          <div class="flex flex-wrap items-start justify-between gap-4">
            <div class="flex flex-wrap items-start gap-3">
              <button
                type="button"
                class="tw-klondike-stock-pile lab-game-cell"
                :class="{
                  'tw-klondike-stock-pile--empty': game.stock.value.length === 0,
                  'lab-game-cell--quarks-hint': quarksOneMove?.kind === 'stock',
                }"
                :id="generateUniqueId('klondike-stock')"
                :aria-label="game.stock.value.length ? `Stock, ${game.stock.value.length} cards` : 'Redeal waste into stock'"
              @click="onDrawStock"
            >
                <span class="tw-klondike-stock-pile__back" aria-hidden="true" />
                <span v-if="game.stock.value.length" class="tw-klondike-stock-pile__count">
                  {{ game.stock.value.length }}
                </span>
                <span v-else class="tw-klondike-stock-pile__label">Redeal</span>
              </button>
              <div class="tw-klondike-waste-slot">
                <KlondikeCard
                  v-if="game.waste.value[game.waste.value.length - 1]"
                  :card="game.waste.value[game.waste.value.length - 1]"
                  :quarks-hint-from="wasteHintFrom()"
                  :drag-source="{ kind: 'waste' }"
                  :draggable="game.canDragSource({ kind: 'waste' })"
                  @dblclick="onCardDblClick({ kind: 'waste' })"
                  @drag-start="onCardDragStart"
                  @drag-end="onCardDragEnd"
                />
                <div v-else class="tw-klondike-waste-slot__empty" aria-hidden="true" />
              </div>
            </div>

            <div class="flex flex-wrap gap-2 sm:gap-3">
              <KlondikeDropZone
                v-for="(pile, idx) in game.foundations.value"
                :key="`f-${idx}`"
                :target="{ kind: 'foundation', index: idx }"
                :quarks-hint-to="foundationHintTo(idx)"
                :empty="pile.length === 0"
                :placeholder="KLONDIKE_FOUNDATION_PLACEHOLDERS[idx]"
                @drop="onDrop"
              >
                <KlondikeCard
                  v-if="pile[pile.length - 1]"
                  :card="pile[pile.length - 1]"
                  :draggable="false"
                />
              </KlondikeDropZone>
            </div>
          </div>

          <div class="tw-klondike-tableau">
            <KlondikeDropZone
              v-for="(col, cIdx) in game.tableau.value"
              :key="`t-${cIdx}`"
              :target="{ kind: 'tableau', col: cIdx }"
              :quarks-hint-to="tableauHintTo(cIdx)"
              :empty="col.length === 0"
              class="tw-klondike-tableau__col flex flex-col"
              @drop="onDrop"
            >
              <div
                v-for="(card, cardIdx) in col"
                :key="card.id"
                class="relative"
                :style="{
                  marginTop: cardIdx === 0 ? '0' : TABLEAU_STACK_OFFSET,
                  zIndex: cardIdx + 1,
                }"
              >
                <KlondikeCard
                  :card="card"
                  :stack-z-index="cardIdx + 1"
                  :quarks-hint-from="tableauCardHintFrom(cIdx, cardIdx)"
                  :lifted-hidden="isTableauCardLifted(cIdx, cardIdx)"
                  :drag-source="{ kind: 'tableau', col: cIdx, fromIndex: cardIdx }"
                  :draggable="
                    card.faceUp &&
                    game.canDragSource({ kind: 'tableau', col: cIdx, fromIndex: cardIdx })
                  "
                  @dblclick="onCardDblClick({ kind: 'tableau', col: cIdx, fromIndex: cardIdx })"
                  @drag-start="onCardDragStart"
                  @drag-end="onCardDragEnd"
                />
              </div>
            </KlondikeDropZone>
          </div>
        </div>
          </section>
        </div>
        <template #aside>
          <div class="flex min-w-0 w-full flex-col gap-2">
            <LabGameHintAsideControls
              :sku-label="oneMoveAside.skuLabel"
              :cost-quarks="oneMoveAside.costQuarks"
              :unlocked="oneMoveAside.unlocked"
              :loading="oneMoveAside.loading"
              :disabled="!appServerUrl"
              :dev-mock-enabled="oneMoveAside.devMockEnabled"
              class="tw-klondike-hint-aside shrink-0"
              @purchase="() => void oneMoveHint.purchaseHint()"
              @mock-purchase="oneMoveHint.mockPurchaseHint"
            />
            <p
              v-if="oneMoveHint.showOverlay && quarksHintAsideLine"
              class="m-0 text-xs font-semibold leading-snug text-lab-general-text"
              :id="generateUniqueId('klondike-quarks-hint-line')"
            >
              {{ quarksHintAsideLine }}
            </p>
          </div>
        </template>
      </GameBoardRow>
    </div>
  </DnDProvider>
</template>

<style scoped>
.tw-klondike-board-row :deep(.tw-game-board-row__aside) {
  min-width: min(100%, 14rem);
  align-self: stretch;
}

.tw-klondike-hint-aside {
  width: 100%;
}

.tw-klondike-toolbar {
  padding-bottom: 1rem;
}

.tw-klondike-stats {
  font-variant-numeric: tabular-nums;
  color: var(--lab-general-text);
  font-weight: 600;
}

.tw-klondike-stats__label {
  font-weight: 500;
  color: var(--lab-general-text-muted);
  margin-right: 0.35rem;
}

.tw-klondike-table__felt {
  margin-top: 0.5rem;
  padding: 1rem;
  border-radius: 0.65rem;
  background: color-mix(in srgb, var(--lab-general-bg-subtle, var(--lab-general-bg)) 88%, var(--lab-accent-primary));
  border: 1px solid color-mix(in srgb, var(--lab-general-border) 80%, transparent);
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.04);
}

.tw-klondike-tableau {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: clamp(0.2rem, 1.2vw, 0.55rem);
  width: 100%;
  align-items: stretch;
}

.tw-klondike-tableau__col {
  width: 100%;
  max-width: 4.5rem;
  justify-self: center;
  align-self: stretch;
  min-width: 0;
}

.tw-klondike-stock-pile {
  position: relative;
  width: 4.5rem;
  height: 6.25rem;
  border-radius: 0.45rem;
  border: 1px solid color-mix(in srgb, var(--lab-general-border) 90%, var(--lab-prime-surface-950));
  background: linear-gradient(
    145deg,
    color-mix(in srgb, var(--lab-button-bg) 70%, var(--lab-prime-surface-800)),
    color-mix(in srgb, var(--lab-prime-surface-900) 55%, var(--lab-general-bg))
  );
  box-shadow:
    inset 0 0 0 1px color-mix(in srgb, var(--lab-accent-primary) 25%, var(--lab-card-border)),
    0 2px 6px rgb(0 0 0 / 0.25);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  transition:
    border-color 0.12s ease,
    box-shadow 0.12s ease,
    transform 0.12s ease;
}

.tw-klondike-stock-pile::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 0.45rem;
  border: 1px solid color-mix(in srgb, var(--lab-general-border) 55%, transparent);
  background: linear-gradient(
    145deg,
    color-mix(in srgb, var(--lab-button-bg) 70%, var(--lab-prime-surface-800)),
    color-mix(in srgb, var(--lab-prime-surface-900) 55%, var(--lab-general-bg))
  );
  transform: translate(3px, 3px);
  z-index: 0;
  opacity: 0.85;
  pointer-events: none;
}

.tw-klondike-stock-pile:not(.tw-klondike-stock-pile--empty)::before {
  display: block;
}

.tw-klondike-stock-pile--empty::before {
  display: none;
}

.tw-klondike-stock-pile__back {
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
  pointer-events: none;
  z-index: 1;
}

.tw-klondike-stock-pile:hover {
  border-color: color-mix(in srgb, var(--lab-accent-primary) 45%, var(--lab-general-border));
  box-shadow:
    inset 0 0 0 1px color-mix(in srgb, var(--lab-accent-primary) 35%, var(--lab-card-border)),
    0 3px 10px rgb(0 0 0 / 0.28);
}

.tw-klondike-stock-pile:active {
  transform: translateY(1px);
}

.tw-klondike-stock-pile__count {
  position: relative;
  z-index: 2;
  font-size: 0.95rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: #f8fafc;
  text-shadow:
    0 1px 2px rgb(0 0 0 / 0.75),
    0 0 8px rgb(0 0 0 / 0.35);
}

.tw-klondike-stock-pile__label {
  position: relative;
  z-index: 2;
  font-size: 0.72rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--lab-general-text-muted);
}

.tw-klondike-waste-slot {
  width: 4.5rem;
  min-height: 6.25rem;
}

.tw-klondike-waste-slot__empty {
  width: 4.5rem;
  height: 6.25rem;
  border-radius: 0.45rem;
  border: 1px solid color-mix(in srgb, var(--lab-general-border) 55%, transparent);
  background: color-mix(in srgb, var(--lab-general-bg) 72%, var(--lab-general-border));
  box-shadow: inset 0 2px 10px rgb(0 0 0 / 0.14);
}

.tw-klondike-stack-preview,
.tw-klondike-single-preview {
  filter: drop-shadow(0 10px 24px rgb(0 0 0 / 0.28));
  pointer-events: none;
}
</style>
