import type { Database } from 'better-sqlite3';
import type { UserRole } from '../../../shared/types';
import { isLabDemoUsersSeedBootDisabled } from './lab-seed-boot-flags';
import {
  LAB_DEMO_USER_MIN_ID,
  isLabPlatformSystemUserId,
} from '@/shared/config/lab-platform-system-user';

/** Settings seed pack id (main `db/the_lab.db` — not an app DB). */
export const LAB_DEMO_USERS_PACK_ID = 'lab-demo-users';

/** Default bootstrap admin — never removed by demo user seed pack. */
export const LAB_DEFAULT_ADMIN_USER_ID = 1;

export interface DemoLabUserSeed {
  id: number;
  email: string;
  name: string;
  role: UserRole;
}

/**
 * Fixed ids 3–12 for platform user lookups.
 *
 * `1` is the bootstrap admin and `2` is the reserved automation account
 * ([`LAB_PLATFORM_SYSTEM_USER_ID`](../../../shared/config/lab-platform-system-user.ts)); the demo pack
 * starts after both so neither can be displaced by a demo pack apply/remove cycle.
 */
export const DEMO_LAB_USER_SEEDS: DemoLabUserSeed[] = [
  { id: 3, email: 'mia.chen@lab.local', name: 'Mia Chen', role: 'member' },
  { id: 4, email: 'jordan.lee@lab.local', name: 'Jordan Lee', role: 'member' },
  { id: 5, email: 'sam.patel@lab.local', name: 'Sam Patel', role: 'member' },
  { id: 6, email: 'taylor.nguyen@lab.local', name: 'Taylor Nguyen', role: 'admin' },
  { id: 7, email: 'riley.brooks@lab.local', name: 'Riley Brooks', role: 'member' },
  { id: 8, email: 'casey.hayes@lab.local', name: 'Casey Hayes', role: 'member' },
  { id: 9, email: 'quinn.reed@lab.local', name: 'Quinn Reed', role: 'viewer' },
  { id: 10, email: 'drew.ward@lab.local', name: 'Drew Ward', role: 'member' },
  { id: 11, email: 'blake.torres@lab.local', name: 'Blake Torres', role: 'member' },
  { id: 12, email: 'cameron.foster@lab.local', name: 'Cameron Foster', role: 'member' },
];

const DEMO_USER_ID_SET = new Set(DEMO_LAB_USER_SEEDS.map((u) => u.id));
const DEMO_USER_EMAIL_SET = new Set(DEMO_LAB_USER_SEEDS.map((u) => u.email.toLowerCase()));

export function isLabDemoSeedUserId(userId: number): boolean {
  return DEMO_USER_ID_SET.has(userId);
}

export function userHasAuthIdentity(db: Database, userId: number): boolean {
  try {
    return Boolean(
      db.prepare('SELECT 1 FROM user_auth_identities WHERE userid = ? LIMIT 1').get(userId),
    );
  } catch {
    return false;
  }
}

/** OIDC-linked accounts and the bootstrap admin are never touched by demo user remove. */
export function isProtectedFromLabDemoUserRemoval(db: Database, userId: number): boolean {
  if (userId === LAB_DEFAULT_ADMIN_USER_ID || isLabPlatformSystemUserId(userId)) {
    return true;
  }
  if (userHasAuthIdentity(db, userId)) {
    return true;
  }
  return false;
}

export function hasLabDemoUsersSeed(db: Database): boolean {
  for (const seed of DEMO_LAB_USER_SEEDS) {
    const row = db.prepare('SELECT 1 FROM users WHERE id = ? AND lower(email) = lower(?) LIMIT 1').get(
      seed.id,
      seed.email,
    );
    if (!row) {
      return false;
    }
  }
  return true;
}

export function countPresentLabDemoUsers(db: Database): number {
  let count = 0;
  for (const seed of DEMO_LAB_USER_SEEDS) {
    const row = db.prepare('SELECT 1 FROM users WHERE id = ? AND lower(email) = lower(?) LIMIT 1').get(
      seed.id,
      seed.email,
    );
    if (row) {
      count += 1;
    }
  }
  return count;
}

const LAUNCHABLE_APP_IDS = [
  'app-forms-builder',
  'app-lab-crm',
  'app-lab-tasklist',
  'app-help-desk',
  'app-ui-component-gallery',
];

/**
 * Upsert demo lab users for local/testing (password: `demo` when password_hash is set).
 * Safe on every startup — uses INSERT OR IGNORE.
 */
export function ensureSeedDemoUsers(db: Database, passwordHash: string): void {
  if (isLabDemoUsersSeedBootDisabled(db)) {
    return;
  }
  const insertUser = db.prepare(`
    INSERT OR IGNORE INTO users (id, email, name, password_hash, role, status)
    VALUES (?, ?, ?, ?, ?, 'active')
  `);
  const insertGlobal = db.prepare(`
    INSERT OR IGNORE INTO user_global_permissions (
      userid, canLaunchApps, canTeardownApps, canUpdateApps, canViewLogs,
      canManageUsers, canDeleteApps, canManageApps, canCreateApps, canModifyTags
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertApp = db.prepare(`
    INSERT OR IGNORE INTO user_app_permissions (userid, appId, canLaunch, canTeardown, canUpdate, canViewLogs, canModifyTags)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  for (const user of DEMO_LAB_USER_SEEDS) {
    insertUser.run(user.id, user.email, user.name, passwordHash, user.role);
    const isViewer = user.role === 'viewer';
    const isAdmin = user.role === 'admin' || user.role === 'owner';
    insertGlobal.run(
      user.id,
      isViewer ? 0 : 1,
      isViewer ? 0 : 1,
      isAdmin ? 1 : 0,
      isAdmin ? 1 : 0,
      isAdmin ? 1 : 0,
      0,
      isAdmin ? 1 : 0,
      isAdmin ? 1 : 0,
      isAdmin ? 1 : 0,
    );
    if (!isViewer) {
      for (const appId of LAUNCHABLE_APP_IDS) {
        insertApp.run(user.id, appId, 1, 1, isAdmin ? 1 : 0, isAdmin ? 1 : 0, isAdmin ? 1 : 0);
      }
    }
  }
}

/** Map demo row index to a seeded lab user id (2–11). */
export function demoLabUserIdForIndex(index: number): number {
  // Derived from the seed array, not a literal: the pack base moved once (2–11 → 3–12) when the
  // automation account was reserved ahead of it, and a hard-coded base silently pointed every caller
  // at the previous cast member.
  const firstId = DEMO_LAB_USER_SEEDS[0]?.id ?? LAB_DEMO_USER_MIN_ID;
  return firstId + (Math.abs(index) % DEMO_LAB_USER_SEEDS.length);
}

/**
 * Removes seeded demo lab users (ids 2–11). Does not remove bootstrap admin (id 1) or OIDC users.
 */
export function removeLabDemoUsers(db: Database): { removed: number; skippedProtected: number } {
  let removed = 0;
  let skippedProtected = 0;
  const deleteUser = db.prepare('DELETE FROM users WHERE id = ?');

  for (const seed of DEMO_LAB_USER_SEEDS) {
    if (isProtectedFromLabDemoUserRemoval(db, seed.id)) {
      skippedProtected += 1;
      continue;
    }
    const row = db.prepare('SELECT id, email FROM users WHERE id = ?').get(seed.id) as
      | { id: number; email: string }
      | undefined;
    if (!row) {
      continue;
    }
    if (!DEMO_USER_EMAIL_SET.has(String(row.email).toLowerCase())) {
      continue;
    }
    const result = deleteUser.run(seed.id);
    removed += result.changes;
  }

  return { removed, skippedProtected };
}
