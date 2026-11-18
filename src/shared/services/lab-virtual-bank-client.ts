import { labPlatformFetchInit } from '@/shared/composables/useLabPlatformAuth';
import type { LabVirtualBankAccountView, LabVirtualBankLedgerEntry } from '@/shared/types/lab-virtual-bank';

export {
  formatLabQuarksAmount,
  formatLabQuarksDailyAccrualToastDetail,
  formatLabQuarksDelta,
  formatLabQuarksDeltaWithBalance,
  formatLabQuarksNumber,
  LAB_QUARKS_CURRENCY,
} from '@/shared/constants/lab-quarks-currency';

function normalizeBase(serverUrl: string): string {
  return serverUrl.replace(/\/$/, '');
}

/** Read Quark balance via the app server proxy (`/api/platform/virtual-bank`). */
export async function fetchLabVirtualBankAccount(
  serverUrl: string,
): Promise<LabVirtualBankAccountView> {
  const base = normalizeBase(serverUrl);
  const response = await fetch(`${base}/api/platform/virtual-bank`, labPlatformFetchInit());
  if (!response.ok) {
    throw new Error(`Quark balance unavailable (${response.status})`);
  }
  const body = (await response.json()) as { success?: boolean; data?: LabVirtualBankAccountView };
  if (!body.success || !body.data) {
    throw new Error('Quark balance response malformed');
  }
  return body.data;
}

/** Recent ledger lines via platform or app proxy. */
export async function fetchLabVirtualBankLedger(
  serverUrl: string,
  limit = 25,
): Promise<LabVirtualBankLedgerEntry[]> {
  const base = normalizeBase(serverUrl);
  const response = await fetch(
    `${base}/api/platform/virtual-bank/ledger?limit=${encodeURIComponent(String(limit))}`,
    labPlatformFetchInit(),
  );
  if (!response.ok) {
    throw new Error(`Quark ledger unavailable (${response.status})`);
  }
  const body = (await response.json()) as {
    success?: boolean;
    data?: LabVirtualBankLedgerEntry[];
  };
  if (!body.success || !body.data) {
    throw new Error('Quark ledger response malformed');
  }
  return body.data;
}

/** @deprecated Use {@link formatLabQuarksAmount} */
export { formatLabQuarksAmount as formatVirtualBankChips } from '@/shared/constants/lab-quarks-currency';
