import type { Database } from 'better-sqlite3';
import { createMatchTables } from '@/shared/game-platform/match-schema';

/** Match-table prefix for this app (`hm_*`). */
export const HANGMAN_TABLE_PREFIX = 'hm';

/**
 * Create the shared-kit match stack for Hangman.
 * `createMatchTables` is idempotent and owns the DDL.
 */
export function bootstrapHangmanTables(db: Database): void {
  createMatchTables(db, HANGMAN_TABLE_PREFIX);
}
