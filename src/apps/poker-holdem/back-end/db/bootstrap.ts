import type { Database } from 'better-sqlite3';
import { createMatchTables } from '@/shared/game-platform/match-schema';

/** Match-table prefix for this app (`pk_*`). */
export const POKER_TABLE_PREFIX = 'pk';

/** Create the shared-kit match stack for Poker (idempotent). */
export function bootstrapPokerTables(db: Database): void {
  createMatchTables(db, POKER_TABLE_PREFIX);
}
