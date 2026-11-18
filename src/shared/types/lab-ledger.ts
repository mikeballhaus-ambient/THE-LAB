/**
 * @see docs/platform/lab-financial-ledger.md
 */
export const LAB_LEDGER_SOURCE_APP_ID = 'platform-ledger';

export type LabLedgerAccountType = 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
export type LabLedgerNormalBalance = 'debit' | 'credit';
export type LabLedgerLineSide = 'debit' | 'credit';

export interface LabLedgerAccountRecord {
  id: string;
  code: string;
  name: string;
  type: LabLedgerAccountType;
  normalBalance: LabLedgerNormalBalance;
  balanceCents: number;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LabLedgerEntryLineInput {
  accountId: string;
  side: LabLedgerLineSide;
  amountCents: number;
}

export interface LabLedgerEntryLineRecord extends LabLedgerEntryLineInput {
  lineIndex: number;
}

export interface LabLedgerEntryRecord {
  id: string;
  occurredAt: string;
  memo?: string;
  createdByUserId: number;
  lines: LabLedgerEntryLineRecord[];
  createdAt: string;
}
