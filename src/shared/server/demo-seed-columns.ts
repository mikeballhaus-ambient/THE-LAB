import type { Database } from 'better-sqlite3';

/**
 * Column helpers for demo seeds.
 *
 * Phase 31 adds the `*_id` person columns when an app server boots
 * (`runPersonColumnMigrations`). Settings → App demo data can apply a pack against the
 * on-disk SQLite file **without** that server ever having started, so seeds must be able
 * to create the column themselves. The two paths are idempotent and agree on the shape:
 * `ALTER TABLE ... ADD COLUMN {col} INTEGER`.
 */

/** Quote a SQLite identifier (`order`, `group`, … are reserved words). */
export function quoteIdent(identifier: string): string {
  return `"${identifier.replace(/"/g, '""')}"`;
}

export function tableExists(db: Database, table: string): boolean {
  return Boolean(
    db.prepare(`SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ? LIMIT 1`).get(table),
  );
}

export function columnExists(db: Database, table: string, column: string): boolean {
  if (!tableExists(db, table)) {
    return false;
  }
  const rows = db.prepare(`PRAGMA table_info(${quoteIdent(table)})`).all() as { name: string }[];
  return rows.some((row) => row.name === column);
}

/** Add an `INTEGER` person column when missing; no-op when the table or column already exists. */
export function ensurePersonIdColumn(db: Database, table: string, column: string): boolean {
  if (!tableExists(db, table) || columnExists(db, table, column)) {
    return false;
  }
  db.exec(`ALTER TABLE ${quoteIdent(table)} ADD COLUMN ${quoteIdent(column)} INTEGER`);
  return true;
}

/** Add a nullable TEXT column when missing (used for seed provenance on tables without one). */
export function ensureTextColumn(
  db: Database,
  table: string,
  column: string,
  defaultValue = '',
): boolean {
  if (!tableExists(db, table) || columnExists(db, table, column)) {
    return false;
  }
  db.exec(
    `ALTER TABLE ${quoteIdent(table)} ADD COLUMN ${quoteIdent(column)} TEXT DEFAULT '${defaultValue.replace(/'/g, "''")}'`,
  );
  return true;
}

/**
 * Build an `INSERT` that omits columns the table does not have.
 *
 * Lets one seed run against both a freshly created table (no `*_id` column) and a
 * phase-31-migrated table without branching at every call site. Identifiers are quoted so
 * reserved column names (`order`) work.
 */
export function insertRow(
  db: Database,
  table: string,
  values: Record<string, string | number | null>,
): number {
  const available = new Set(
    (db.prepare(`PRAGMA table_info(${quoteIdent(table)})`).all() as { name: string }[]).map(
      (row) => row.name,
    ),
  );
  const columns = Object.keys(values).filter((key) => available.has(key));
  if (columns.length === 0) {
    throw new Error(`insertRow: no matching columns for table ${table}`);
  }
  const placeholders = columns.map(() => '?').join(', ');
  const result = db
    .prepare(
      `INSERT INTO ${quoteIdent(table)} (${columns.map(quoteIdent).join(', ')}) VALUES (${placeholders})`,
    )
    .run(...columns.map((key) => values[key]));
  return Number(result.lastInsertRowid);
}
