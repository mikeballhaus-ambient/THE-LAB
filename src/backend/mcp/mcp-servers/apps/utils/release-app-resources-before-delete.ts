import type { IApp } from '../../../../../shared/types';
import { AppDatabaseService } from '../../../../../backend/AppDatabaseService';
import { getLabAppManager } from '../../../../../backend/services/lab-app-manager-registry';
import {
  killListenersOnPort,
  waitUntilAppServerPortFree,
} from '../../../../../backend/utils/app-server-port-utils';
import { resolveAppFolderSlugFromRecord } from './resolve-app-folder-slug';

/**
 * Stops app servers and closes pooled per-app SQLite handles so folder removal and main DB delete do not hit SQLITE_BUSY / EBUSY.
 */
export async function releaseAppResourcesBeforeDelete(app: IApp): Promise<void> {
  const port = app.server?.port;
  const needsServerStop =
    port != null &&
    (app.type === 'server' || app.type === 'hybrid') &&
    Boolean(app.isServerSideEnabled);

  if (needsServerStop && port != null) {
    const manager = getLabAppManager();
    if (manager) {
      await manager.stopAppServerForDeletion(app.id, port);
    } else {
      await killListenersOnPort(port);
      await waitUntilAppServerPortFree(port, 5000);
    }
  }

  const folderSlug = resolveAppFolderSlugFromRecord(app);
  if (folderSlug) {
    await AppDatabaseService.close(folderSlug);
  }
  await AppDatabaseService.close(app.id);
}
