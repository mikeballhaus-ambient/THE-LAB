import { computed, ref, watch, type ComputedRef, type Ref } from 'vue';
import type { MatchView } from '@/shared/game-platform/types';
import type { PlayerTurn } from '@/shared/game-platform/ui';
import { handTotals, type BlackjackState, type TurnHistoryEntry } from '@/apps/blackjack/back-end/rules';

function dealerPauseMs(): number {
  return 750 + Math.floor(Math.random() * 751);
}

function isDealerHitEntry(entry: TurnHistoryEntry): boolean {
  return entry.seat === 0 && entry.summary.startsWith('Dealer hits');
}

function isDealerResolveEntry(entry: TurnHistoryEntry): boolean {
  return (
    entry.seat === 0 &&
    (entry.summary.includes('Dealer resolves') ||
      entry.summary.includes('Dealer blackjack') ||
      entry.summary === 'Blackjack!')
  );
}

export function useBlackjackTurnPresentation(options: {
  match: Ref<MatchView | null>;
  authoritativeState: ComputedRef<BlackjackState | null>;
  resolveSeatLabel: (seat: number) => string;
}) {
  const { match, authoritativeState, resolveSeatLabel } = options;

  const revealedCount = ref(0);
  const dealerCardCount = ref<number | null>(null);
  const dealerHoleHiddenOverride = ref<boolean | null>(null);
  const suppressCompletion = ref(false);
  let revealGeneration = 0;

  function resetPresentation(): void {
    revealGeneration += 1;
    revealedCount.value = 0;
    dealerCardCount.value = null;
    dealerHoleHiddenOverride.value = null;
    suppressCompletion.value = false;
  }

  watch(
    () => match.value?.matchId,
    () => {
      resetPresentation();
    },
  );

  watch(
    () => authoritativeState.value?.turnHistory?.length ?? 0,
    (targetLen) => {
      if (targetLen < revealedCount.value) {
        revealedCount.value = targetLen;
      }
      if (targetLen > revealedCount.value) {
        void revealThrough(targetLen);
      }
    },
    { immediate: true },
  );

  async function revealThrough(targetLen: number): Promise<void> {
    const generation = revealGeneration;
    while (revealedCount.value < targetLen) {
      if (generation !== revealGeneration) {
        return;
      }
      const auth = authoritativeState.value;
      if (!auth) {
        return;
      }
      const idx = revealedCount.value;
      const entry = auth.turnHistory[idx];
      if (!entry) {
        break;
      }

      if (entry.seat === 0) {
        suppressCompletion.value = true;
        await new Promise<void>((resolve) => {
          setTimeout(resolve, dealerPauseMs());
        });
        if (generation !== revealGeneration) {
          return;
        }

        const historySlice = auth.turnHistory.slice(0, idx + 1);
        const hitCount = historySlice.filter(isDealerHitEntry).length;
        dealerCardCount.value = Math.min(auth.dealerHand.length, 2 + hitCount);
        dealerHoleHiddenOverride.value = !isDealerResolveEntry(entry);

        if (isDealerResolveEntry(entry)) {
          dealerCardCount.value = auth.dealerHand.length;
          dealerHoleHiddenOverride.value = false;
          suppressCompletion.value = false;
        }
      }

      revealedCount.value = idx + 1;
    }

    const auth = authoritativeState.value;
    if (auth && revealedCount.value >= auth.turnHistory.length) {
      suppressCompletion.value = false;
      dealerCardCount.value = null;
      dealerHoleHiddenOverride.value = null;
    }
  }

  const displayState = computed((): BlackjackState | null => {
    const auth = authoritativeState.value;
    if (!auth) {
      return null;
    }
    if (dealerCardCount.value == null && !suppressCompletion.value) {
      return auth;
    }
    const cardCount = dealerCardCount.value ?? auth.dealerHand.length;
    const visibleDealer = auth.dealerHand.slice(0, cardCount);
    const holeHidden = dealerHoleHiddenOverride.value ?? auth.dealerHoleHidden;
    const dealerTotal = handTotals(visibleDealer).total;
    const dealerUpTotal =
      holeHidden && visibleDealer.length >= 2
        ? handTotals([visibleDealer[0] as (typeof visibleDealer)[0]]).total
        : dealerTotal;
    return {
      ...auth,
      dealerHand: visibleDealer,
      dealerHoleHidden: holeHidden,
      dealerTotal,
      dealerUpTotal,
      completed: suppressCompletion.value ? false : auth.completed,
      winnerSeat: suppressCompletion.value ? null : auth.winnerSeat,
      seatDelta: suppressCompletion.value ? { 1: 0, 2: 0 } : auth.seatDelta,
    };
  });

  const playerTurns = computed((): PlayerTurn[] => {
    const m = match.value;
    const auth = authoritativeState.value;
    if (!m || !auth) {
      return [];
    }
    const visible = auth.turnHistory.slice(0, revealedCount.value);
    return visible.map((entry, i) => ({
      id: `${m.matchId}-turn-${i}`,
      seat: entry.seat,
      isYou: entry.seat === m.yourSeat,
      playerLabel: resolveSeatLabel(entry.seat),
      summary: entry.summary,
    }));
  });

  const dealerRevealBusy = computed(() => suppressCompletion.value);

  return {
    displayState,
    playerTurns,
    dealerRevealBusy,
  };
}
