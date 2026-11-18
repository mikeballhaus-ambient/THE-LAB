/**
 * Match/run table DDL for the shared game platform.
 *
 * Each app calls {@link createMatchTables} with its own prefix at boot so two
 * games on the same SQLite file never collide (e.g. `ttt_matches`, `wt_matches`).
 */
import type { Database } from 'better-sqlite3';

export interface MatchTableNames {
  matches: string;
  invites: string;
  runs: string;
  personalBests: string;
}

const PREFIX_PATTERN = /^[a-z0-9_]+$/i;

export function resolveMatchTableNames(prefix: string): MatchTableNames {
  if (!PREFIX_PATTERN.test(prefix)) {
    throw new Error(`Invalid match table prefix: ${prefix}`);
  }
  return {
    matches: `${prefix}_matches`,
    invites: `${prefix}_invites`,
    runs: `${prefix}_runs`,
    personalBests: `${prefix}_personal_bests`,
  };
}

/** Create all match-stack tables (idempotent). Returns the resolved table names. */
export function createMatchTables(db: Database, prefix: string): MatchTableNames {
  const t = resolveMatchTableNames(prefix);

  db.exec(`
    CREATE TABLE IF NOT EXISTS ${t.runs} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      game_id TEXT NOT NULL,
      lab_user_id INTEGER NOT NULL,
      difficulty TEXT,
      outcome TEXT NOT NULL,
      primary_value REAL NOT NULL,
      agent_primary_value REAL,
      secondary_value REAL,
      duration_ms INTEGER NOT NULL,
      metadata_json TEXT,
      run_id TEXT NOT NULL UNIQUE,
      opponent_kind TEXT,
      opponent_user_id INTEGER,
      match_id TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS ${t.personalBests} (
      lab_user_id INTEGER NOT NULL,
      game_id TEXT NOT NULL,
      score_kind TEXT NOT NULL,
      primary_value REAL NOT NULL,
      secondary_value REAL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (lab_user_id, game_id, score_kind)
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS ${t.matches} (
      id TEXT PRIMARY KEY,
      game_id TEXT NOT NULL,
      status TEXT NOT NULL,
      opponent_kind TEXT NOT NULL,
      difficulty TEXT,
      player1_id INTEGER NOT NULL,
      player2_id INTEGER NOT NULL,
      current_seat INTEGER NOT NULL DEFAULT 1,
      state_json TEXT NOT NULL,
      rules_json TEXT,
      turn_started_at TEXT,
      winner_id INTEGER,
      state_version INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  const matchCols = db.prepare(`PRAGMA table_info(${t.matches})`).all() as { name: string }[];
  if (!matchCols.some((c) => c.name === 'state_version')) {
    db.exec(`ALTER TABLE ${t.matches} ADD COLUMN state_version INTEGER NOT NULL DEFAULT 0`);
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS ${t.invites} (
      id TEXT PRIMARY KEY,
      game_id TEXT NOT NULL,
      inviter_id INTEGER NOT NULL,
      invitee_id INTEGER NOT NULL,
      rules_json TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      match_id TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  db.exec(
    `CREATE INDEX IF NOT EXISTS idx_${t.personalBests}_game ON ${t.personalBests}(game_id, primary_value)`,
  );

  return t;
}
