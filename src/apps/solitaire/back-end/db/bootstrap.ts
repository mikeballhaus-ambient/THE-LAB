import type { AppDatabaseServiceProxy } from '../../db/app-db-service';

/**
 * Solitaire app schema bootstrap. Runs on app server start (after
 * `AppDatabaseServiceProxy.initialize()`), before routes/socket handlers are used.
 */
export async function runSolitaireDbBootstrap(db: AppDatabaseServiceProxy): Promise<void> {
  await db.executeRaw({
    sql: `CREATE TABLE IF NOT EXISTS solitaire_migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      migration_name TEXT NOT NULL UNIQUE,
      description TEXT,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    params: [],
  });

  await db.executeRaw({
    sql: `CREATE TABLE IF NOT EXISTS solitaire_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      game_id TEXT NOT NULL,
      lab_user_id INTEGER NOT NULL,
      outcome TEXT NOT NULL,
      primary_value REAL NOT NULL,
      secondary_value REAL,
      duration_ms INTEGER NOT NULL,
      metadata_json TEXT,
      run_id TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    params: [],
  });

  await db.executeRaw({
    sql: `CREATE TABLE IF NOT EXISTS solitaire_personal_bests (
      lab_user_id INTEGER NOT NULL,
      game_id TEXT NOT NULL,
      score_kind TEXT NOT NULL,
      primary_value REAL NOT NULL,
      secondary_value REAL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (lab_user_id, game_id, score_kind)
    )`,
    params: [],
  });
}
