import { computed, ref, toValue, unref, type MaybeRef, type MaybeRefOrGetter } from 'vue';
import { isLabGameHintDevMockEnabled } from '@/shared/game-platform/lab-game-hint-dev-mock';
import { resolveLabGameHintSku } from '@/shared/game-platform/lab-game-hints';
import { purchaseLabGameHint } from '@/shared/services/lab-game-hint-client';

export interface UseLabGameHintOptions {
  skuId: string;
  serverUrl: MaybeRef<string>;
  practiceMode?: MaybeRefOrGetter<boolean>;
  buildSourceRef: () => string;
  onPurchased?: (balance: number | null) => void;
}

function resolveUrl(input: MaybeRef<string>): string {
  return unref(input).replace(/\/$/, '');
}

/**
 * Client hint unlock state. Quarks debit via app `POST /api/game-hints/purchase`.
 * Use `mockPurchaseHint` in dev via {@link LabGameHintDevMockButton}.
 */
export function useLabGameHint(options: UseLabGameHintOptions) {
  const sku = resolveLabGameHintSku(options.skuId);
  const unlocked = ref(false);
  const purchasing = ref(false);
  const lastError = ref<string | null>(null);
  const devMockEnabled = isLabGameHintDevMockEnabled();
  const practice = computed(() => toValue(options.practiceMode) === true);

  const showOverlay = computed(() => practice.value || unlocked.value);

  function mockPurchaseHint(): void {
    if (!devMockEnabled) {
      return;
    }
    unlocked.value = true;
    lastError.value = null;
  }

  function clearUnlock(): void {
    unlocked.value = false;
  }

  /** Call after the bounded reveal ends (e.g. shot released). */
  function consumeUnlock(): void {
    clearUnlock();
  }

  async function purchaseHint(): Promise<boolean> {
    lastError.value = null;
    if (practice.value) {
      unlocked.value = true;
      return true;
    }
    if (unlocked.value) {
      return true;
    }
    const url = resolveUrl(options.serverUrl);
    if (!url) {
      lastError.value = 'App server URL missing';
      return false;
    }
    purchasing.value = true;
    try {
      const result = await purchaseLabGameHint(url, {
        skuId: options.skuId,
        sourceRef: options.buildSourceRef(),
      });
      unlocked.value = true;
      options.onPurchased?.(result.balance);
      return true;
    } catch (e) {
      lastError.value = e instanceof Error ? e.message : 'Hint purchase failed';
      return false;
    } finally {
      purchasing.value = false;
    }
  }

  return {
    sku,
    unlocked,
    purchasing,
    lastError,
    devMockEnabled,
    practice,
    showOverlay,
    mockPurchaseHint,
    clearUnlock,
    consumeUnlock,
    purchaseHint,
  };
}
