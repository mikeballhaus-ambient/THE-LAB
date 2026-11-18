import type { Database } from 'better-sqlite3';

/** Add optional CTA buttons JSON on inbox rows (workflow notify_users actions). */
export function ensureLabUserNotificationsActionsColumn(db: Database): void {
  type ColumnRow = { name: string };
  const columns = db.prepare('PRAGMA table_info(lab_user_notifications)').all() as ColumnRow[];
  if (columns.some((column) => column.name === 'actions_json')) {
    return;
  }
  db.exec('ALTER TABLE lab_user_notifications ADD COLUMN actions_json TEXT');
}
