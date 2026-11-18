import type { Database } from 'better-sqlite3';
import { createMatchTables } from '@/shared/game-platform/match-schema';

/** Match-table prefix for this app (`bs_*`). */
export const BATTLESHIP_TABLE_PREFIX = 'bs';

/** Create the shared-kit match stack for Battleship (idempotent). */
export function bootstrapBattleshipTables(db: Database): void {
  createMatchTables(db, BATTLESHIP_TABLE_PREFIX);
}
