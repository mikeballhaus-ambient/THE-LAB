<script setup lang="ts">
import { computed } from 'vue';
import Button from 'primevue/button';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import '@/shared/game-platform/game-board.css';
import HoldemPlayingCard from './HoldemPlayingCard.vue';
import type { HoldemTableAction } from '../types/holdem-table-action';
import type { PokerMove } from '../../back-end/rules';
import {
  formatLabQuarksNumber,
  LAB_QUARKS_CURRENCY,
} from '@/shared/constants/lab-quarks-currency';

export type { HoldemTableAction as PokerAction };

const props = defineProps<{
  holeCards: string[];
  opponentHoleCount: number;
  showOpponentHoles: boolean;
  opponentHoleCards: string[];
  opponentLabel: string;
  boardCards: string[];
  pot: number;
  toCall: number;
  minBet: number;
  minRaiseTo: number;
  legalActions: PokerMove['type'][];
  handLabel?: string;
  handOver?: boolean;
  disabled?: boolean;
  onAction: (action: HoldemTableAction) => void | Promise<void>;
}>();

const { generateUniqueId } = useUniqueElementId();

function hasAction(type: PokerMove['type']): boolean {
  return props.legalActions.includes(type);
}

const canCheck = computed(
  () => !props.disabled && !props.handOver && hasAction('check'),
);
const canCall = computed(
  () => !props.disabled && !props.handOver && hasAction('call'),
);
const canFold = computed(
  () => !props.disabled && !props.handOver && hasAction('fold'),
);
const canBet = computed(
  () => !props.disabled && !props.handOver && hasAction('bet'),
);
const canRaise = computed(
  () => !props.disabled && !props.handOver && hasAction('raise'),
);

const hasAnyAction = computed(
  () => canCheck.value || canCall.value || canFold.value || canBet.value || canRaise.value,
);

const callButtonLabel = computed(() => {
  if (props.toCall <= 0) {
    return 'Call';
  }
  return `Call ${formatLabQuarksNumber(props.toCall)}`;
});

const potLabel = computed(
  () => `${formatLabQuarksNumber(props.pot)} ${LAB_QUARKS_CURRENCY.name}`,
);

const boardSlots = computed(() => {
  const filled = [...props.boardCards];
  while (filled.length < 5) {
    filled.push('');
  }
  return filled;
});

function act(action: HoldemTableAction): void {
  if (props.disabled || props.handOver) {
    return;
  }
  if (!hasAction(action.type)) {
    return;
  }
  void props.onAction(action);
}

function actBet(amount: number): void {
  act({ type: 'bet', amount });
}

function actRaise(toAmount: number): void {
  act({ type: 'raise', amount: toAmount });
}
</script>

<template>
  <div class="holdem-table lab-game-surface">
    <section class="holdem-table__frame lab-form-section" :id="generateUniqueId('pk-table-section')">
      <h4 class="lab-form-section__title" :id="generateUniqueId('pk-table-title')">
        <span class="lab-form-section__icon"><i class="pi pi-objects-column" aria-hidden="true" /></span>
        Table
      </h4>
      <p class="lab-form-section__lead m-0">
        Quarks table: blinds post automatically. Bet, call, check, or fold each street — when betting is
        matched, the house deals the flop, turn, and river. Pot and ledger settle in Quarks.
      </p>

      <div class="holdem-table__felt" :id="generateUniqueId('pk-felt')">
        <div class="holdem-table__row holdem-table__row--opponent">
          <span class="holdem-table__label text-lab-general-text-muted">{{ opponentLabel }}</span>
          <div class="holdem-table__hand">
            <HoldemPlayingCard
              v-for="(code, i) in showOpponentHoles ? opponentHoleCards : []"
              :key="`opp-${i}-${code}`"
              :code="code"
              size="sm"
            />
            <HoldemPlayingCard
              v-for="i in showOpponentHoles ? 0 : opponentHoleCount"
              :key="`opp-back-${i}`"
              face-down
              size="sm"
            />
          </div>
        </div>

        <div class="holdem-table__board-zone" :id="generateUniqueId('pk-board')">
          <span class="holdem-table__label text-lab-general-text-muted">Board</span>
          <div class="holdem-table__board">
            <template v-for="(code, i) in boardSlots" :key="`board-${i}`">
              <HoldemPlayingCard v-if="code" :code="code" size="sm" />
              <div v-else class="holdem-table__board-slot" aria-hidden="true" />
            </template>
          </div>
        </div>

        <p class="holdem-table__pot m-0" :id="generateUniqueId('pk-pot')">
          Pot
          <span class="holdem-table__pot-value">{{ potLabel }}</span>
          <span v-if="toCall > 0" class="holdem-table__to-call text-lab-general-text-muted">
            · call {{ formatLabQuarksNumber(toCall) }}
          </span>
        </p>

        <div class="holdem-table__bottom-row">
          <div class="holdem-table__row holdem-table__row--you holdem-table__bottom-row__hand">
            <span class="holdem-table__label text-lab-general-text-muted">Your hand</span>
            <div class="holdem-table__hand">
              <HoldemPlayingCard
                v-for="(code, i) in props.holeCards"
                :key="`hole-${i}-${code}`"
                :code="code"
              />
            </div>
            <p v-if="props.handLabel" class="holdem-table__rank m-0" :id="generateUniqueId('pk-hand-rank')">
              {{ props.handLabel }}
            </p>
          </div>

          <div
            v-if="hasAnyAction"
            class="holdem-table__controls"
            :id="generateUniqueId('pk-controls')"
          >
            <p class="holdem-table__controls-lead m-0 text-lab-general-text-muted">
              Your action
            </p>
            <div class="holdem-table__actions">
              <div class="holdem-table__action-row">
                <Button
                  v-if="canCall"
                  :label="callButtonLabel"
                  icon="pi pi-wallet"
                  size="small"
                  :pt="{ root: { attrs: { id: generateUniqueId('pk-action-call') } } }"
                  @click="act({ type: 'call' })"
                />
                <Button
                  v-if="canCheck"
                  label="Check"
                  icon="pi pi-check"
                  severity="secondary"
                  size="small"
                  :pt="{ root: { attrs: { id: generateUniqueId('pk-action-check') } } }"
                  @click="act({ type: 'check' })"
                />
                <Button
                  v-if="canBet"
                  :label="`Bet ${formatLabQuarksNumber(minBet)}`"
                  icon="pi pi-wallet"
                  severity="secondary"
                  size="small"
                  :pt="{ root: { attrs: { id: generateUniqueId('pk-action-bet-min') } } }"
                  @click="actBet(minBet)"
                />
                <Button
                  v-if="canBet"
                  :label="`Bet ${formatLabQuarksNumber(minBet * 2)}`"
                  icon="pi pi-wallet"
                  severity="secondary"
                  size="small"
                  :pt="{ root: { attrs: { id: generateUniqueId('pk-action-bet-2x') } } }"
                  @click="actBet(minBet * 2)"
                />
                <Button
                  v-if="canRaise"
                  :label="`Raise to ${formatLabQuarksNumber(minRaiseTo)}`"
                  icon="pi pi-wallet"
                  size="small"
                  :pt="{ root: { attrs: { id: generateUniqueId('pk-action-raise') } } }"
                  @click="actRaise(minRaiseTo)"
                />
                <Button
                  v-if="canFold"
                  label="Fold"
                  icon="pi pi-times"
                  severity="danger"
                  size="small"
                  :pt="{ root: { attrs: { id: generateUniqueId('pk-action-fold') } } }"
                  @click="act({ type: 'fold' })"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <p
        v-if="props.legalActions.length === 0"
        class="text-sm text-lab-general-text-muted m-0 mt-3"
        :id="generateUniqueId('pk-no-actions')"
      >
        No actions available — the hand is over.
      </p>
    </section>
  </div>
</template>

<style scoped>
.holdem-table {
  width: 100%;
  max-width: 42rem;
}

.holdem-table__frame {
  padding: 1rem 1.15rem;
}

.holdem-table__felt {
  margin-top: 1rem;
  padding: 1.25rem 1.15rem;
  border-radius: 0.65rem;
  border: 2px solid color-mix(in srgb, var(--lab-general-border) 85%, transparent);
  background: color-mix(
    in srgb,
    var(--lab-accent-primary, var(--lab-button-border-hover)) 12%,
    var(--lab-general-bg-muted, var(--lab-general-bg))
  );
  box-shadow: inset 0 2px 14px color-mix(in srgb, var(--lab-general-bg) 35%, transparent);
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.holdem-table__row {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}

.holdem-table__label {
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.holdem-table__hand {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.holdem-table__board-zone {
  padding: 0.85rem;
  border-radius: 0.5rem;
  border: 1px dashed color-mix(in srgb, var(--lab-general-border) 75%, transparent);
  background: color-mix(in srgb, var(--lab-general-bg) 55%, transparent);
}

.holdem-table__board :deep(.lab-playing-card) {
  flex-shrink: 0;
}

.holdem-table__board {
  display: flex;
  flex-wrap: nowrap;
  justify-content: center;
  gap: 0.4rem;
  margin-top: 0.5rem;
  min-height: 4.65rem;
  align-items: center;
  overflow-x: auto;
  overscroll-behavior-x: contain;
}

.holdem-table__board-slot {
  width: 3.35rem;
  height: 4.65rem;
  flex-shrink: 0;
  border-radius: 0.45rem;
  border: 1px dashed color-mix(in srgb, var(--lab-general-border) 65%, transparent);
  background: color-mix(in srgb, var(--lab-general-bg) 80%, var(--lab-general-border));
}

.holdem-table__pot {
  font-size: 0.95rem;
  color: var(--lab-general-text-muted);
  text-align: center;
}

.holdem-table__pot-value {
  margin-left: 0.4rem;
  font-weight: 700;
  font-size: 1.15rem;
  color: var(--lab-general-text);
}

.holdem-table__to-call {
  margin-left: 0.4rem;
  font-size: 0.9rem;
  font-weight: 500;
}

.holdem-table__rank {
  font-size: 0.9rem;
  color: var(--lab-general-text-muted);
}

.holdem-table__bottom-row {
  display: flex;
  flex-direction: row;
  align-items: flex-end;
  gap: 0.85rem;
  min-width: 0;
}

.holdem-table__bottom-row__hand {
  flex: 0 1 auto;
  min-width: 0;
}

.holdem-table__controls {
  flex: 1 1 auto;
  min-width: 0;
  max-width: 100%;
  padding: 0.85rem 0.9rem 0.95rem;
  border-radius: 0.55rem;
  border: 1px solid color-mix(in srgb, var(--lab-general-border) 70%, transparent);
  background: color-mix(in srgb, var(--lab-general-bg) 62%, transparent);
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.holdem-table__controls-lead {
  font-size: 0.8rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.holdem-table__actions {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

.holdem-table__action-row {
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  gap: 0.4rem;
  align-items: center;
  overflow-x: auto;
  overscroll-behavior-x: contain;
  padding-bottom: 0.1rem;
}

.holdem-table__controls :deep(.p-button) {
  flex: 0 0 auto;
  white-space: nowrap;
}

@media (max-width: 520px) {
  .holdem-table__bottom-row {
    flex-direction: column;
    align-items: stretch;
  }

  .holdem-table__controls {
    width: 100%;
  }
}
</style>
