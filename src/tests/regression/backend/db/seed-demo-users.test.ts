import { describe, expect, test } from '@jest/globals';
import Database from 'better-sqlite3';
import {
  DEMO_LAB_USER_SEEDS,
  ensureSeedDemoUsers,
  hasLabDemoUsersSeed,
  LAB_DEFAULT_ADMIN_USER_ID,
  removeLabDemoUsers,
} from '@/backend/db/Auth/seed-demo-users';
import { LAB_DEMO_USER_MAX_ID, LAB_DEMO_USER_MIN_ID } from '@/shared/config/lab-platform-system-user';
import { createUserAuthIdentitiesTable } from '@/backend/db/Auth/auth-oidc-migration';
import { ensureCanModifyTagsPermissionColumns } from '@/backend/db/Auth/auth-permissions-migration';

function createAuthSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'member',
      status TEXT NOT NULL DEFAULT 'active',
      is_system INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE user_global_permissions (
      userid INTEGER PRIMARY KEY,
      canLaunchApps INTEGER DEFAULT 0,
      canTeardownApps INTEGER DEFAULT 0,
      canUpdateApps INTEGER DEFAULT 0,
      canViewLogs INTEGER DEFAULT 0,
      canManageUsers INTEGER DEFAULT 0,
      canDeleteApps INTEGER DEFAULT 0,
      canManageApps INTEGER DEFAULT 0,
      canCreateApps INTEGER DEFAULT 0,
      canModifyTags INTEGER DEFAULT 0,
      FOREIGN KEY (userid) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE TABLE user_app_permissions (
      userid INTEGER NOT NULL,
      appId TEXT NOT NULL,
      canLaunch INTEGER DEFAULT 0,
      canTeardown INTEGER DEFAULT 0,
      canUpdate INTEGER DEFAULT 0,
      canViewLogs INTEGER DEFAULT 0,
      canModifyTags INTEGER DEFAULT 0,
      PRIMARY KEY (userid, appId),
      FOREIGN KEY (userid) REFERENCES users(id) ON DELETE CASCADE
    );
  `);
  db.exec(createUserAuthIdentitiesTable);
  ensureCanModifyTagsPermissionColumns(db);
}

describe('lab demo users seed pack', () => {
  test('ensureSeedDemoUsers + hasLabDemoUsersSeed', () => {
    const db = new Database(':memory:');
    createAuthSchema(db);
    db.prepare(`INSERT INTO users (id, email, name, password_hash, role, status) VALUES (?, ?, ?, ?, ?, 'active')`).run(
      LAB_DEFAULT_ADMIN_USER_ID,
      'admin@lab.local',
      'Admin',
      'hash',
      'admin',
    );
    ensureSeedDemoUsers(db, 'demo-hash');
    expect(hasLabDemoUsersSeed(db)).toBe(true);
    db.close();
  });

  test('removeLabDemoUsers keeps bootstrap admin and OIDC users', () => {
    const db = new Database(':memory:');
    createAuthSchema(db);
    db.prepare(`INSERT INTO users (id, email, name, password_hash, role, status) VALUES (?, ?, ?, ?, ?, 'active')`).run(
      LAB_DEFAULT_ADMIN_USER_ID,
      'admin@lab.local',
      'Admin',
      'hash',
      'admin',
    );
    ensureSeedDemoUsers(db, 'demo-hash');
    // One past the demo block: the OIDC user must survive while a seeded demo row is removed.
    const OIDC_USER_ID = LAB_DEMO_USER_MAX_ID + 1;
    db.prepare(`INSERT INTO users (id, email, name, password_hash, role, status) VALUES (?, ?, ?, ?, ?, 'active')`).run(
      OIDC_USER_ID,
      'oidc@example.com',
      'OIDC User',
      null,
      'member',
    );
    db.prepare(
      `INSERT INTO user_auth_identities (userid, provider, provider_subject, email) VALUES (?, 'google', 'sub-1', ?)`,
    ).run(OIDC_USER_ID, 'oidc@example.com');

    const { removed } = removeLabDemoUsers(db);
    expect(removed).toBe(DEMO_LAB_USER_SEEDS.length);
    expect(db.prepare('SELECT id FROM users WHERE id = ?').get(LAB_DEFAULT_ADMIN_USER_ID)).toBeTruthy();
    expect(db.prepare('SELECT id FROM users WHERE id = ?').get(OIDC_USER_ID)).toBeTruthy();
    expect(db.prepare('SELECT id FROM users WHERE id = ?').get(LAB_DEMO_USER_MIN_ID)).toBeFalsy();
    db.close();
  });
});
