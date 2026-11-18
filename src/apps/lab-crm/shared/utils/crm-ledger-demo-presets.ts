import type { LabLedgerAccountRecord } from '@/shared/types/lab-ledger';

export interface CrmLedgerDemoAccountPresets {
  debitAccountId?: string;
  creditAccountId?: string;
}

function findAccountIdByCodes(
  accounts: LabLedgerAccountRecord[],
  debitCodes: string[],
  creditCodes: string[],
): CrmLedgerDemoAccountPresets {
  const enabled = accounts.filter((row) => row.enabled);
  const byCode = new Map(enabled.map((row) => [row.code, row.id]));
  let debitAccountId: string | undefined;
  let creditAccountId: string | undefined;
  for (const code of debitCodes) {
    const id = byCode.get(code);
    if (id) {
      debitAccountId = id;
      break;
    }
  }
  for (const code of creditCodes) {
    const id = byCode.get(code);
    if (id) {
      creditAccountId = id;
      break;
    }
  }
  return { debitAccountId, creditAccountId };
}

/** Prefer phase-2 demo COA (DEMO-CASH / DEMO-REV), then standard seeded chart (1000 / 4000). */
export function resolveCrmLedgerDemoAccountPresets(
  accounts: LabLedgerAccountRecord[],
): CrmLedgerDemoAccountPresets {
  const demo = findAccountIdByCodes(accounts, ['DEMO-CASH', '1000'], ['DEMO-REV', '4000']);
  return demo;
}
