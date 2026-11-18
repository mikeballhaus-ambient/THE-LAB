import type { Database } from 'better-sqlite3';
import { createMatchTables } from '@/shared/game-platform/match-schema';

/** Match-table prefix for this app (`ttt_*`). */
export const TIC_TAC_TOE_TABLE_PREFIX = 'ttt';

/**
 * Create the shared-kit match stack for Tic-Tac-Toe.
 *
 * `createMatchTables` is idempotent and owns the DDL, so this app never
 * re-declares match/run tables by hand.
 */
export function bootstrapTicTacToeTables(db: Database): void {
  createMatchTables(db, TIC_TAC_TOE_TABLE_PREFIX);
}
