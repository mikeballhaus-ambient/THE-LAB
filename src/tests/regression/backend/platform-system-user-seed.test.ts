import { describe, expect, test } from '@jest/globals';
import Database from 'better-sqlite3';
import { ensureLabPlatformSystemUser } from '@/backend/db/Auth/ensure-lab-platform-system-user';
import { resolveLabPlatformSystemUserSeed } from '@/backend/db/Auth/auth-repository';
import {
  seedDefaultAdmin,
  seedLabPlatformSystemUser,
  seedLabPlatformSystemUserGlobalPermissions,
} from '@/backend/db/Auth/auth-schema';
import {
  LAB_DEMO_USER_MAX_ID,
  LAB_DEMO_USER_MIN_ID,
  LAB_PLATFORM_SYSTEM_USER_EMAIL,
  LAB_PLATFORM_SYSTEM_USER_ID,
  LAB_PLATFORM_SYSTEM_USER_NAME,
} from '@/shared/config/lab-platform-system-user';

/**
 * The automation account's id ends up inside `dm:lowerId:higherId` channel strings that are already
 * persisted, so it cannot be a value that depends on seed order. These tests pin that contract and the
 * conflict guard that makes a wrong occupant loud instead of silent.
 */

const CREATE_USERS = `
  CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'viewer',
    status TEXT NOT NULL DEFAULT 'active',
    is_system INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE user_global_permissions (
    userid INTEGER NOT NULL PRIMARY KEY,
    canLaunchApps INTEGER NOT NULL DEFAULT 0,
    canTeardownApps INTEGER NOT NULL DEFAULT 0,
    canUpdateApps INTEGER NOT NULL DEFAULT 0,
    canViewLogs INTEGER NOT NULL DEFAULT 0,
    canManageUsers INTEGER NOT NULL DEFAULT 0,
    canDeleteApps INTEGER NOT NULL DEFAULT 0,
    canManageApps INTEGER NOT NULL DEFAULT 0,
    canCreateApps INTEGER NOT NULL DEFAULT 0,
    canModifyTags INTEGER NOT NULL DEFAULT 0
  );
`;

function memoryDb(): Database.Database {
  const db = new Database(':memory:');
  db.exec(CREATE_USERS);
  return db;
}

/** Mirrors the substitution `AuthRepository` performs before `db.exec`. */
function seedStatements(statement: string): string {
  return statement
    .replace(/\{\{SYSTEM_USER_ID\}\}/g, String(LAB_PLATFORM_SYSTEM_USER_ID))
    .replace(/\{\{SYSTEM_USER_EMAIL\}\}/g, LAB_PLATFORM_SYSTEM_USER_EMAIL)
    .replace(/\{\{SYSTEM_USER_NAME\}\}/g, LAB_PLATFORM_SYSTEM_USER_NAME);
}

describe('platform system user identity', () => {
  test('the reserved id sits before the demo-user block', () => {
    // Admin is 1, the automation account is 2, and demo users start at LAB_DEMO_USER_MIN_ID. Reserving
    // the slot *before* the demo pack means an apply/remove cycle can never displace the automation row.
    expect(LAB_PLATFORM_SYSTEM_USER_ID).toBe(2);
    expect(LAB_PLATFORM_SYSTEM_USER_ID).toBeLessThan(LAB_DEMO_USER_MIN_ID);
    expect(LAB_DEMO_USER_MAX_ID).toBeGreaterThanOrEqual(LAB_DEMO_USER_MIN_ID);
  });

  test('the id is not 0, which the comms layer reads as "no user"', () => {
    expect(LAB_PLATFORM_SYSTEM_USER_ID).toBeGreaterThan(0);
  });
});

describe('seedLabPlatformSystemUser', () => {
  test('creates the automation row with no password and viewer role', () => {
    const db = memoryDb();
    db.exec(seedDefaultAdmin.replace('{{PASSWORD_HASH}}', 'hash'));
    db.exec(seedStatements(seedLabPlatformSystemUser));
    db.exec(seedStatements(seedLabPlatformSystemUserGlobalPermissions));

    const row = db
      .prepare('SELECT email, name, password_hash, role FROM users WHERE id = ?')
      .get(LAB_PLATFORM_SYSTEM_USER_ID) as {
      email: string;
      name: string;
      password_hash: string | null;
      role: string;
    };
    expect(row).toEqual({
      email: LAB_PLATFORM_SYSTEM_USER_EMAIL,
      name: LAB_PLATFORM_SYSTEM_USER_NAME,
      password_hash: null,
      role: 'viewer',
    });

    const perms = db
      .prepare('SELECT canLaunchApps, canManageUsers FROM user_global_permissions WHERE userid = ?')
      .get(LAB_PLATFORM_SYSTEM_USER_ID) as { canLaunchApps: number; canManageUsers: number };
    // No capabilities: it is a sender identity, never something a human signs in to.
    expect(perms).toEqual({ canLaunchApps: 0, canManageUsers: 0 });
    db.close();
  });

  test('is idempotent across repeated boots', () => {
    const db = memoryDb();
    db.exec(seedDefaultAdmin.replace('{{PASSWORD_HASH}}', 'hash'));
    db.exec(seedStatements(seedLabPlatformSystemUser));
    db.exec(seedStatements(seedLabPlatformSystemUser));
    const count = db
      .prepare('SELECT COUNT(*) AS c FROM users WHERE id = ?')
      .get(LAB_PLATFORM_SYSTEM_USER_ID) as { c: number };
    expect(count.c).toBe(1);
    db.close();
  });
});

describe('ensureLabPlatformSystemUser', () => {
  test('creates the row when the id is free', () => {
    const db = memoryDb();
    const result = ensureLabPlatformSystemUser(db);
    expect(result).toEqual({ status: 'created', userId: LAB_PLATFORM_SYSTEM_USER_ID });
    db.close();
  });

  test('reports ok and refreshes the name when the row is already ours', () => {
    const db = memoryDb();
    ensureLabPlatformSystemUser(db);
    db.prepare('UPDATE users SET name = ? WHERE id = ?').run('Stale name', LAB_PLATFORM_SYSTEM_USER_ID);

    const result = ensureLabPlatformSystemUser(db);
    expect(result.status).toBe('ok');
    const name = db
      .prepare('SELECT name FROM users WHERE id = ?')
      .get(LAB_PLATFORM_SYSTEM_USER_ID) as { name: string };
    expect(name.name).toBe(LAB_PLATFORM_SYSTEM_USER_NAME);
    db.close();
  });

  test('refuses to overwrite a human occupying the reserved id', () => {
    const db = memoryDb();
    db.prepare(
      `INSERT INTO users (id, email, name, password_hash, role, status)
       VALUES (?, 'real.person@corp.test', 'Real Person', 'hash', 'admin', 'active')`,
    ).run(LAB_PLATFORM_SYSTEM_USER_ID);

    const result = ensureLabPlatformSystemUser(db);

    expect(result).toEqual({
      status: 'conflict',
      userId: LAB_PLATFORM_SYSTEM_USER_ID,
      occupantEmail: 'real.person@corp.test',
    });

    // The human is untouched — rewriting them into a passwordless viewer would be worse than the bug.
    const row = db
      .prepare('SELECT email, name, password_hash, role FROM users WHERE id = ?')
      .get(LAB_PLATFORM_SYSTEM_USER_ID) as {
      email: string;
      name: string;
      password_hash: string;
      role: string;
    };
    expect(row).toEqual({
      email: 'real.person@corp.test',
      name: 'Real Person',
      password_hash: 'hash',
      role: 'admin',
    });
    db.close();
  });

  test('the seed resolver escapes values instead of interpolating them raw', () => {
    // The real name has no apostrophe today, so the escaper is proved on the statement the repository
    // actually uses rather than on a copy of its logic.
    const resolved = resolveLabPlatformSystemUserSeed(
      `VALUES ({{SYSTEM_USER_ID}}, '{{SYSTEM_USER_EMAIL}}', '{{SYSTEM_USER_NAME}}')`,
    );
    expect(resolved).toBe(
      `VALUES (${LAB_PLATFORM_SYSTEM_USER_ID}, '${LAB_PLATFORM_SYSTEM_USER_EMAIL}', '${LAB_PLATFORM_SYSTEM_USER_NAME}')`,
    );
    // Every placeholder must be gone: an unresolved one would be a SQL syntax error at boot.
    expect(resolved).not.toContain('{{');
  });
});
