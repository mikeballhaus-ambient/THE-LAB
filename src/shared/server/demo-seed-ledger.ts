import type { Database } from 'better-sqlite3';
import { isAppSeedBootDisabled } from '@/shared/config/app-seed-boot-flags';

/**
 * Bookkeeping for app demo seed packs.
 *
 * Every demo seed owns a `demo_seed_rows` table in its own app DB. Each inserted row is
 * recorded there, so:
 *
 * - `hasDemoDataset()` is an exact lookup instead of a string search;
 * - `removeDemo()` deletes **only** rows the seed created, leaving user data untouched;
 * - re-running a seed is idempotent without `INSERT OR IGNORE` gymnastics.
 *
 * A marker column (`notes`, `metadata`, …) would be cheaper, but not every Wave C table has
 * one. The ledger works uniformly and costs one small table per app DB.
 */

const CREATE_LEDGER = `
  CREATE TABLE IF NOT EXISTS demo_seed_rows (
    pack_id TEXT NOT NULL,
    table_name TEXT NOT NULL,
    row_id INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (pack_id, table_name, row_id)
  );
`;

export class DemoSeedLedger {
  constructor(
    private readonly db: Database,
    private readonly packId: string,
  ) {
    this.db.exec(CREATE_LEDGER);
  }

  /** True when this pack has recorded at least one row (optionally for a specific table). */
  has(tableName?: string): boolean {
    const row = tableName
      ? this.db
          .prepare(
            `SELECT 1 FROM demo_seed_rows WHERE pack_id = ? AND table_name = ? LIMIT 1`,
          )
          .get(this.packId, tableName)
      : this.db
          .prepare(`SELECT 1 FROM demo_seed_rows WHERE pack_id = ? LIMIT 1`)
          .get(this.packId);
    return Boolean(row);
  }

  /** Total tracked rows for this pack. */
  count(): number {
    const row = this.db
      .prepare(`SELECT COUNT(*) AS c FROM demo_seed_rows WHERE pack_id = ?`)
      .get(this.packId) as { c: number };
    return row.c;
  }

  /** Record an inserted row. */
  track(tableName: string, rowId: number): void {
    this.db
      .prepare(
        `INSERT OR IGNORE INTO demo_seed_rows (pack_id, table_name, row_id) VALUES (?, ?, ?)`,
      )
      .run(this.packId, tableName, rowId);
  }

  /** Track several rows of the same table at once. */
  trackMany(tableName: string, rowIds: readonly number[]): void {
    for (const rowId of rowIds) {
      this.track(tableName, rowId);
    }
  }

  /** Tracked row ids for a table. */
  idsFor(tableName: string): number[] {
    const rows = this.db
      .prepare(
        `SELECT row_id FROM demo_seed_rows WHERE pack_id = ? AND table_name = ? ORDER BY row_id`,
      )
      .all(this.packId, tableName) as { row_id: number }[];
    return rows.map((row) => row.row_id);
  }

  /** All distinct tables this pack touched. */
  tables(): string[] {
    const rows = this.db
      .prepare(`SELECT DISTINCT table_name FROM demo_seed_rows WHERE pack_id = ?`)
      .all(this.packId) as { table_name: string }[];
    return rows.map((row) => row.table_name);
  }

  /**
   * Delete every tracked row and drop its ledger entries.
   *
   * Children are deleted before parents by passing tables in dependency order.
   */
  deleteTracked(tablesInDeleteOrder: readonly string[]): number {
    let removed = 0;
    for (const table of tablesInDeleteOrder) {
      const ids = this.idsFor(table);
      if (ids.length === 0) {
        continue;
      }
      const placeholders = ids.map(() => '?').join(', ');
      const result = this.db
        .prepare(`DELETE FROM ${table} WHERE id IN (${placeholders})`)
        .run(...ids);
      removed += result.changes;
    }
    this.db.prepare(`DELETE FROM demo_seed_rows WHERE pack_id = ?`).run(this.packId);
    return removed;
  }
}

export interface DemoSeedGateOptions {
  /** Settings admin Apply — ignores the boot-suppression flag. */
  adminApply?: boolean;
}

/**
 * Standard boot gate for a demo seed.
 *
 * Returns `true` when the seed should do nothing: either the admin removed the pack in
 * Settings (boot flag set) and this is not an explicit admin apply, or the dataset is
 * already present.
 */
export function shouldSkipDemoSeed(
  db: Database,
  ledger: DemoSeedLedger,
  bootFlagKey: string,
  options?: DemoSeedGateOptions,
): boolean {
  if (!options?.adminApply && isAppSeedBootDisabled(db, bootFlagKey)) {
    return true;
  }
  return ledger.has();
}

/** `YYYY-MM-DDTHH:MM:SS` for a fixed demo date, safe for SQLite text columns. */
export function demoDateTime(date: string, time = '09:00:00'): string {
  return `${date}T${time}`;
}

/** Shift a `YYYY-MM-DD` demo date by whole days (no local-time surprises). */
export function shiftDemoDate(date: string, days: number): string {
  const base = new Date(`${date}T00:00:00Z`);
  base.setUTCDate(base.getUTCDate() + days);
  return base.toISOString().slice(0, 10);
}
