import { ref, watch, type Ref } from 'vue';
import {
  fetchLabVirtualBankAccount,
  fetchLabVirtualBankLedger,
} from '@/shared/services/lab-virtual-bank-client';
import type {
  LabVirtualBankAccountView,
  LabVirtualBankLedgerEntry,
} from '@/shared/types/lab-virtual-bank';
import {
  clearLabShellQuarksBalance,
  publishLabShellQuarksBalance,
} from '@/shared/composables/lab-virtual-bank-shell-state';
import { useLabVirtualBank } from '@/shared/composables/useLabVirtualBank';

export interface UseLabQuarksShellOptions {
  serverUrl: Ref<string> | (() => string);
  isAuthenticated: Ref<boolean>;
}

function resolveUrl(input: Ref<string> | (() => string)): string {
  return (typeof input === 'function' ? input() : input.value).replace(/\/$/, '');
}

/** Quick-nav Quarks balance + wallet dialog (ledger and policy). */
export function useLabQuarksShell(options: UseLabQuarksShellOptions) {
  const dialogVisible = ref(false);
  const walletLoading = ref(false);
  const walletError = ref<string | null>(null);
  const account = ref<LabVirtualBankAccountView | null>(null);
  const ledger = ref<LabVirtualBankLedgerEntry[]>([]);

  const bank = useLabVirtualBank({
    serverUrl: options.serverUrl,
    toastOnDelta: false,
    loadOnMount: false,
  });

  watch(
    options.isAuthenticated,
    (authenticated) => {
      if (authenticated) {
        void bank.refresh();
        return;
      }
      clearLabShellQuarksBalance();
      dialogVisible.value = false;
      account.value = null;
      ledger.value = [];
      walletError.value = null;
    },
    { immediate: true },
  );

  async function loadWalletDetail(): Promise<void> {
    const url = resolveUrl(options.serverUrl);
    if (!url) {
      return;
    }
    walletLoading.value = true;
    walletError.value = null;
    try {
      const [acc, entries] = await Promise.all([
        fetchLabVirtualBankAccount(url),
        fetchLabVirtualBankLedger(url, 25),
      ]);
      account.value = acc;
      ledger.value = entries;
      publishLabShellQuarksBalance(acc.balance, false);
    } catch (e) {
      walletError.value = e instanceof Error ? e.message : 'Could not load wallet';
    } finally {
      walletLoading.value = false;
    }
  }

  function openDialog(): void {
    dialogVisible.value = true;
    void loadWalletDetail();
  }

  function closeDialog(): void {
    dialogVisible.value = false;
  }

  return {
    dialogVisible,
    openDialog,
    closeDialog,
    walletLoading,
    walletError,
    account,
    ledger,
    loadWalletDetail,
    bank,
  };
}
