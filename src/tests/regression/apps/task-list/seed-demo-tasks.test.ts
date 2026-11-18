import { describe, test, expect } from '@jest/globals';
import Database from 'better-sqlite3';
import {
  APP_SEED_BOOT_FLAG_KEYS,
  setAppSeedBootDisabled,
} from '@/shared/config/app-seed-boot-flags';
import { CRM_APP_REGISTRY_ID } from '@/apps/lab-tasklist/shared/constants/app-scope';
import {
  clearAllTaskListsAndTasks,
  hasNativeTaskListDemoDataset,
  hasScopedHostTaskListDemoDataset,
  hasTaskListDemoDataset,
  removeDemoTasks,
  seedDemoTasksIfMissing,
  TASK_LIST_DEMO_PACK_ID,
  DEMO_TASK_LIST_DESCRIPTIONS,
} from '@/apps/lab-tasklist/back-end/db/seed-demo-tasks';

function createTaskListSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE task_lists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      app_id TEXT,
      created_at TEXT,
      updated_at TEXT
    );
    CREATE TABLE tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT,
      priority TEXT,
      tags TEXT,
      metadata TEXT,
      created_at TEXT,
      updated_at TEXT
    );
    CREATE TABLE task_list_tasks (
      task_list_id INTEGER NOT NULL,
      task_id INTEGER NOT NULL
    );
    CREATE TABLE configs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      key TEXT NOT NULL UNIQUE,
      value TEXT NOT NULL,
      type TEXT DEFAULT 'string',
      description TEXT DEFAULT NULL
    );
  `);
}

describe('task-list seed-demo-tasks', () => {
  test('seedDemoTasksIfMissing inserts native and CRM-scoped demo tasks once', () => {
    const db = new Database(':memory:');
    createTaskListSchema(db);
    const first = seedDemoTasksIfMissing(db);
    const second = seedDemoTasksIfMissing(db);
    expect(first.insertedTasks).toBeGreaterThan(0);
    expect(second.insertedTasks).toBe(0);
    expect(hasTaskListDemoDataset(db)).toBe(true);
    expect(hasNativeTaskListDemoDataset(db)).toBe(true);
    expect(hasScopedHostTaskListDemoDataset(db, CRM_APP_REGISTRY_ID)).toBe(true);
    const scopedList = db
      .prepare(`SELECT app_id FROM task_lists WHERE name = 'CRM Tasks' LIMIT 1`)
      .get() as { app_id: string };
    expect(scopedList.app_id).toBe(CRM_APP_REGISTRY_ID);
    const nativeOnly = db
      .prepare(`SELECT COUNT(*) AS c FROM task_lists WHERE app_id IS NULL OR app_id = ''`)
      .get() as { c: number };
    expect(nativeOnly.c).toBe(3);
    const row = db
      .prepare(`SELECT COUNT(*) AS c FROM tasks WHERE metadata LIKE ?`)
      .get(`%${TASK_LIST_DEMO_PACK_ID}%`) as { c: number };
    expect(row.c).toBeGreaterThan(0);
    const descriptions = db
      .prepare(
        `SELECT name, description FROM task_lists WHERE app_id IS NULL OR app_id = '' ORDER BY name`,
      )
      .all() as { name: string; description: string }[];
    expect(descriptions.map((row) => row.description)).toEqual([
      DEMO_TASK_LIST_DESCRIPTIONS['Demo sprint'],
      DEMO_TASK_LIST_DESCRIPTIONS.Personal,
      DEMO_TASK_LIST_DESCRIPTIONS.Work,
    ]);
    db.close();
  });

  test('refreshNativeDemoListDescriptions updates generic demo list copy on apply', () => {
    const db = new Database(':memory:');
    createTaskListSchema(db);
    const now = new Date().toISOString();
    for (const name of ['Demo sprint', 'Work', 'Personal']) {
      db.prepare(
        `INSERT INTO task_lists (name, description, created_at, updated_at) VALUES (?, ?, ?, ?)`,
      ).run(name, `Demo list (${TASK_LIST_DEMO_PACK_ID})`, now, now);
    }
    seedDemoTasksIfMissing(db);
    const work = db
      .prepare(`SELECT description FROM task_lists WHERE name = 'Work' LIMIT 1`)
      .get() as { description: string };
    expect(work.description).toBe(DEMO_TASK_LIST_DESCRIPTIONS.Work);
    db.close();
  });

  test('seedDemoTasksIfMissing backfills CRM scoped tasks when native demo already exists', () => {
    const db = new Database(':memory:');
    createTaskListSchema(db);
    const now = new Date().toISOString();
    for (const name of ['Demo sprint', 'Work', 'Personal']) {
      db.prepare(
        `INSERT INTO task_lists (name, description, app_id, created_at, updated_at) VALUES (?, ?, NULL, ?, ?)`,
      ).run(name, `Demo list (${TASK_LIST_DEMO_PACK_ID})`, now, now);
    }
    const listId = (
      db.prepare(`SELECT id FROM task_lists WHERE name = 'Demo sprint' LIMIT 1`).get() as { id: number }
    ).id;
    const taskInsert = db.prepare(
      `INSERT INTO tasks (title, description, status, priority, tags, metadata, created_at, updated_at)
       VALUES (?, ?, 'pending', 'low', '[]', ?, ?, ?)`,
    ).run('Finalize Q4 roadmap', 'Seeded demo task for THE-LAB training.', `{"seedPack":"${TASK_LIST_DEMO_PACK_ID}"}`, now, now);
    db.prepare(`INSERT INTO task_list_tasks (task_list_id, task_id) VALUES (?, ?)`).run(
      listId,
      Number(taskInsert.lastInsertRowid),
    );
    expect(hasNativeTaskListDemoDataset(db)).toBe(true);
    expect(hasScopedHostTaskListDemoDataset(db, CRM_APP_REGISTRY_ID)).toBe(false);
    const result = seedDemoTasksIfMissing(db);
    expect(result.insertedTasks).toBeGreaterThan(0);
    expect(hasScopedHostTaskListDemoDataset(db, CRM_APP_REGISTRY_ID)).toBe(true);
    db.close();
  });

  test('seedDemoTasksIfMissing inserts tasks when demo lists exist without tasks', () => {
    const db = new Database(':memory:');
    createTaskListSchema(db);
    const now = new Date().toISOString();
    for (const name of ['Demo sprint', 'Work', 'Personal']) {
      db.prepare(
        `INSERT INTO task_lists (name, description, created_at, updated_at) VALUES (?, ?, ?, ?)`,
      ).run(name, `Demo list (${TASK_LIST_DEMO_PACK_ID})`, now, now);
    }
    expect(hasTaskListDemoDataset(db)).toBe(false);
    const result = seedDemoTasksIfMissing(db);
    expect(result.insertedTasks).toBeGreaterThan(0);
    expect(hasTaskListDemoDataset(db)).toBe(true);
    db.close();
  });

  test('seedDemoTasksIfMissing adds demo pack when other lists already exist', () => {
    const db = new Database(':memory:');
    createTaskListSchema(db);
    db.prepare(`INSERT INTO task_lists (name, description, created_at, updated_at) VALUES (?, '', '', '')`).run(
      'My project',
    );
    const result = seedDemoTasksIfMissing(db);
    expect(result.insertedTasks).toBeGreaterThan(0);
    expect(hasTaskListDemoDataset(db)).toBe(true);
    db.close();
  });

  test('seedDemoTasksIfMissing skips when boot flag is set', () => {
    const db = new Database(':memory:');
    createTaskListSchema(db);
    setAppSeedBootDisabled(db, APP_SEED_BOOT_FLAG_KEYS.TASK_LIST_DEMO, true);
    const result = seedDemoTasksIfMissing(db);
    expect(result.insertedTasks).toBe(0);
    expect(hasTaskListDemoDataset(db)).toBe(false);
    db.close();
  });

  test('seedDemoTasksIfMissing adminApply ignores boot flag', () => {
    const db = new Database(':memory:');
    createTaskListSchema(db);
    setAppSeedBootDisabled(db, APP_SEED_BOOT_FLAG_KEYS.TASK_LIST_DEMO, true);
    const result = seedDemoTasksIfMissing(db, { adminApply: true });
    expect(result.insertedTasks).toBeGreaterThan(0);
    expect(hasTaskListDemoDataset(db)).toBe(true);
    db.close();
  });

  test('removeDemoTasks keeps user-created lists and tasks', () => {
    const db = new Database(':memory:');
    createTaskListSchema(db);
    const now = new Date().toISOString();
    db.prepare(
      `INSERT INTO task_lists (name, description, created_at, updated_at) VALUES (?, ?, ?, ?)`,
    ).run('My project', 'User list', now, now);
    db.prepare(
      `INSERT INTO tasks (title, description, status, priority, tags, metadata, created_at, updated_at)
       VALUES (?, ?, 'pending', 'low', '[]', NULL, ?, ?)`,
    ).run('Custom task', 'My own work', now, now);
    const removed = removeDemoTasks(db);
    expect(removed.removedTasks).toBe(0);
    expect(removed.removedLists).toBe(0);
    expect((db.prepare('SELECT COUNT(*) AS c FROM tasks').get() as { c: number }).c).toBe(1);
    db.close();
  });

  test('removeDemoTasks removes seeded rows only', () => {
    const db = new Database(':memory:');
    createTaskListSchema(db);
    seedDemoTasksIfMissing(db);
    const removed = removeDemoTasks(db);
    expect(removed.removedTasks).toBeGreaterThan(0);
    expect(hasTaskListDemoDataset(db)).toBe(false);
    expect(db.prepare('SELECT COUNT(*) AS c FROM task_lists').get()).toEqual({ c: 0 });
    db.close();
  });

  test('clearAllTaskListsAndTasks removes every list and task', () => {
    const db = new Database(':memory:');
    createTaskListSchema(db);
    seedDemoTasksIfMissing(db, { adminApply: true });
    const cleared = clearAllTaskListsAndTasks(db);
    expect(cleared.removedTasks).toBeGreaterThan(0);
    expect(cleared.removedLists).toBeGreaterThan(0);
    expect((db.prepare('SELECT COUNT(*) AS c FROM tasks').get() as { c: number }).c).toBe(0);
    expect((db.prepare('SELECT COUNT(*) AS c FROM task_lists').get() as { c: number }).c).toBe(0);
    const reseed = seedDemoTasksIfMissing(db);
    expect(reseed.insertedTasks).toBe(0);
    expect(reseed.insertedLists).toBe(0);
    db.close();
  });
});
