import { computed } from 'vue';
import type { useLabGameHint } from '@/shared/game-platform/composables/useLabGameHint';

type HintController = ReturnType<typeof useLabGameHint>;

/** Plain values for {@link LabGameHintAsideControls} (nested refs do not auto-unwrap in templates). */
export function useLabGameHintAsideProps(hint: HintController) {
  return computed(() => ({
    skuLabel: hint.sku?.label ?? 'Hint',
    costQuarks: hint.sku?.defaultCostQuarks ?? 50,
    unlocked: hint.unlocked.value,
    loading: hint.purchasing.value,
    devMockEnabled: hint.devMockEnabled,
  }));
}
