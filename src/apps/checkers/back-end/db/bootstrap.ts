import type { Database } from 'better-sqlite3';
import { createMatchTables } from '@/shared/game-platform/match-schema';

/** Match-table prefix for this app (`ck_*`). */
export const CHECKERS_TABLE_PREFIX = 'ck';

/** Create the shared-kit match stack for Checkers (idempotent). */
export function bootstrapCheckersTables(db: Database): void {
  createMatchTables(db, CHECKERS_TABLE_PREFIX);
}
