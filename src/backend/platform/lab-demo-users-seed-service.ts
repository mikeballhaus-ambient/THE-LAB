import bcrypt from 'bcrypt';
import type { AppSeedOperationResult, AppSeedPackStatus } from '@/shared/types/app/app-seed-data';
import { databaseManager } from '../db/DatabaseManager';
import {
  DEMO_LAB_USER_SEEDS,
  ensureSeedDemoUsers,
  hasLabDemoUsersSeed,
  countPresentLabDemoUsers,
  LAB_DEMO_USERS_PACK_ID,
  removeLabDemoUsers,
} from '../db/Auth/seed-demo-users';
import { setLabDemoUsersSeedBootDisabled } from '../db/Auth/lab-seed-boot-flags';

const DEMO_PASSWORD = 'demo';

export const PLATFORM_LAB_SEED_APP_ID = 'platform-lab';

export async function getLabDemoUsersPackStatus(): Promise<AppSeedPackStatus[]> {
  const db = databaseManager.getDb();
  const present = hasLabDemoUsersSeed(db);
  return [
    {
      packId: LAB_DEMO_USERS_PACK_ID,
      present,
      rowCount: countPresentLabDemoUsers(db),
      serverReachable: true,
      message: present
        ? undefined
        : `Demo users missing — Apply restores ${DEMO_LAB_USER_SEEDS.length} lab.local test accounts (password: demo). OIDC users are excluded.`,
    },
  ];
}

export async function applyLabDemoUsersPack(): Promise<AppSeedOperationResult> {
  const db = databaseManager.getDb();
  const hash = await bcrypt.hash(DEMO_PASSWORD, 12);
  ensureSeedDemoUsers(db, hash);
  setLabDemoUsersSeedBootDisabled(db, false);
  const present = hasLabDemoUsersSeed(db);
  return {
    success: present,
    content: present
      ? `Lab demo users ready (${countPresentLabDemoUsers(db)}/${DEMO_LAB_USER_SEEDS.length}). Password for new local accounts: ${DEMO_PASSWORD}.`
      : 'Apply finished but some demo users are still missing.',
  };
}

export async function removeLabDemoUsersPack(): Promise<AppSeedOperationResult> {
  const db = databaseManager.getDb();
  const { removed, skippedProtected } = removeLabDemoUsers(db);
  setLabDemoUsersSeedBootDisabled(db, true);
  return {
    success: true,
    content:
      removed > 0
        ? `Removed ${removed} demo lab user(s). Bootstrap admin (id ${1}) and OIDC-linked accounts were not removed.`
        : `No demo lab users were removed (${skippedProtected} protected or already absent).`,
  };
}
