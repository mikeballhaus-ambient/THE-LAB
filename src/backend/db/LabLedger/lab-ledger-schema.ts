import type { Database } from 'better-sqlite3';

export const createLabLedgerAccountsTable = `
  CREATE TABLE IF NOT EXISTS lab_ledger_accounts (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    normal_balance TEXT NOT NULL CHECK(normal_balance IN ('debit', 'credit')),
    balance_cents INTEGER NOT NULL DEFAULT 0,
    enabled INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`;

export const createLabLedgerEntriesTable = `
  CREATE TABLE IF NOT EXISTS lab_ledger_entries (
    id TEXT PRIMARY KEY,
    occurred_at TEXT NOT NULL,
    memo TEXT,
    created_by_user_id INTEGER NOT NULL REFERENCES users(id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`;

export const createLabLedgerEntryLinesTable = `
  CREATE TABLE IF NOT EXISTS lab_ledger_entry_lines (
    entry_id TEXT NOT NULL REFERENCES lab_ledger_entries(id) ON DELETE CASCADE,
    line_index INTEGER NOT NULL,
    account_id TEXT NOT NULL REFERENCES lab_ledger_accounts(id),
    side TEXT NOT NULL CHECK(side IN ('debit', 'credit')),
    amount_cents INTEGER NOT NULL,
    PRIMARY KEY (entry_id, line_index)
  );
`;

export function bootstrapLabLedgerSchema(db: Database): void {
  db.exec(createLabLedgerAccountsTable);
  db.exec(createLabLedgerEntriesTable);
  db.exec(createLabLedgerEntryLinesTable);
}

export const LabLedgerSQLStatementKeys = {
  accounts_all: 'accounts_all',
  account_by_id: 'account_by_id',
  account_by_code: 'account_by_code',
  account_insert: 'account_insert',
  account_update: 'account_update',
  account_delete: 'account_delete',
  account_adjust_balance: 'account_adjust_balance',
  entry_insert: 'entry_insert',
  line_insert: 'line_insert',
  entries_recent: 'entries_recent',
  lines_for_entry: 'lines_for_entry',
  count_accounts: 'count_accounts',
  count_entries: 'count_entries',
  entry_by_id: 'entry_by_id',
  entry_delete: 'entry_delete',
  entries_all_ids: 'entries_all_ids',
} as const;

export type LabLedgerSQLStatementKey = keyof typeof LabLedgerSQLStatementKeys;

export const createLabLedgerSQLStatements = (
  db: Database,
): Record<LabLedgerSQLStatementKey, ReturnType<Database['prepare']>> => {
  const q = (sql: string) => db.prepare(sql);

  return {
    [LabLedgerSQLStatementKeys.accounts_all]: q(`
      SELECT id, code, name, type, normal_balance, balance_cents, enabled, created_at, updated_at
      FROM lab_ledger_accounts
      ORDER BY code ASC
    `),
    [LabLedgerSQLStatementKeys.account_by_id]: q(`
      SELECT id, code, name, type, normal_balance, balance_cents, enabled, created_at, updated_at
      FROM lab_ledger_accounts WHERE id = ?
    `),
    [LabLedgerSQLStatementKeys.account_by_code]: q(`
      SELECT id FROM lab_ledger_accounts WHERE code = ?
    `),
    [LabLedgerSQLStatementKeys.account_insert]: q(`
      INSERT INTO lab_ledger_accounts (id, code, name, type, normal_balance, enabled, balance_cents)
      VALUES (?, ?, ?, ?, ?, ?, 0)
    `),
    [LabLedgerSQLStatementKeys.account_update]: q(`
      UPDATE lab_ledger_accounts
      SET code = ?, name = ?, type = ?, normal_balance = ?, enabled = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `),
    [LabLedgerSQLStatementKeys.account_delete]: q(`
      DELETE FROM lab_ledger_accounts WHERE id = ?
    `),
    [LabLedgerSQLStatementKeys.account_adjust_balance]: q(`
      UPDATE lab_ledger_accounts
      SET balance_cents = balance_cents + ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `),
    [LabLedgerSQLStatementKeys.entry_insert]: q(`
      INSERT INTO lab_ledger_entries (id, occurred_at, memo, created_by_user_id)
      VALUES (?, ?, ?, ?)
    `),
    [LabLedgerSQLStatementKeys.line_insert]: q(`
      INSERT INTO lab_ledger_entry_lines (entry_id, line_index, account_id, side, amount_cents)
      VALUES (?, ?, ?, ?, ?)
    `),
    [LabLedgerSQLStatementKeys.entries_recent]: q(`
      SELECT id, occurred_at, memo, created_by_user_id, created_at
      FROM lab_ledger_entries
      ORDER BY occurred_at DESC
      LIMIT 50
    `),
    [LabLedgerSQLStatementKeys.lines_for_entry]: q(`
      SELECT entry_id, line_index, account_id, side, amount_cents
      FROM lab_ledger_entry_lines
      WHERE entry_id = ?
      ORDER BY line_index ASC
    `),
    [LabLedgerSQLStatementKeys.count_accounts]: q(`
      SELECT COUNT(*) AS c FROM lab_ledger_accounts
    `),
    [LabLedgerSQLStatementKeys.count_entries]: q(`
      SELECT COUNT(*) AS c FROM lab_ledger_entries
    `),
    [LabLedgerSQLStatementKeys.entry_by_id]: q(`
      SELECT id, occurred_at, memo, created_by_user_id, created_at
      FROM lab_ledger_entries WHERE id = ?
    `),
    [LabLedgerSQLStatementKeys.entry_delete]: q(`
      DELETE FROM lab_ledger_entries WHERE id = ?
    `),
    [LabLedgerSQLStatementKeys.entries_all_ids]: q(`
      SELECT id FROM lab_ledger_entries
    `),
  };
};
