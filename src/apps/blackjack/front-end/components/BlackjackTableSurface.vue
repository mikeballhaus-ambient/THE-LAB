<script setup lang="ts">
import { computed } from 'vue';
import Button from 'primevue/button';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import { LabPlayingCard } from '@/shared/game-platform/ui';
import '@/shared/game-platform/game-board.css';
import type { BlackjackMove } from '../../back-end/rules';
import {
  formatLabQuarksNumber,
  LAB_QUARKS_CURRENCY,
} from '@/shared/constants/lab-quarks-currency';

const props = defineProps<{
  playerHandGroups: Array<{ cards: string[]; total: number; active: boolean; label?: string }>;
  opponentHandGroups: Array<{ cards: string[]; total: number; active: boolean; label?: string }>;
  showOpponentRow: boolean;
  opponentLabel: string;
  dealerCards: string[];
  dealerHoleHidden: boolean;
  playerTotal: number;
  dealerDisplayTotal: number;
  bet: number;
  committed: number;
  legalActions: BlackjackMove['type'][];
  handOver?: boolean;
  disabled?: boolean;
  strategyFlashText?: string | null;
  strategyHintAction?: BlackjackMove['type'] | null;
  onAction: (move: BlackjackMove) => void | Promise<void>;
}>();

function hintActionClass(type: BlackjackMove['type']): string {
  return props.strategyHintAction === type ? 'lab-game-quarks-hint-chrome' : '';
}

function hintActionAriaLabel(type: BlackjackMove['type'], label: string): string | undefined {
  return props.strategyHintAction === type ? `${label} — basic strategy recommendation` : undefined;
}

const { generateUniqueId } = useUniqueElementId();

function hasAction(type: BlackjackMove['type']): boolean {
  return props.legalActions.includes(type);
}

const canHit = computed(() => !props.disabled && !props.handOver && hasAction('hit'));
const canStand = computed(() => !props.disabled && !props.handOver && hasAction('stand'));
const canDouble = computed(() => !props.disabled && !props.handOver && hasAction('double'));

const canSplit = computed(() => !props.disabled && !props.handOver && hasAction('split'));

const hasAnyAction = computed(
  () => canHit.value || canStand.value || canDouble.value || canSplit.value,
);

const wagerLabel = computed(
  () =>
    `${formatLabQuarksNumber(props.committed)} ${LAB_QUARKS_CURRENCY.name}`,
);

function dealerCardFaceDown(index: number): boolean {
  return props.dealerHoleHidden && index === 1 && props.dealerCards.length >= 2;
}

function act(move: BlackjackMove): void {
  if (props.disabled || props.handOver || !hasAction(move.type)) {
    return;
  }
  void props.onAction(move);
}
</script>

<template>
  <div class="blackjack-table lab-game-surface">
    <section class="blackjack-table__frame lab-form-section" :id="generateUniqueId('bj-table-section')">
      <h4 class="lab-form-section__title" :id="generateUniqueId('bj-table-title')">
        <span class="lab-form-section__icon"><i class="pi pi-objects-column" aria-hidden="true" /></span>
        Table
      </h4>
      <p class="lab-form-section__lead m-0">
        Tablemate above you, dealer on the right. Wager and actions sit to the right of your hand.
      </p>
      <p
        v-if="props.strategyFlashText"
        class="blackjack-table__strategy-flash m-0 text-sm font-medium"
        role="status"
        :id="generateUniqueId('bj-strategy-flash')"
      >
        {{ props.strategyFlashText }}
      </p>

      <div class="blackjack-table__felt" :id="generateUniqueId('bj-felt')">
        <div class="blackjack-table__arena">
          <div class="blackjack-table__center-column">
            <div
              v-if="showOpponentRow"
              class="blackjack-table__seat blackjack-table__seat--opponent"
              :id="generateUniqueId('bj-opponent-seat')"
            >
              <span class="blackjack-table__label text-lab-general-text-muted">{{ opponentLabel }}</span>
              <div
                class="blackjack-table__opponent-hands"
                :class="{ 'blackjack-table__opponent-hands--split': props.opponentHandGroups.length > 1 }"
              >
                <div
                  v-for="(group, oi) in props.opponentHandGroups"
                  :key="`opp-hand-${oi}`"
                  class="blackjack-table__row blackjack-table__opponent-hand-block"
                  :class="{
                    'blackjack-table__player-hand-stack': props.opponentHandGroups.length > 1,
                    'blackjack-table__row--active-hand': group.active,
                  }"
                >
                  <span
                    v-if="props.opponentHandGroups.length > 1"
                    class="blackjack-table__label text-lab-general-text-muted"
                  >
                    {{ group.label ?? `Hand ${oi + 1}` }}
                  </span>
                  <div class="blackjack-table__hand">
                    <LabPlayingCard
                      v-for="(code, i) in group.cards"
                      :key="`opp-${oi}-${i}-${code}`"
                      :code="code"
                      size="sm"
                    />
                  </div>
                  <p class="blackjack-table__total m-0">Total {{ group.total }}</p>
                </div>
              </div>
            </div>

            <div
              class="blackjack-table__player-stack"
              :class="{ 'blackjack-table__player-stack--below-opponent': showOpponentRow }"
            >
              <div
                class="blackjack-table__seat blackjack-table__seat--player"
                :id="generateUniqueId('bj-player-seat')"
              >
                <div class="blackjack-table__player-row">
                <div class="blackjack-table__player-hands">
                  <div
                    v-for="(group, gi) in props.playerHandGroups"
                    :key="`player-hand-${gi}`"
                    class="blackjack-table__row blackjack-table__player-hand-block"
                    :class="{
                      'blackjack-table__player-hand-stack': props.playerHandGroups.length > 1,
                      'blackjack-table__player-hand-stack--active':
                        props.playerHandGroups.length > 1 && group.active,
                    }"
                  >
                    <span class="blackjack-table__label text-lab-general-text-muted">
                      {{ group.label ?? (props.playerHandGroups.length > 1 ? `Hand ${gi + 1}` : 'Your hand') }}
                    </span>
                    <div class="blackjack-table__hand">
                      <LabPlayingCard
                        v-for="(code, i) in group.cards"
                        :key="`player-${gi}-${i}-${code}`"
                        :code="code"
                      />
                    </div>
                    <p class="blackjack-table__total m-0">Total {{ group.total }}</p>
                  </div>
                </div>
                <div class="blackjack-table__player-side">
                  <p class="blackjack-table__wager m-0" :id="generateUniqueId('bj-wager')">
                    Your wager
                    <span class="blackjack-table__wager-value">{{ wagerLabel }}</span>
                  </p>
                  <div
                    v-if="hasAnyAction"
                    class="blackjack-table__controls"
                    :id="generateUniqueId('bj-controls')"
                  >
                    <p class="blackjack-table__controls-lead m-0 text-lab-general-text-muted">Your action</p>
                    <div class="blackjack-table__action-row">
                      <Button
                        v-if="canHit"
                        label="Hit"
                        icon="pi pi-plus"
                        size="small"
                        severity="secondary"
                        :aria-label="hintActionAriaLabel('hit', 'Hit')"
                        :pt="{
                          root: {
                            class: hintActionClass('hit'),
                            attrs: { id: generateUniqueId('bj-hit') },
                          },
                        }"
                        @click="act({ type: 'hit' })"
                      />
                      <Button
                        v-if="canStand"
                        label="Stand"
                        icon="pi pi-check"
                        size="small"
                        severity="secondary"
                        :aria-label="hintActionAriaLabel('stand', 'Stand')"
                        :pt="{
                          root: {
                            class: hintActionClass('stand'),
                            attrs: { id: generateUniqueId('bj-stand') },
                          },
                        }"
                        @click="act({ type: 'stand' })"
                      />
                      <Button
                        v-if="canDouble"
                        :label="`Double ${formatLabQuarksNumber(props.bet)}`"
                        icon="pi pi-wallet"
                        size="small"
                        severity="secondary"
                        :aria-label="
                          hintActionAriaLabel(
                            'double',
                            `Double ${formatLabQuarksNumber(props.bet)}`,
                          )
                        "
                        :pt="{
                          root: {
                            class: hintActionClass('double'),
                            attrs: { id: generateUniqueId('bj-double') },
                          },
                        }"
                        @click="act({ type: 'double' })"
                      />
                      <Button
                        v-if="canSplit"
                        :label="`Split ${formatLabQuarksNumber(props.bet)}`"
                        icon="pi pi-clone"
                        size="small"
                        severity="secondary"
                        :aria-label="
                          hintActionAriaLabel(
                            'split',
                            `Split ${formatLabQuarksNumber(props.bet)}`,
                          )
                        "
                        :pt="{
                          root: {
                            class: hintActionClass('split'),
                            attrs: { id: generateUniqueId('bj-split') },
                          },
                        }"
                        @click="act({ type: 'split' })"
                      />
                    </div>
                  </div>
                </div>
              </div>
              </div>
            </div>
          </div>

          <div
            class="blackjack-table__seat blackjack-table__seat--dealer"
            :id="generateUniqueId('bj-dealer-seat')"
          >
            <span class="blackjack-table__label text-lab-general-text-muted">Dealer</span>
            <div class="blackjack-table__hand">
              <LabPlayingCard
                v-for="(code, i) in props.dealerCards"
                :key="`dealer-${i}-${code}`"
                :code="dealerCardFaceDown(i) ? undefined : code"
                :face-down="dealerCardFaceDown(i)"
                size="sm"
              />
            </div>
            <p class="blackjack-table__total m-0">
              {{
                props.dealerHoleHidden
                  ? `Showing ${props.dealerDisplayTotal}`
                  : `Total ${props.dealerDisplayTotal}`
              }}
            </p>
          </div>
        </div>
      </div>

      <p
        v-if="props.legalActions.length === 0 && props.handOver"
        class="text-sm text-lab-general-text-muted m-0 mt-3"
        :id="generateUniqueId('bj-hand-over')"
      >
        Hand complete — start another from the lobby.
      </p>
    </section>
  </div>
</template>

<style scoped>
.blackjack-table {
  width: 100%;
  max-width: 48rem;
}

.blackjack-table__frame {
  padding: 1rem 1.15rem;
}

.blackjack-table__strategy-flash {
  padding: 0.45rem 0.65rem;
  border-radius: 0.45rem;
  border: 1px solid
    color-mix(
      in srgb,
      var(--lab-section-accent, var(--lab-button-border-hover)) 55%,
      var(--lab-general-border)
    );
  background: color-mix(
    in srgb,
    var(--lab-section-accent, var(--lab-button-border-hover)) 14%,
    var(--lab-general-bg)
  );
  color: color-mix(
    in srgb,
    var(--lab-section-accent, var(--lab-button-border-hover)) 80%,
    var(--lab-general-text)
  );
}

.blackjack-table__felt {
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
  gap: 1rem;
}

.blackjack-table__arena {
  display: grid;
  grid-template-columns: minmax(min-content, 1fr) minmax(min-content, max-content);
  gap: 0 1.25rem;
  align-items: stretch;
  min-height: 17rem;
}

.blackjack-table__center-column {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  min-height: 17rem;
  min-width: 0;
  width: 100%;
}

.blackjack-table__seat--opponent {
  flex-shrink: 0;
  align-self: flex-start;
  width: fit-content;
  max-width: 100%;
  padding: 0.65rem 0.75rem;
  border-radius: 0.5rem;
  border: 1px solid color-mix(in srgb, var(--lab-general-border) 72%, transparent);
  background: color-mix(in srgb, var(--lab-general-bg) 48%, transparent);
  text-align: left;
}

.blackjack-table__seat--player {
  flex-shrink: 0;
  align-self: flex-start;
  width: fit-content;
  max-width: 100%;
  padding: 0;
  text-align: left;
}

.blackjack-table__player-stack {
  align-self: flex-start;
  width: fit-content;
  max-width: 100%;
  margin-top: auto;
  padding-bottom: 0.15rem;
}

.blackjack-table__player-stack--below-opponent {
  margin-top: 2rem;
}

.blackjack-table__player-row {
  display: flex;
  flex-direction: row;
  align-items: flex-end;
  gap: 1rem;
  width: 100%;
  min-width: 0;
}

.blackjack-table__player-side {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  flex: 0 0 auto;
  align-self: flex-end;
  max-width: 100%;
}

.blackjack-table__seat {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}

.blackjack-table__seat--dealer {
  min-height: 17rem;
  width: fit-content;
  min-width: min-content;
  max-width: 100%;
  align-self: center;
  justify-content: center;
  flex-shrink: 0;
  padding: 0.65rem 0.75rem;
  border-radius: 0.5rem;
  border: 1px solid color-mix(in srgb, var(--lab-general-border) 72%, transparent);
  background: color-mix(in srgb, var(--lab-general-bg) 48%, transparent);
}

.blackjack-table__row {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}

.blackjack-table__label {
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.blackjack-table__hand {
  display: flex;
  flex-wrap: nowrap;
  gap: 0.5rem;
  align-items: flex-start;
}

.blackjack-table__wager {
  font-size: 0.875rem;
  color: var(--lab-general-text-muted);
  text-align: left;
  padding-top: 0.15rem;
}

.blackjack-table__wager-value {
  margin-left: 0.4rem;
  font-weight: 700;
  font-size: 1.05rem;
  color: var(--lab-general-text);
}

.blackjack-table__total {
  font-size: 0.9rem;
  color: var(--lab-general-text-muted);
}

.blackjack-table__opponent-hands {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  width: 100%;
}

.blackjack-table__opponent-hands--split {
  align-items: stretch;
}

.blackjack-table__opponent-hand-block {
  min-width: min-content;
}

.blackjack-table__player-hands {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  min-width: min-content;
}

.blackjack-table__player-hand-block {
  min-width: min-content;
}

.blackjack-table__player-hand-stack {
  padding: 0.45rem 0.55rem;
  border-radius: 0.45rem;
  border: 1px solid color-mix(in srgb, var(--lab-general-border) 72%, transparent);
  background: color-mix(in srgb, var(--lab-general-bg) 55%, transparent);
}

.blackjack-table__player-hand-stack--active {
  border-color: color-mix(in srgb, var(--lab-button-border-hover) 65%, var(--lab-general-border));
}

.blackjack-table__row--active-hand {
  border-color: color-mix(in srgb, var(--lab-button-border-hover) 65%, var(--lab-general-border));
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--lab-button-border-hover) 40%, transparent);
}

.blackjack-table__controls {
  width: 100%;
  padding: 0;
  border: none;
  background: transparent;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.blackjack-table__controls-lead {
  font-size: 0.8rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.blackjack-table__action-row {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  gap: 0.4rem;
  align-items: center;
}

.blackjack-table__controls :deep(.p-button) {
  flex: 0 0 auto;
  white-space: nowrap;
}

@media (max-width: 520px) {
  .blackjack-table__arena {
    grid-template-columns: 1fr;
    min-height: 0;
  }

  .blackjack-table__center-column,
  .blackjack-table__seat--dealer {
    min-height: 0;
  }

  .blackjack-table__seat--dealer {
    order: -1;
    flex-direction: row;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    gap: 0.65rem 0.85rem;
  }

  .blackjack-table__seat--dealer .blackjack-table__hand {
    justify-content: center;
  }

  .blackjack-table__seat--opponent {
    flex-direction: row;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    gap: 0.65rem 0.85rem;
    text-align: left;
  }

  .blackjack-table__player-row {
    flex-direction: column;
    align-items: stretch;
  }

  .blackjack-table__player-side {
    max-width: 100%;
  }

  .blackjack-table__player-stack {
    max-width: 100%;
  }

  .blackjack-table__controls {
    max-width: 100%;
  }
}
</style>
