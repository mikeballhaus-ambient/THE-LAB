import { describe, expect, test } from '@jest/globals';
import Database from 'better-sqlite3';
import {
  hasSuggestionDemoDataset,
  removeSuggestionDemo,
  seedSuggestionDemoIfMissing,
  SUGGESTION_DEMO_PACK_ID,
} from '@/apps/suggestion-box/back-end/db/seed-suggestion-demo';
import { syncAppSeedBootFlagForPack } from '@/shared/config/app-seed-boot-flags';

const CONFIGS = `
  CREATE TABLE configs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    key TEXT NOT NULL UNIQUE,
    value TEXT NOT NULL,
    type TEXT DEFAULT 'string',
    description TEXT DEFAULT NULL
  );
`;

const SUGGESTION_DDL = `
  CREATE TABLE suggestions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    body TEXT NOT NULL DEFAULT '',
    author TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'open',
    votes INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`;

/**
 * Mirrors Settings → Apply / Remove for one catalog pack (rm-64 §30.3) without loading
 * `catalog-demo-seed-direct.ts`'s lazy 15-app import graph (Jest ESM cache).
 */
describe('catalog demo seed Settings round-trip', () => {
  test('apply → remove → re-apply does not duplicate rows', () => {
    const db = new Database(':memory:');
    db.exec(CONFIGS);
    db.exec(SUGGESTION_DDL);

    const appId = 'app-suggestion-box';

    expect(hasSuggestionDemoDataset(db)).toBe(false);

    syncAppSeedBootFlagForPack(db, appId, SUGGESTION_DEMO_PACK_ID, false);
    expect(seedSuggestionDemoIfMissing(db, { adminApply: true }).inserted).toBeGreaterThan(0);
    expect(hasSuggestionDemoDataset(db)).toBe(true);
    const afterApply = (db.prepare('SELECT COUNT(*) AS c FROM suggestions').get() as { c: number }).c;
    expect(afterApply).toBe(5);

    removeSuggestionDemo(db);
    syncAppSeedBootFlagForPack(db, appId, SUGGESTION_DEMO_PACK_ID, true);
    expect(hasSuggestionDemoDataset(db)).toBe(false);

    syncAppSeedBootFlagForPack(db, appId, SUGGESTION_DEMO_PACK_ID, false);
    seedSuggestionDemoIfMissing(db, { adminApply: true });
    expect((db.prepare('SELECT COUNT(*) AS c FROM suggestions').get() as { c: number }).c).toBe(5);
  });
});
