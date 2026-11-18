import type { Database, Statement } from 'better-sqlite3';

export const createUserInstructionsTable = `
  CREATE TABLE IF NOT EXISTS user_instructions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userid INTEGER NOT NULL,
    text TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userid) REFERENCES users(id) ON DELETE CASCADE
  );
`

export const createUserInstructionsIndex = `
  CREATE INDEX IF NOT EXISTS idx_user_instructions_userid ON user_instructions(userid);
`

export const seedDefaultUserInstructions = `
  INSERT OR REPLACE INTO user_instructions (userid, text, created_at, updated_at)
  VALUES ({{USERID}}, '', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
`;

export const UserInstructionsSQLStatementKeys = {
  // Queries
  selectAll: 'selectAll',
  selectByUserId: 'selectByUserId',

  // CRUD statements
  insert: 'insert',
  update: 'update',
  delete: 'delete',
} as const;

export type UserInstructionsSQLStatementKey = typeof UserInstructionsSQLStatementKeys[keyof typeof UserInstructionsSQLStatementKeys]

export function createUserInstructionsSQLStatements(
  db: Database,
): Record<UserInstructionsSQLStatementKey, Statement> {
  const q = (sql: string) => db.prepare(sql);

  return {
    // Query statements

    [UserInstructionsSQLStatementKeys.selectAll]: q(`
      SELECT * FROM user_instructions ORDER BY created_at ASC
    `),

    [UserInstructionsSQLStatementKeys.selectByUserId]: q(`
      SELECT * FROM user_instructions WHERE userid = ? ORDER BY created_at ASC
    `),

    // CRUD statements
    [UserInstructionsSQLStatementKeys.insert]: q(`
      INSERT INTO user_instructions (userid, text, created_at, updated_at)
      VALUES (?, ?, ?, ?)
    `),

    [UserInstructionsSQLStatementKeys.update]: q(`
      UPDATE user_instructions
      SET text = ?, updated_at = ?
      WHERE userid = ?
    `),

    // Delete statement
    [UserInstructionsSQLStatementKeys.delete]: q(`
      DELETE FROM user_instructions WHERE userid = ?
    `),
  };
};
