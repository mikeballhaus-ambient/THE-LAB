import { randomUUID } from 'node:crypto';
import { Repository } from '../Repository';
import {
  LabLedgerSQLStatementKeys,
  bootstrapLabLedgerSchema,
  createLabLedgerSQLStatements,
  type LabLedgerSQLStatementKey,
} from './lab-ledger-schema';
import type {
  LabLedgerAccountRecord,
  LabLedgerAccountType,
  LabLedgerEntryLineRecord,
  LabLedgerEntryRecord,
  LabLedgerLineSide,
  LabLedgerNormalBalance,
} from '@/shared/types/lab-ledger';
import { labLedgerBalanceDelta } from './lab-ledger-posting';

type AccountRow = {
  id: string;
  code: string;
  name: string;
  type: string;
  normal_balance: string;
  balance_cents: number;
  enabled: number;
  created_at: string;
  updated_at: string;
};

function mapAccount(row: AccountRow): LabLedgerAccountRecord {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    type: row.type as LabLedgerAccountType,
    normalBalance: row.normal_balance as LabLedgerNormalBalance,
    balanceCents: row.balance_cents,
    enabled: row.enabled === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const DEFAULT_ACCOUNTS: Array<{
  code: string;
  name: string;
  type: LabLedgerAccountType;
  normalBalance: LabLedgerNormalBalance;
}> = [
  { code: '1000', name: 'Cash', type: 'asset', normalBalance: 'debit' },
  { code: '2000', name: 'Accounts payable', type: 'liability', normalBalance: 'credit' },
  { code: '3000', name: 'Equity', type: 'equity', normalBalance: 'credit' },
  { code: '4000', name: 'Revenue', type: 'revenue', normalBalance: 'credit' },
  { code: '5000', name: 'Expenses', type: 'expense', normalBalance: 'debit' },
];

export class LabLedgerRepository extends Repository {
  private statements: Partial<Record<LabLedgerSQLStatementKey, import('better-sqlite3').Statement>> = {};

  close(): void {
    this.statements = {};
  }

  async initialize(): Promise<void> {
    if (!this.db) {
      return;
    }
    bootstrapLabLedgerSchema(this.db);
    this.statements = createLabLedgerSQLStatements(this.db);
    this.seedDefaultAccountsIfEmpty();
  }

  private stmt(key: LabLedgerSQLStatementKey) {
    const statement = this.statements[key];
    if (!statement) {
      throw new Error(`LabLedger SQL statement not initialized: ${key}`);
    }
    return statement;
  }

  private seedDefaultAccountsIfEmpty(): void {
    const row = this.stmt(LabLedgerSQLStatementKeys.count_accounts).get() as { c: number };
    if ((row?.c ?? 0) > 0) {
      return;
    }
    for (const acct of DEFAULT_ACCOUNTS) {
      this.stmt(LabLedgerSQLStatementKeys.account_insert).run(
        randomUUID(),
        acct.code,
        acct.name,
        acct.type,
        acct.normalBalance,
        1,
      );
    }
  }

  listAccounts(): LabLedgerAccountRecord[] {
    const rows = this.stmt(LabLedgerSQLStatementKeys.accounts_all).all() as AccountRow[];
    return rows.map(mapAccount);
  }

  getAccountById(id: string): LabLedgerAccountRecord | null {
    const row = this.stmt(LabLedgerSQLStatementKeys.account_by_id).get(id) as AccountRow | undefined;
    return row ? mapAccount(row) : null;
  }

  codeExists(code: string): boolean {
    return this.getAccountIdByCode(code) != null;
  }

  getAccountIdByCode(code: string): string | null {
    const row = this.stmt(LabLedgerSQLStatementKeys.account_by_code).get(code) as { id: string } | undefined;
    return row?.id ?? null;
  }

  countEntries(): number {
    const row = this.stmt(LabLedgerSQLStatementKeys.count_entries).get() as { c: number };
    return row?.c ?? 0;
  }

  insertAccount(record: {
    id: string;
    code: string;
    name: string;
    type: LabLedgerAccountType;
    normalBalance: LabLedgerNormalBalance;
    enabled: boolean;
  }): void {
    this.stmt(LabLedgerSQLStatementKeys.account_insert).run(
      record.id,
      record.code,
      record.name,
      record.type,
      record.normalBalance,
      record.enabled ? 1 : 0,
    );
  }

  updateAccount(record: LabLedgerAccountRecord): void {
    this.stmt(LabLedgerSQLStatementKeys.account_update).run(
      record.code,
      record.name,
      record.type,
      record.normalBalance,
      record.enabled ? 1 : 0,
      record.id,
    );
  }

  deleteAccount(id: string): void {
    this.stmt(LabLedgerSQLStatementKeys.account_delete).run(id);
  }

  adjustBalance(accountId: string, deltaCents: number): void {
    this.stmt(LabLedgerSQLStatementKeys.account_adjust_balance).run(deltaCents, accountId);
  }

  insertEntry(record: {
    id: string;
    occurredAt: string;
    memo: string | null;
    createdByUserId: number;
  }): void {
    this.stmt(LabLedgerSQLStatementKeys.entry_insert).run(
      record.id,
      record.occurredAt,
      record.memo,
      record.createdByUserId,
    );
  }

  insertLine(
    entryId: string,
    lineIndex: number,
    accountId: string,
    side: LabLedgerLineSide,
    amountCents: number,
  ): void {
    this.stmt(LabLedgerSQLStatementKeys.line_insert).run(entryId, lineIndex, accountId, side, amountCents);
  }

  listAllEntryIds(): string[] {
    const rows = this.stmt(LabLedgerSQLStatementKeys.entries_all_ids).all() as Array<{ id: string }>;
    return rows.map((row) => row.id);
  }

  listRecentEntries(): LabLedgerEntryRecord[] {
    const rows = this.stmt(LabLedgerSQLStatementKeys.entries_recent).all() as Array<{
      id: string;
      occurred_at: string;
      memo: string | null;
      created_by_user_id: number;
      created_at: string;
    }>;
    return rows.map((row) => ({
      id: row.id,
      occurredAt: row.occurred_at,
      memo: row.memo ?? undefined,
      createdByUserId: row.created_by_user_id,
      lines: this.listLinesForEntry(row.id),
      createdAt: row.created_at,
    }));
  }

  deleteEntry(id: string): boolean {
    const entry = this.getEntryById(id);
    if (!entry) {
      return false;
    }
    for (const line of entry.lines) {
      const account = this.getAccountById(line.accountId);
      if (account) {
        const delta = labLedgerBalanceDelta(account.normalBalance, line.side, line.amountCents);
        this.adjustBalance(line.accountId, -delta);
      }
    }
    this.stmt(LabLedgerSQLStatementKeys.entry_delete).run(id);
    return true;
  }

  getEntryById(id: string): LabLedgerEntryRecord | null {
    const row = this.stmt(LabLedgerSQLStatementKeys.entry_by_id).get(id) as
      | {
          id: string;
          occurred_at: string;
          memo: string | null;
          created_by_user_id: number;
          created_at: string;
        }
      | undefined;
    if (!row) {
      return null;
    }
    return {
      id: row.id,
      occurredAt: row.occurred_at,
      memo: row.memo ?? undefined,
      createdByUserId: row.created_by_user_id,
      lines: this.listLinesForEntry(row.id),
      createdAt: row.created_at,
    };
  }

  listLinesForEntry(entryId: string): LabLedgerEntryLineRecord[] {
    const rows = this.stmt(LabLedgerSQLStatementKeys.lines_for_entry).all(entryId) as Array<{
      entry_id: string;
      line_index: number;
      account_id: string;
      side: string;
      amount_cents: number;
    }>;
    return rows.map((row) => ({
      lineIndex: row.line_index,
      accountId: row.account_id,
      side: row.side as LabLedgerLineSide,
      amountCents: row.amount_cents,
    }));
  }

  clearAllForTests(): void {
    if (!this.db) {
      return;
    }
    this.db.prepare('DELETE FROM lab_ledger_entry_lines').run();
    this.db.prepare('DELETE FROM lab_ledger_entries').run();
    this.db.prepare('DELETE FROM lab_ledger_accounts').run();
  }
}

export const labLedgerRepository = new LabLedgerRepository();
