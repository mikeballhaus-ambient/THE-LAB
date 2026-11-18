import type { Database } from 'better-sqlite3';
import { createMatchTables } from '@/shared/game-platform/match-schema';

export const BLACKJACK_TABLE_PREFIX = 'bj';

export function bootstrapBlackjackTables(db: Database): void {
  createMatchTables(db, BLACKJACK_TABLE_PREFIX);
}
