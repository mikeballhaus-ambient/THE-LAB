export const LAB_VIRTUAL_BANK_ACCOUNTS_TABLE = 'lab_virtual_bank_accounts';
export const LAB_VIRTUAL_BANK_LEDGER_TABLE = 'lab_virtual_bank_ledger';

export const CREATE_LAB_VIRTUAL_BANK_ACCOUNTS = `
CREATE TABLE IF NOT EXISTS ${LAB_VIRTUAL_BANK_ACCOUNTS_TABLE} (
  lab_user_id INTEGER PRIMARY KEY,
  balance INTEGER NOT NULL,
  last_daily_accrual_date TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (lab_user_id) REFERENCES users(id) ON DELETE CASCADE
);
`;

export const CREATE_LAB_VIRTUAL_BANK_LEDGER = `
CREATE TABLE IF NOT EXISTS ${LAB_VIRTUAL_BANK_LEDGER_TABLE} (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lab_user_id INTEGER NOT NULL,
  delta INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  reason_code TEXT NOT NULL,
  reason_label TEXT NOT NULL,
  source_app_id TEXT,
  source_ref TEXT,
  metadata_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (lab_user_id) REFERENCES users(id) ON DELETE CASCADE
);
`;

export const CREATE_LAB_VIRTUAL_BANK_LEDGER_INDEX = `
CREATE INDEX IF NOT EXISTS idx_lab_virtual_bank_ledger_user_created
  ON ${LAB_VIRTUAL_BANK_LEDGER_TABLE} (lab_user_id, created_at DESC);
`;
