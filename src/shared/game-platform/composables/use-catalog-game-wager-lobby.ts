import { computed, reactive, ref, type Ref } from 'vue';
import { formatLabQuarksNumber, LAB_QUARKS_CURRENCY } from '@/shared/constants/lab-quarks-currency';
import type { GameDifficulty } from '@/shared/game-platform/types';
import {
  CATALOG_PVP_WAGER_STAKES,
  catalogWagerStakeForDifficulty,
} from '@/shared/game-platform/catalog-match-wager';
import type { MatchOutcome } from '@/shared/game-platform/use-turn-based-match';

/**
 * Lobby state for optional Quarks frame wagers (vs Lab Assistant + friend invite).
 * Mirrors billiards; pass {@link aiCreateRules} / {@link pvpInviteRules} into match create APIs.
 */
export function useCatalogGameWagerLobby(difficulty: Ref<GameDifficulty>) {
  const wagerEnabled = ref(false);
  const pvpWagerEnabled = ref(false);
  const pvpWagerQuarks = ref(250);

  const lobbyWagerStake = computed(() => catalogWagerStakeForDifficulty(difficulty.value));

  const pvpStakeOptions = computed(() =>
    CATALOG_PVP_WAGER_STAKES.map((value) => ({
      label: `${formatLabQuarksNumber(value)} ${LAB_QUARKS_CURRENCY.name}`,
      value,
    })),
  );

  function aiCreateRules(): { wagerQuarks?: number } {
    const wagerQuarks = wagerEnabled.value ? lobbyWagerStake.value : 0;
    return wagerQuarks > 0 ? { wagerQuarks } : {};
  }

  function pvpInviteRules(): { wagerQuarks?: number } {
    const wagerQuarks = pvpWagerEnabled.value ? pvpWagerQuarks.value : 0;
    return wagerQuarks > 0 ? { wagerQuarks } : {};
  }

  function wagerOutcomeSuffix(wagerQuarks: number | undefined, outcome: MatchOutcome): string {
    const stake = wagerQuarks ?? 0;
    if (stake <= 0) {
      return '';
    }
    if (outcome === 'win') {
      return ` You won ${formatLabQuarksNumber(stake)} ${LAB_QUARKS_CURRENCY.name}.`;
    }
    if (outcome === 'loss') {
      return ` You lost ${formatLabQuarksNumber(stake)} ${LAB_QUARKS_CURRENCY.name}.`;
    }
    return '';
  }

  return reactive({
    wagerEnabled,
    pvpWagerEnabled,
    pvpWagerQuarks,
    lobbyWagerStake,
    pvpStakeOptions,
    aiCreateRules,
    pvpInviteRules,
    wagerOutcomeSuffix,
  });
}
