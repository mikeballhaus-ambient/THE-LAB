import { registerPlatformAppsCatalog } from '@/shared/services/platform-apps-catalog';
import { createSqlitePlatformAppsCatalog } from '../services/sqlite-platform-apps-catalog';

/** Wire default SQLite catalog (main backend + Node CLI). */
export function registerDefaultPlatformAppsCatalog(): void {
  registerPlatformAppsCatalog(createSqlitePlatformAppsCatalog());
}
