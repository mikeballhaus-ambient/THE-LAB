import type { Database } from 'better-sqlite3';

/**
 * Shared helper for Wave C catalog apps migrating a free-text person column to a
 * validated `*_user_id` column.
 *
 * Manifests declare person fields as `lookupProvider: 'lab-user'`, which means Forms
 * Builder submits a THE-LAB user id — but the underlying tables historically stored a
 * display name in `TEXT`. That mismatch is the gap this closes.
 *
 * Migration shape (per table):
 * 1. `ALTER TABLE ... ADD COLUMN {userCol} INTEGER` when missing.
 * 2. Backfill: match `{textCol}` against platform `users.name` / `users.email` (case-insensitive)
 *    and write the id.
 * 3. Leave `{textCol}` intact as a display mirror — existing reads keep working.
 *
 * Backfill is best-effort: unresolvable names stay NULL rather than guessing. Re-running
 * is safe (only rows with `{userCol} IS NULL` are touched).
 */

export interface UserNameLookupRow {
  id: number;
  name: string;
  email: string;
}

/** Case-insensitive name/email → user id map. */
export function buildUserNameLookup(users: UserNameLookupRow[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const user of users) {
    const name = user.name?.trim().toLowerCase();
    if (name) {
      map.set(name, user.id);
    }
    const email = user.email?.trim().toLowerCase();
    if (email) {
      map.set(email, user.id);
    }
  }
  return map;
}

export interface PersonColumnMigration {
  table: string;
  /**
   * Existing free-text column holding a display name.
   *
   * Omit when the table has **no** person column at all (e.g. `time_entries`): the user
   * column is then added with no backfill, since there is nothing to map from.
   */
  textColumn?: string;
  /** New integer column holding a platform `users.id`. */
  userColumn: string;
}

export interface PersonColumnMigrationResult {
  columnsAdded: string[];
  rowsBackfilled: number;
}

function columnExists(db: Database, table: string, column: string): boolean {
  const rows = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  return rows.some((row) => row.name === column);
}

function tableExists(db: Database, table: string): boolean {
  const row = db
    .prepare(`SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ? LIMIT 1`)
    .get(table);
  return Boolean(row);
}

/**
 * Add the user-id column and backfill from the text column.
 *
 * Reads users directly from the app's own DB when a `users` table is present (platform
 * apps), otherwise callers should pass `users` explicitly (catalog apps have no `users`
 * table — they receive the lookup from the platform).
 */
export function migratePersonColumnToUserId(
  db: Database,
  migration: PersonColumnMigration,
  users: UserNameLookupRow[],
): PersonColumnMigrationResult {
  const result: PersonColumnMigrationResult = { columnsAdded: [], rowsBackfilled: 0 };

  if (!tableExists(db, migration.table)) {
    return result;
  }

  if (!columnExists(db, migration.table, migration.userColumn)) {
    db.exec(`ALTER TABLE ${migration.table} ADD COLUMN ${migration.userColumn} INTEGER`);
    result.columnsAdded.push(`${migration.table}.${migration.userColumn}`);
  }

  const textColumn = migration.textColumn?.trim();
  if (!textColumn) {
    // No source column — nothing to backfill. The column exists for new writes only.
    return result;
  }

  const lookup = buildUserNameLookup(users);
  if (lookup.size === 0) {
    return result;
  }

  const rows = db
    .prepare(
      `SELECT rowid AS rid, ${textColumn} AS text_value
       FROM ${migration.table}
       WHERE ${migration.userColumn} IS NULL
         AND ${textColumn} IS NOT NULL
         AND TRIM(${textColumn}) != ''`,
    )
    .all() as Array<{ rid: number; text_value: string }>;

  const update = db.prepare(
    `UPDATE ${migration.table} SET ${migration.userColumn} = ? WHERE rowid = ?`,
  );

  for (const row of rows) {
    const userId = lookup.get(String(row.text_value).trim().toLowerCase());
    if (userId == null) {
      continue;
    }
    update.run(userId, row.rid);
    result.rowsBackfilled += 1;
  }

  return result;
}

/** Apply several person-column migrations in one pass. */
export function migratePersonColumnsToUserId(
  db: Database,
  migrations: readonly PersonColumnMigration[],
  users: UserNameLookupRow[],
): PersonColumnMigrationResult {
  const total: PersonColumnMigrationResult = { columnsAdded: [], rowsBackfilled: 0 };
  for (const migration of migrations) {
    const part = migratePersonColumnToUserId(db, migration, users);
    total.columnsAdded.push(...part.columnsAdded);
    total.rowsBackfilled += part.rowsBackfilled;
  }
  return total;
}
