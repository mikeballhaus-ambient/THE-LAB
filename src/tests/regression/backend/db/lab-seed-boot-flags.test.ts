import { describe, test, expect } from '@jest/globals';
import Database from 'better-sqlite3';
import {
  isLabDemoUsersSeedBootDisabled,
  LAB_DEMO_USERS_SEED_DISABLED_KEY,
  setLabDemoUsersSeedBootDisabled,
} from '@/backend/db/Auth/lab-seed-boot-flags';

describe('lab-seed-boot-flags', () => {
  test('persists lab demo users seed disabled flag', () => {
    const db = new Database(':memory:');
    expect(isLabDemoUsersSeedBootDisabled(db)).toBe(false);
    setLabDemoUsersSeedBootDisabled(db, true);
    expect(isLabDemoUsersSeedBootDisabled(db)).toBe(true);
    const row = db
      .prepare('SELECT value FROM lab_seed_boot_flags WHERE key = ?')
      .get(LAB_DEMO_USERS_SEED_DISABLED_KEY) as { value: string };
    expect(row.value).toBe('1');
    setLabDemoUsersSeedBootDisabled(db, false);
    expect(isLabDemoUsersSeedBootDisabled(db)).toBe(false);
  });
});
