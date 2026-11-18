import type { Database } from 'better-sqlite3';
import { createMatchTables } from '@/shared/game-platform/match-schema';
import type { AppDatabaseServiceProxy } from '../../db/app-db-service';

/** Match-table prefix (`tw_*`) — must match {@link WORD_TILE_CONFIG.matchTablePrefix}. */
export const WORD_TILE_TABLE_PREFIX = 'tw';

export function bootstrapWordTileTables(db: Database): void {
  createMatchTables(db, WORD_TILE_TABLE_PREFIX);
}

export async function runWordTileDbBootstrap(db: AppDatabaseServiceProxy): Promise<void> {
  await db.executeRaw({
    sql: `CREATE TABLE IF NOT EXISTS word_tile_migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      migration_name TEXT NOT NULL UNIQUE,
      description TEXT,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    params: [],
  });

  bootstrapWordTileTables(db.getDb());
}
