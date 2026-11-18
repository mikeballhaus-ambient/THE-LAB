import type { Database } from 'better-sqlite3';
import { createMatchTables } from '@/shared/game-platform/match-schema';

/** Match-table prefix for this app (`cf_*`). */
export const CONNECT_FOUR_TABLE_PREFIX = 'cf';

/** Create the shared-kit match stack for Connect Four (idempotent). */
export function bootstrapConnectFourTables(db: Database): void {
  createMatchTables(db, CONNECT_FOUR_TABLE_PREFIX);
}
