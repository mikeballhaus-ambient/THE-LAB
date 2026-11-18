import type { Database } from 'better-sqlite3';

export const LAB_DEMO_USERS_SEED_DISABLED_KEY = 'lab_demo_users_seed_disabled';

const CREATE_TABLE = `
CREATE TABLE IF NOT EXISTS lab_seed_boot_flags (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
`;

export function ensureLabSeedBootFlagsSchema(db: Database): void {
  db.exec(CREATE_TABLE);
}

export function isLabDemoUsersSeedBootDisabled(db: Database): boolean {
  ensureLabSeedBootFlagsSchema(db);
  const row = db.prepare('SELECT value FROM lab_seed_boot_flags WHERE key = ? LIMIT 1').get(
    LAB_DEMO_USERS_SEED_DISABLED_KEY,
  ) as { value: string } | undefined;
  return row?.value === '1';
}

export function setLabDemoUsersSeedBootDisabled(db: Database, disabled: boolean): void {
  ensureLabSeedBootFlagsSchema(db);
  if (disabled) {
    db.prepare(
      `INSERT INTO lab_seed_boot_flags (key, value, updated_at) VALUES (?, '1', datetime('now'))
       ON CONFLICT(key) DO UPDATE SET value = '1', updated_at = datetime('now')`,
    ).run(LAB_DEMO_USERS_SEED_DISABLED_KEY);
    return;
  }
  db.prepare('DELETE FROM lab_seed_boot_flags WHERE key = ?').run(LAB_DEMO_USERS_SEED_DISABLED_KEY);
}
