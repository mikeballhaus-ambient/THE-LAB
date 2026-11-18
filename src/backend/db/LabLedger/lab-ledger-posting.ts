import { labLedgerRepository } from './lab-ledger-repository';
import type { LabLedgerLineSide, LabLedgerNormalBalance } from '@/shared/types/lab-ledger';

export function labLedgerBalanceDelta(
  normalBalance: LabLedgerNormalBalance,
  side: LabLedgerLineSide,
  amountCents: number,
): number {
  if (normalBalance === 'debit') {
    return side === 'debit' ? amountCents : -amountCents;
  }
  return side === 'credit' ? amountCents : -amountCents;
}

export type LabLedgerPostingLine = {
  accountId: string;
  side: LabLedgerLineSide;
  amountCents: number;
};

export function postBalancedEntryToRepository(input: {
  id: string;
  occurredAt: string;
  memo: string | null;
  createdByUserId: number;
  lines: LabLedgerPostingLine[];
}): void {
  let debitTotal = 0;
  let creditTotal = 0;
  for (const line of input.lines) {
    if (line.side === 'debit') {
      debitTotal += line.amountCents;
    } else {
      creditTotal += line.amountCents;
    }
    const account = labLedgerRepository.getAccountById(line.accountId);
    if (!account || !account.enabled) {
      throw new Error(`Invalid or disabled account: ${line.accountId}`);
    }
  }
  if (debitTotal !== creditTotal) {
    throw new Error('Entry is not balanced (debits must equal credits)');
  }

  labLedgerRepository.insertEntry({
    id: input.id,
    occurredAt: input.occurredAt,
    memo: input.memo,
    createdByUserId: input.createdByUserId,
  });

  input.lines.forEach((line, index) => {
    labLedgerRepository.insertLine(input.id, index, line.accountId, line.side, line.amountCents);
    const account = labLedgerRepository.getAccountById(line.accountId)!;
    const delta = labLedgerBalanceDelta(account.normalBalance, line.side, line.amountCents);
    labLedgerRepository.adjustBalance(line.accountId, delta);
  });
}
