import { describe, test, expect } from '@jest/globals';
import Database from 'better-sqlite3';
import {
  APP_SEED_BOOT_FLAG_KEYS,
  getAppSeedBootFlagKey,
  isAppSeedBootDisabled,
  setAppSeedBootDisabled,
  syncAppSeedBootFlagForPack,
} from '@/shared/config/app-seed-boot-flags';

function memoryDb(): Database.Database {
  const db = new Database(':memory:');
  db.exec(`
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
  return db;
}

describe('app-seed-boot-flags', () => {
  test('maps pack ids to config keys', () => {
    expect(getAppSeedBootFlagKey('app-lab-crm', 'crm-demo-records')).toBe(APP_SEED_BOOT_FLAG_KEYS.CRM_DEMO);
    expect(getAppSeedBootFlagKey('app-lab-chartbuilder', 'chart-samples')).toBe(
      APP_SEED_BOOT_FLAG_KEYS.CHART_BUILDER_SAMPLES,
    );
    expect(getAppSeedBootFlagKey('app-lab-formsbuilder', 'forms-builder-platform-forms')).toBe(
      APP_SEED_BOOT_FLAG_KEYS.FORMS_BUILDER_PLATFORM,
    );
  });

  test('set and clear boot disabled flag', () => {
    const db = memoryDb();
    expect(isAppSeedBootDisabled(db, APP_SEED_BOOT_FLAG_KEYS.TASK_LIST_DEMO)).toBe(false);
    setAppSeedBootDisabled(db, APP_SEED_BOOT_FLAG_KEYS.TASK_LIST_DEMO, true);
    expect(isAppSeedBootDisabled(db, APP_SEED_BOOT_FLAG_KEYS.TASK_LIST_DEMO)).toBe(true);
    setAppSeedBootDisabled(db, APP_SEED_BOOT_FLAG_KEYS.TASK_LIST_DEMO, false);
    expect(isAppSeedBootDisabled(db, APP_SEED_BOOT_FLAG_KEYS.TASK_LIST_DEMO)).toBe(false);
  });

  test('syncAppSeedBootFlagForPack updates CRM flag on remove', () => {
    const db = memoryDb();
    syncAppSeedBootFlagForPack(db, 'app-lab-crm', 'crm-demo-records', true);
    expect(isAppSeedBootDisabled(db, APP_SEED_BOOT_FLAG_KEYS.CRM_DEMO)).toBe(true);
    syncAppSeedBootFlagForPack(db, 'app-lab-crm', 'crm-demo-records', false);
    expect(isAppSeedBootDisabled(db, APP_SEED_BOOT_FLAG_KEYS.CRM_DEMO)).toBe(false);
  });
});
