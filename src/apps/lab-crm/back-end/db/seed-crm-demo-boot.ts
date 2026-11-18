import type { Database } from 'better-sqlite3';
import {
  APP_SEED_BOOT_FLAG_KEYS,
  isAppSeedBootDisabled,
} from '@/shared/config/app-seed-boot-flags';
import { backfillAccountsFromContactCompanies } from './backfill-accounts';
import {
  hasDemoDataset,
  removeDemoRecords,
  seedDemoRecords,
} from './seed-demo-records';

export const CRM_DEMO_PACK_ID = 'crm-demo-records';

export interface CrmDemoBootResult {
  /** True when entity_records were inserted or replaced on this boot. */
  reseeded: boolean;
}

function backfillAccountsBestEffort(db: Database): void {
  try {
    const result = backfillAccountsFromContactCompanies(db);
    if (result.accountsCreated > 0 || result.contactsLinked > 0) {
      console.log(
        `[crm] accounts backfill — created=${result.accountsCreated} linked=${result.contactsLinked}`,
      );
    }
  } catch (err) {
    console.warn(
      '[crm] accounts backfill skipped:',
      err instanceof Error ? err.message : err,
    );
  }
}

/**
 * Ensures canonical CRM demo rows on each CRM app server start.
 *
 * When the hero demo marker is present, **all** `entity_records` are replaced so manual testing
 * (e.g. `approvalStatus: pending` on a sales deal) does not survive relaunching the CRM server.
 * Non-demo CRM databases (no marker) are unchanged except for the initial seed when empty.
 */
export function refreshCrmDemoOnAppBoot(db: Database): CrmDemoBootResult {
  if (process.env.CRM_SKIP_DEMO_SEED === '1') {
    return { reseeded: false };
  }
  if (isAppSeedBootDisabled(db, APP_SEED_BOOT_FLAG_KEYS.CRM_DEMO)) {
    return { reseeded: false };
  }

  if (!hasDemoDataset(db)) {
    const { c: recordCount } = db.prepare('SELECT COUNT(*) AS c FROM entity_records').get() as {
      c: number;
    };
    if (recordCount > 0) {
      return { reseeded: false };
    }
    seedDemoRecords(db);
    backfillAccountsBestEffort(db);
    return { reseeded: hasDemoDataset(db) };
  }

  removeDemoRecords(db);
  seedDemoRecords(db, { adminApply: true });
  backfillAccountsBestEffort(db);
  return { reseeded: hasDemoDataset(db) };
}

/** Boot adapter for `runDemoSeedOnBoot` — refresh runs inside `seed()`. */
export const crmDemoBootAdapter = {
  bootFlagKey: APP_SEED_BOOT_FLAG_KEYS.CRM_DEMO,
  has: hasDemoDataset,
  seed(db: Database): CrmDemoBootResult {
    return refreshCrmDemoOnAppBoot(db);
  },
};
