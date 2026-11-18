import type { Database } from 'better-sqlite3';
import type { AppSeedOperationResult, AppSeedPackStatus } from '@/shared/types/app/app-seed-data';
import type { AppSeedDataHandlers } from '@/shared/server/register-app-seed-data-routes';
import { AppDatabaseServiceProxy } from '../../db/app-db-service';
import { syncAppSeedBootFlagForPack } from '@/shared/config/app-seed-boot-flags';
import {
  DEMO_HERO_EMAIL_MARKER,
  hasDemoDataset,
  removeDemoRecords,
  seedDemoRecords,
} from '../db/seed-demo-records';

const PACK_ID = 'crm-demo-records';

function getDb(): Database {
  return AppDatabaseServiceProxy.getInstance().getDb();
}

function demoRecordCount(db: Database): number {
  if (!hasDemoDataset(db)) {
    return 0;
  }
  const row = db.prepare('SELECT COUNT(*) AS c FROM entity_records').get() as { c: number };
  return row.c;
}

export const crmSeedHandlers: AppSeedDataHandlers = {
  appId: 'app-lab-crm',

  async getStatus(): Promise<AppSeedPackStatus[]> {
    const db = getDb();
    const present = hasDemoDataset(db);
    return [
      {
        packId: PACK_ID,
        present,
        rowCount: present ? demoRecordCount(db) : 0,
        serverReachable: true,
      },
    ];
  },

  async applyPack(packId: string): Promise<AppSeedOperationResult> {
    if (packId !== PACK_ID) {
      return { success: false, content: `Unknown pack: ${packId}` };
    }
    const db = getDb();
    if (hasDemoDataset(db)) {
      syncAppSeedBootFlagForPack(db, 'app-lab-crm', PACK_ID, false);
      return { success: true, content: 'CRM demo records are already present.' };
    }
    const { c: recordCount } = db.prepare('SELECT COUNT(*) AS c FROM entity_records').get() as {
      c: number;
    };
    if (recordCount > 0) {
      return {
        success: false,
        content:
          'CRM already has non-demo entity records. Remove production data manually or use an empty CRM database before applying demo records.',
      };
    }
    syncAppSeedBootFlagForPack(db, 'app-lab-crm', PACK_ID, false);
    seedDemoRecords(db, { adminApply: true });
    if (!hasDemoDataset(db)) {
      return { success: false, content: 'Demo seed did not apply — check server logs.' };
    }
    syncAppSeedBootFlagForPack(db, 'app-lab-crm', PACK_ID, false);
    return {
      success: true,
      content: `Applied CRM demo records (${demoRecordCount(db)} rows). Marker: ${DEMO_HERO_EMAIL_MARKER}`,
    };
  },

  async removePack(packId: string): Promise<AppSeedOperationResult> {
    if (packId !== PACK_ID) {
      return { success: false, content: `Unknown pack: ${packId}` };
    }
    const db = getDb();
    const result = removeDemoRecords(db);
    if (!result.success) {
      return { success: false, content: result.message };
    }
    syncAppSeedBootFlagForPack(db, 'app-lab-crm', PACK_ID, true);
    return {
      success: true,
      content: result.removed > 0
        ? `Removed ${result.removed} CRM demo entity record(s).`
        : 'No CRM demo dataset was present.',
    };
  },
};
