import type { Database } from 'better-sqlite3';
import { createMatchTables } from '@/shared/game-platform/match-schema';

/** Match-table prefix for this app (`ch_*`). */
export const CHESS_TABLE_PREFIX = 'ch';

/** Create the shared-kit match stack for Chess (idempotent). */
export function bootstrapChessTables(db: Database): void {
  createMatchTables(db, CHESS_TABLE_PREFIX);
}
