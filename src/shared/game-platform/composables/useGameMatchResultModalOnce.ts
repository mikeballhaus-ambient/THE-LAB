import { ref } from 'vue';

/**
 * Ensures {@link GameResultModal} opens at most once per match — avoids stacked
 * dismissals when multiple watchers or presentation teardown call `showResultModal`.
 */
export function useGameMatchResultModalOnce() {
  const shownForMatchId = ref<string | null>(null);

  /** @returns false when this match already showed the result modal. */
  function beginShow(matchId: string): boolean {
    if (shownForMatchId.value === matchId) {
      return false;
    }
    shownForMatchId.value = matchId;
    return true;
  }

  function onMatchIdChange(nextId: string | undefined, prevId: string | undefined): void {
    if (nextId && nextId !== prevId) {
      shownForMatchId.value = null;
    }
  }

  function clearShown(): void {
    shownForMatchId.value = null;
  }

  return { beginShow, onMatchIdChange, clearShown };
}
