import { appsService } from '../db/Apps/apps-service';
import { databaseManager } from '../db/DatabaseManager';
import type { PlatformAppsCatalogPort } from '@/shared/services/platform-apps-catalog-port';

/** SQLite-backed {@link PlatformAppsCatalogPort} for server and scripts (rm-46 **4.5**). */
export function createSqlitePlatformAppsCatalog(): PlatformAppsCatalogPort {
  return {
    getAllApps: () => appsService.getAllApps(),
    getAppById: (id) => appsService.getAppById(id),
    createApp: (app) => {
      appsService.createApp(app);
    },
    ensureInitialized: async () => {
      await databaseManager.initialize();
    },
  };
}
