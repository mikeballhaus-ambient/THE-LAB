import { onMounted, ref, unref, watch, type MaybeRef, type Ref } from 'vue';
import { useLabAppToast } from '@/shared/composables/useLabAppToast';
import {
  fetchLabVirtualBankAccount,
  formatLabQuarksDailyAccrualToastDetail,
  formatLabQuarksDeltaWithBalance,
  LAB_QUARKS_CURRENCY,
} from '@/shared/services/lab-virtual-bank-client';
import { publishLabShellQuarksBalance } from '@/shared/composables/lab-virtual-bank-shell-state';

export interface UseLabVirtualBankOptions {
  serverUrl: Ref<string> | (() => string);
  /** Show green/red toasts when balance changes after refresh. Default true. */
  toastOnDelta?: boolean;
  /** Toast when daily Quarks credit on first read of a UTC day. Default true. */
  toastOnDailyAccrual?: boolean;
  /** Load balance on mount. Default true. */
  loadOnMount?: boolean;
}

function resolveUrl(input: Ref<string> | (() => string)): string {
  return typeof input === 'function' ? input() : input.value;
}

export function useLabVirtualBank(options: UseLabVirtualBankOptions) {
  const toast = useLabAppToast();
  const balance = ref<number | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);
  let lastBalance: number | null = null;

  async function refresh(optionsInner?: { silent?: boolean }): Promise<void> {
    const url = resolveUrl(options.serverUrl).replace(/\/$/, '');
    if (!url) {
      return;
    }
    loading.value = true;
    publishLabShellQuarksBalance(balance.value, true);
    error.value = null;
    try {
      const view = await fetchLabVirtualBankAccount(url);
      const next = view.balance;
      const silent = optionsInner?.silent === true;
      const toastOnDelta = options.toastOnDelta !== false && !silent;
      const toastOnDailyAccrual = options.toastOnDailyAccrual !== false && !silent;
      const accrual = view.accruedThisRequest;

      if (toastOnDailyAccrual && accrual && accrual.delta > 0) {
        toast.add({
          severity: 'success',
          summary: LAB_QUARKS_CURRENCY.dailyAccrualToastSummary,
          detail: formatLabQuarksDailyAccrualToastDetail(accrual.delta, accrual.days, next),
          life: 5500,
        });
      } else if (toastOnDelta && lastBalance != null && next !== lastBalance) {
        const delta = next - lastBalance;
        toast.add({
          severity: delta > 0 ? 'success' : 'error',
          summary: LAB_QUARKS_CURRENCY.toastSummary,
          detail: formatLabQuarksDeltaWithBalance(delta, next),
          life: 4500,
        });
      }
      lastBalance = next;
      balance.value = next;
      publishLabShellQuarksBalance(next, false);
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Could not load Quark balance';
      publishLabShellQuarksBalance(balance.value, false);
    } finally {
      loading.value = false;
    }
  }

  if (options.loadOnMount !== false) {
    onMounted(() => {
      void refresh();
    });
  }

  return { balance, loading, error, refresh };
}

/** Refresh bank when a turn-based match transitions to finished. */
export function useLabVirtualBankOnMatchFinished(
  bank: ReturnType<typeof useLabVirtualBank>,
  matchStatus: Ref<string | undefined>,
  skipRefresh?: MaybeRef<boolean>,
): void {
  watch(matchStatus, (status, prev) => {
    if (status === 'finished' && prev === 'active') {
      if (unref(skipRefresh)) {
        return;
      }
      void bank.refresh();
    }
  });
}
