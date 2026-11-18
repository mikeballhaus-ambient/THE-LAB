import { ref } from 'vue';

/** Latest Quark balance for lab shell chrome (quick nav); updated by any `useLabVirtualBank` refresh. */
export const labShellQuarksBalance = ref<number | null>(null);
export const labShellQuarksLoading = ref(false);

export function publishLabShellQuarksBalance(balance: number | null, loading?: boolean): void {
  labShellQuarksBalance.value = balance;
  if (loading !== undefined) {
    labShellQuarksLoading.value = loading;
  }
}

export function clearLabShellQuarksBalance(): void {
  labShellQuarksBalance.value = null;
  labShellQuarksLoading.value = false;
}
