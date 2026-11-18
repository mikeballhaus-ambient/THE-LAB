import type { Database } from 'better-sqlite3';
import { createMatchTables } from '@/shared/game-platform/match-schema';

export const BILLIARDS_TABLE_PREFIX = 'bl';

export function bootstrapBilliardsTables(db: Database): void {
  createMatchTables(db, BILLIARDS_TABLE_PREFIX);
}
