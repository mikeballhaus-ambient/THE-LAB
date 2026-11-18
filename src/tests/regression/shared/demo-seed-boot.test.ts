import { describe, expect, test } from '@jest/globals';
import Database from 'better-sqlite3';
import { okrGoalsDemoAdapter } from '@/apps/okr-goals/back-end/db/seed-okr-goals-demo';
import { runDemoSeedOnBoot } from '@/shared/server/demo-seed-boot';

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

const OKR_DDL = `
  CREATE TABLE okr_objectives (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL,
    owner_name TEXT NOT NULL DEFAULT '', quarter TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now')));
  CREATE TABLE okr_key_results (id INTEGER PRIMARY KEY AUTOINCREMENT, objective_id INTEGER NOT NULL,
    title TEXT NOT NULL, metric TEXT NOT NULL DEFAULT '', baseline REAL NOT NULL DEFAULT 0,
    target REAL NOT NULL DEFAULT 100, current REAL NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'not-started', "order" INTEGER NOT NULL DEFAULT 0);
`;

describe('runDemoSeedOnBoot', () => {
  test('seeds once and is a no-op on second boot (simulated)', () => {
    const db = new Database(':memory:');
    db.exec(CONFIGS);
    db.exec(OKR_DDL);

    runDemoSeedOnBoot(db, 'app-okr-goals', okrGoalsDemoAdapter);
    const afterFirst = (db.prepare('SELECT COUNT(*) AS c FROM okr_objectives').get() as { c: number }).c;
    expect(afterFirst).toBe(3);

    runDemoSeedOnBoot(db, 'app-okr-goals', okrGoalsDemoAdapter);
    const afterSecond = (db.prepare('SELECT COUNT(*) AS c FROM okr_objectives').get() as { c: number }).c;
    expect(afterSecond).toBe(3);
  });
});
