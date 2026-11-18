import type { AppSeedOperationResult, AppSeedPackStatus } from '@/shared/types/app/app-seed-data';
import type { AppSeedDataHandlers } from '@/shared/server/register-app-seed-data-routes';
import { syncAppSeedBootFlagForPack } from '@/shared/config/app-seed-boot-flags';
import { AppDatabaseServiceProxy } from '../../db/app-db-service';
import {
  clearAllFormsBuilderCatalog,
  hasPlatformFormsDataset,
  PLATFORM_FORMS_PACK_ID,
  REQUIRED_PLATFORM_FORM_KEYS,
  seedPlatformFormsIfMissing,
} from '../db/seed-platform-forms';

function countPresentForms(): number {
  const db = AppDatabaseServiceProxy.getInstance().getDb();
  let count = 0;
  for (const key of REQUIRED_PLATFORM_FORM_KEYS) {
    if (db.prepare('SELECT 1 FROM forms WHERE form_key = ?').get(key)) {
      count += 1;
    }
  }
  return count;
}

export const formsBuilderSeedHandlers: AppSeedDataHandlers = {
  appId: 'app-lab-formsbuilder',

  async getStatus(): Promise<AppSeedPackStatus[]> {
    const db = AppDatabaseServiceProxy.getInstance().getDb();
    const present = hasPlatformFormsDataset(db);
    return [
      {
        packId: PLATFORM_FORMS_PACK_ID,
        present,
        rowCount: countPresentForms(),
        serverReachable: true,
      },
    ];
  },

  async applyPack(packId: string): Promise<AppSeedOperationResult> {
    if (packId !== PLATFORM_FORMS_PACK_ID) {
      return { success: false, content: `Unknown pack: ${packId}` };
    }
    const db = AppDatabaseServiceProxy.getInstance().getDb();
    syncAppSeedBootFlagForPack(db, 'app-lab-formsbuilder', PLATFORM_FORMS_PACK_ID, false);
    const { insertedConnectors, insertedForms } = seedPlatformFormsIfMissing(db, { adminApply: true });
    const present = hasPlatformFormsDataset(db);
    return {
      success: present,
      content: present
        ? `Platform forms ready (${countPresentForms()}/${REQUIRED_PLATFORM_FORM_KEYS.length} required keys). Inserted ${insertedConnectors} connector(s), ${insertedForms} form(s).`
        : 'Apply finished but some required form keys are still missing.',
    };
  },

  async removePack(packId: string): Promise<AppSeedOperationResult> {
    if (packId !== PLATFORM_FORMS_PACK_ID) {
      return { success: false, content: `Unknown pack: ${packId}` };
    }
    const db = AppDatabaseServiceProxy.getInstance().getDb();
    const removed = clearAllFormsBuilderCatalog(db);
    syncAppSeedBootFlagForPack(db, 'app-lab-formsbuilder', PLATFORM_FORMS_PACK_ID, true);
    return {
      success: true,
      content: `Removed ${removed.removedForms} form(s), ${removed.removedConnectors} connector(s), ${removed.removedSubmissions} submission(s). Re-apply in Settings to restore platform forms.`,
    };
  },
};
