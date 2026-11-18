import type Database from 'better-sqlite3';

export function ensureUsersMustChangePasswordColumn(db: Database.Database): void {
  const columns = db.prepare(`PRAGMA table_info(users)`).all() as { name: string }[];
  if (columns.some((c) => c.name === 'must_change_password')) {
    return;
  }
  db.exec(
    `ALTER TABLE users ADD COLUMN must_change_password INTEGER NOT NULL DEFAULT 0`,
  );
}

export function ensureUsersDeveloperModeColumn(db: Database.Database): void {
  const columns = db.prepare(`PRAGMA table_info(users)`).all() as { name: string }[];
  if (columns.some((c) => c.name === 'developer_mode')) {
    return;
  }
  db.exec(`ALTER TABLE users ADD COLUMN developer_mode INTEGER NOT NULL DEFAULT 0`);
  db.prepare(`UPDATE users SET developer_mode = 1 WHERE id = 1`).run();
}
