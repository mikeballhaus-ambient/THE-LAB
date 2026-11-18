import type Database from 'better-sqlite3';

function tableHasColumn(db: Database.Database, table: string, column: string): boolean {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  return columns.some((c) => c.name === column);
}

export function ensureCanModifyTagsPermissionColumns(db: Database.Database): void {
  if (!tableHasColumn(db, 'user_global_permissions', 'canModifyTags')) {
    db.exec(
      `ALTER TABLE user_global_permissions ADD COLUMN canModifyTags INTEGER NOT NULL DEFAULT 0`,
    );
    db.exec(`
      UPDATE user_global_permissions
      SET canModifyTags = 1
      WHERE userid IN (SELECT id FROM users WHERE role IN ('owner', 'admin'))
    `);
  }

  if (!tableHasColumn(db, 'user_app_permissions', 'canModifyTags')) {
    db.exec(`ALTER TABLE user_app_permissions ADD COLUMN canModifyTags INTEGER NOT NULL DEFAULT 0`);
  }
}
