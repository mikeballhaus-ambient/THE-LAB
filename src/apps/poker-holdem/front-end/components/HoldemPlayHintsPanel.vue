<script setup lang="ts">
import { computed } from 'vue';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import type { PokerMove } from '../../back-end/rules';
import {
  holdemPlayHintsForTurn,
  holdemPlayHintsLead,
  holdemPlayHintsSubtitle,
  type HoldemPlayHint,
} from '../utils/holdem-play-hints';

const props = defineProps<{
  legalActions: PokerMove['type'][];
  toCall: number;
  minBet: number;
  minRaiseTo: number;
  pot: number;
  boardLength: number;
  isMyTurn: boolean;
  handOver: boolean;
  opponentThinking: boolean;
  /** Paid Street coach+ cards (shown above free action hints). */
  streetCoachHints?: HoldemPlayHint[];
}>();

const { generateUniqueId } = useUniqueElementId();

const ctx = computed(() => ({
  legalActions: props.legalActions,
  toCall: props.toCall,
  minBet: props.minBet,
  minRaiseTo: props.minRaiseTo,
  pot: props.pot,
  boardLength: props.boardLength,
  isMyTurn: props.isMyTurn,
  handOver: props.handOver,
  opponentThinking: props.opponentThinking,
}));

const subtitle = computed(() => holdemPlayHintsSubtitle(ctx.value));
const lead = computed(() => holdemPlayHintsLead(ctx.value));
const hints = computed(() => holdemPlayHintsForTurn(ctx.value));

const streetCoachHints = computed(() => props.streetCoachHints ?? []);

const showWaitingDots = computed(
  () => props.opponentThinking || (!props.isMyTurn && !props.handOver),
);

const hasHintCards = computed(() => hints.value.length > 0);
const hasStreetCoach = computed(() => streetCoachHints.value.length > 0);
const showFallbackTip = computed(
  () => !hasHintCards.value && !hasStreetCoach.value && !props.handOver,
);
</script>

<template>
  <section
    class="lab-form-section holdem-play-hints mb-0 w-full min-w-0 h-full max-h-full flex flex-1 flex-col min-h-0 overflow-hidden"
    :id="generateUniqueId('holdem-play-hints')"
  >
    <h4 class="lab-form-section__title shrink-0" :id="generateUniqueId('holdem-play-hints-title')">
      <span class="lab-form-section__icon" aria-hidden="true">
        <i class="pi pi-lightbulb" />
      </span>
      Play guide
    </h4>
    <p
      class="lab-form-section__lead shrink-0 flex items-center gap-2 flex-wrap m-0"
      :id="generateUniqueId('holdem-play-hints-subtitle')"
    >
      <span :class="isMyTurn && !handOver ? 'text-lab-chat-user' : ''">{{ subtitle }}</span>
      <span
        v-if="showWaitingDots"
        class="text-lab-chat-assistant message-loading ellipsis"
        aria-hidden="true"
      >
        <span class="dot" />
        <span class="dot" />
        <span class="dot" />
      </span>
    </p>

    <div
      class="lab-form-section__children flex min-h-0 flex-[1_1_auto] flex-1 flex-col px-0 pb-0"
    >
      <div
        class="m-0 p-0 lab-chat-scrollbar flex-1 overflow-y-auto overflow-x-hidden min-h-0"
        :id="generateUniqueId('holdem-play-hints-body')"
      >
        <p class="text-sm text-lab-general-text m-0 mb-3">{{ lead }}</p>

        <section
          v-if="hasStreetCoach"
          class="holdem-street-coach-quarks lab-form-section lab-form-section--nested mb-3 min-w-0"
          :id="generateUniqueId('holdem-street-coach-quarks')"
        >
          <h4
            class="lab-form-section__title text-sm m-0"
            :id="generateUniqueId('holdem-street-coach-quarks-title')"
          >
            <span class="lab-form-section__icon" aria-hidden="true">
              <i class="pi pi-sparkles" />
            </span>
            Street coach+ (Quarks)
          </h4>
          <p class="lab-form-section__lead m-0 mt-1 text-xs">
            Pot odds and coarse hand strength for this street — not bet sizing.
          </p>
          <ul
            class="catalog-accordion-item-list catalog-accordion-item-list--cards m-0 mt-2 list-none p-0 ps-0"
            :id="generateUniqueId('holdem-street-coach-quarks-list')"
          >
            <li v-for="hint in streetCoachHints" :key="hint.id">
              <section
                class="lab-form-section lab-form-section--nested mb-0 min-w-0 holdem-street-coach-quarks__card"
                :id="generateUniqueId(`holdem-street-coach-${hint.id}`)"
              >
                <h4
                  class="lab-form-section__title text-sm"
                  :id="generateUniqueId(`holdem-street-coach-title-${hint.id}`)"
                >
                  <span class="lab-form-section__icon" aria-hidden="true">
                    <i class="pi pi-chart-line" />
                  </span>
                  {{ hint.title }}
                </h4>
                <p class="lab-form-section__lead m-0 text-xs">{{ hint.detail }}</p>
              </section>
            </li>
          </ul>
        </section>

        <div v-if="hasHintCards">
          <ul
            class="catalog-accordion-item-list m-0 list-none p-0 ps-0"
            :id="generateUniqueId('holdem-play-hints-list')"
          >
            <li v-for="hint in hints" :key="hint.id">
              <section
                class="lab-form-section lab-form-section--nested mb-0 min-w-0"
                :id="generateUniqueId(`holdem-play-hint-${hint.id}`)"
              >
                <h4
                  class="lab-form-section__title text-sm"
                  :id="generateUniqueId(`holdem-play-hint-title-${hint.id}`)"
                >
                  <span class="lab-form-section__icon" aria-hidden="true">
                    <i class="pi pi-check-circle" />
                  </span>
                  {{ hint.title }}
                </h4>
                <p class="lab-form-section__lead m-0 text-xs">{{ hint.detail }}</p>
              </section>
            </li>
          </ul>
        </div>

        <section
          v-if="showFallbackTip"
          class="lab-form-section lab-form-section--nested holdem-play-hints__card min-w-0"
          :id="generateUniqueId('holdem-play-hints-fallback')"
        >
          <h4
            class="lab-form-section__title text-sm"
            :id="generateUniqueId('holdem-play-hints-fallback-title')"
          >
            <span class="lab-form-section__icon" aria-hidden="true">
              <i class="pi pi-info-circle" />
            </span>
            Tip
          </h4>
          <p class="lab-form-section__lead m-0 text-xs">
            Quarks are play money only. Blinds (25 / 50) post automatically. Win the pot at showdown or
            when your opponent folds.
          </p>
        </section>
      </div>
    </div>
  </section>
</template>

<style scoped>
.holdem-street-coach-quarks {
  border-color: color-mix(in srgb, var(--lab-button-border-hover) 55%, var(--lab-general-border));
  background: color-mix(in srgb, var(--lab-button-border-hover) 12%, var(--lab-general-bg));
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--lab-button-border-hover) 35%, transparent);
}

.holdem-street-coach-quarks__card {
  border-color: color-mix(in srgb, var(--lab-button-border-hover) 40%, var(--lab-general-border));
}
</style>
