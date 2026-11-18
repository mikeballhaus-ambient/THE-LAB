import { computed, toValue, type MaybeRef, type MaybeRefOrGetter } from 'vue';
import type { MatchView } from '@/shared/game-platform/types';
import { useLabGameHint } from '@/shared/game-platform/composables/useLabGameHint';
import { buildLabGameHintSourceRef } from '@/shared/game-platform/lab-game-hint-source-ref';

export interface UseCatalogMatchGameHintOptions {
  hostAppId: string;
  skuId: string;
  serverUrl: MaybeRef<string>;
  match: MaybeRefOrGetter<MatchView | null | undefined>;
  buildTurnKey: () => string | number;
  /**
   * When true, {@link useLabGameHint} treats the session as practice: overlay always on and
   * purchase does not call the ledger. Do not use for solo Quarks hints that must stay gated.
   */
  alwaysPractice?: MaybeRefOrGetter<boolean>;
  onPurchased?: (balance: number | null) => void;
}

/**
 * Quarks hint unlock wired to {@link MatchView.practice} plus optional always-free modes.
 */
export function useCatalogMatchGameHint(options: UseCatalogMatchGameHintOptions) {
  const practiceMode = computed(
    () => toValue(options.alwaysPractice) === true || toValue(options.match)?.practice === true,
  );

  return useLabGameHint({
    skuId: options.skuId,
    serverUrl: options.serverUrl,
    practiceMode,
    buildSourceRef: () =>
      buildLabGameHintSourceRef({
        hostAppId: options.hostAppId,
        skuId: options.skuId,
        matchId: String(toValue(options.match)?.matchId ?? 'unknown'),
        turnKey: options.buildTurnKey(),
      }),
    onPurchased: options.onPurchased,
  });
}
