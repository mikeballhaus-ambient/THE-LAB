import type { Database } from 'better-sqlite3';

export const createUserAuthIdentitiesTable = `
CREATE TABLE IF NOT EXISTS user_auth_identities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userid INTEGER NOT NULL,
  provider TEXT NOT NULL,
  provider_subject TEXT NOT NULL,
  email TEXT,
  email_verified INTEGER NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (provider, provider_subject),
  FOREIGN KEY (userid) REFERENCES users(id) ON DELETE CASCADE
);
`;

export function ensureUserAuthIdentitiesSchema(db: Database): void {
  db.exec(createUserAuthIdentitiesTable);
  const userCols = db.prepare(`PRAGMA table_info(users)`).all() as { name: string }[];
  if (!userCols.some((c) => c.name === 'email_verified')) {
    db.exec(`ALTER TABLE users ADD COLUMN email_verified INTEGER NOT NULL DEFAULT 0`);
  }
}
