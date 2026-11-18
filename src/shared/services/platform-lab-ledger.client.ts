import { resolvePlatformBackendUrlForClient } from '@/shared/config/resolve-platform-backend-url.client';
import { labPlatformFetchInit } from '@/shared/composables/useLabPlatformAuth';
import type { LabLedgerAccountRecord, LabLedgerEntryRecord } from '@/shared/types/lab-ledger';
import type { UserRole } from '@/shared/types/user';
import { isPlatformLedgerAccountAdmin } from '@/shared/utils/platform-ledger-permissions';

async function parseJson<T>(response: Response): Promise<T> {
  const body = await response.json();
  if (!response.ok || body.success === false) {
    throw new Error(body.message ?? body.error ?? `HTTP ${response.status}`);
  }
  return body as T;
}

const base = () => `${resolvePlatformBackendUrlForClient()}/api/platform/lab-ledger`;

export interface LabLedgerCapabilities {
  canManageAccounts: boolean;
  canPostEntries: boolean;
}

export async function fetchLabLedgerCapabilities(): Promise<LabLedgerCapabilities> {
  const response = await fetch(`${base()}/capabilities`, labPlatformFetchInit());
  const body = await parseJson<{ success: true; data: LabLedgerCapabilities }>(response);
  return body.data;
}

export interface LabLedgerAccountsListResult {
  accounts: LabLedgerAccountRecord[];
  canManageAccounts: boolean;
  platformRole?: UserRole;
}

export async function fetchLabLedgerAccounts(): Promise<LabLedgerAccountsListResult> {
  const response = await fetch(`${base()}/accounts`, labPlatformFetchInit());
  const body = await parseJson<{
    success: true;
    data: {
      accounts: LabLedgerAccountRecord[];
      canManageAccounts?: boolean;
      platformRole?: UserRole;
    };
  }>(response);
  const data = body.data;
  const canManageAccounts =
    data.canManageAccounts === true || isPlatformLedgerAccountAdmin(data.platformRole);
  return {
    accounts: data.accounts,
    canManageAccounts,
    platformRole: data.platformRole,
  };
}

export async function createLabLedgerAccount(input: unknown): Promise<LabLedgerAccountRecord> {
  const response = await fetch(
    `${base()}/accounts`,
    labPlatformFetchInit({ method: 'POST', body: JSON.stringify(input) }),
  );
  const body = await parseJson<{ success: true; data: { account: LabLedgerAccountRecord } }>(response);
  return body.data.account;
}

export async function updateLabLedgerAccount(
  accountId: string,
  input: unknown,
): Promise<LabLedgerAccountRecord> {
  const response = await fetch(
    `${base()}/accounts/${encodeURIComponent(accountId)}`,
    labPlatformFetchInit({ method: 'PUT', body: JSON.stringify(input) }),
  );
  const body = await parseJson<{ success: true; data: { account: LabLedgerAccountRecord } }>(response);
  return body.data.account;
}

export async function deleteLabLedgerAccount(accountId: string): Promise<void> {
  const response = await fetch(
    `${base()}/accounts/${encodeURIComponent(accountId)}`,
    labPlatformFetchInit({ method: 'DELETE' }),
  );
  await parseJson<{ success: true }>(response);
}

export async function fetchLabLedgerEntries(): Promise<LabLedgerEntryRecord[]> {
  const response = await fetch(`${base()}/entries`, labPlatformFetchInit());
  const body = await parseJson<{ success: true; data: { entries: LabLedgerEntryRecord[] } }>(response);
  return body.data.entries;
}

export async function postLabLedgerEntry(input: unknown): Promise<LabLedgerEntryRecord> {
  const response = await fetch(
    `${base()}/entries`,
    labPlatformFetchInit({ method: 'POST', body: JSON.stringify(input) }),
  );
  const body = await parseJson<{ success: true; data: { entry: LabLedgerEntryRecord } }>(response);
  return body.data.entry;
}
