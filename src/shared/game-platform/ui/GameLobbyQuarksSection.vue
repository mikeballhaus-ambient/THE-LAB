<script setup lang="ts">
import { computed } from 'vue';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import { formatLabQuarksNumber, LAB_QUARKS_CURRENCY } from '@/shared/constants/lab-quarks-currency';
import {
  GAME_LOBBY_QUARKS_OPT_IN_LABEL,
  GAME_LOBBY_QUARKS_OPT_IN_LEAD,
  GAME_LOBBY_QUARKS_WAGER_LEAD,
} from '@/shared/constants/lab-game-quarks-practice';

const props = withDefaults(
  defineProps<{
    showQuarksWager?: boolean;
    quarksWagerAmount?: number;
    /** Card games — opt in to real Quarks (default off). */
    showQuarksOptInRealPlay?: boolean;
    /** When set, replaces the default wager lead (per-game copy). */
    quarksSectionLeadOverride?: string;
  }>(),
  {
    showQuarksWager: false,
    quarksWagerAmount: 0,
    showQuarksOptInRealPlay: false,
  },
);

const quarksWagerEnabled = defineModel<boolean>('quarksWagerEnabled', { default: false });
const quarksRealPlayEnabled = defineModel<boolean>('quarksRealPlayEnabled', { default: false });

const showQuarksSection = computed(
  () => props.showQuarksOptInRealPlay || props.showQuarksWager,
);

const quarksSectionLead = computed(() => {
  if (props.quarksSectionLeadOverride?.trim()) {
    return props.quarksSectionLeadOverride.trim();
  }
  if (props.showQuarksOptInRealPlay && props.showQuarksWager) {
    return `${GAME_LOBBY_QUARKS_OPT_IN_LEAD} ${GAME_LOBBY_QUARKS_WAGER_LEAD}`;
  }
  if (props.showQuarksOptInRealPlay) {
    return GAME_LOBBY_QUARKS_OPT_IN_LEAD;
  }
  return GAME_LOBBY_QUARKS_WAGER_LEAD;
});

const { generateUniqueId } = useUniqueElementId();
</script>

<template>
  <section
    v-if="showQuarksSection"
    class="lab-form-section game-lobby-quarks-section"
    :id="generateUniqueId('game-lobby-quarks-section')"
  >
    <h4 class="lab-form-section__title">
      <span class="lab-form-section__icon"><i class="pi pi-wallet" aria-hidden="true" /></span>
      Quarks
    </h4>
    <p class="lab-form-section__lead">{{ quarksSectionLead }}</p>
    <div class="mt-1 flex flex-col gap-2 text-sm">
      <label
        v-if="props.showQuarksOptInRealPlay"
        class="inline-flex cursor-pointer items-center gap-2"
        :id="generateUniqueId('game-lobby-real-play-label')"
      >
        <input
          v-model="quarksRealPlayEnabled"
          type="checkbox"
          class="game-lobby-real-play-checkbox"
          :id="generateUniqueId('game-lobby-real-play-toggle')"
        />
        <span>{{ GAME_LOBBY_QUARKS_OPT_IN_LABEL }}</span>
      </label>
      <label
        v-if="props.showQuarksWager"
        class="inline-flex cursor-pointer items-center gap-2"
        :id="generateUniqueId('game-lobby-wager-label')"
      >
        <input
          v-model="quarksWagerEnabled"
          type="checkbox"
          class="game-lobby-wager-checkbox"
          :id="generateUniqueId('game-lobby-wager-toggle')"
        />
        <span>
          Wager
          <span class="tabular-nums font-semibold">{{ formatLabQuarksNumber(props.quarksWagerAmount ?? 0) }}</span>
          {{ LAB_QUARKS_CURRENCY.name }} this frame
        </span>
      </label>
    </div>
  </section>
</template>
