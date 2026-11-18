import type { AppManager } from '../AppManager';
import { appsService } from '../db/Apps/apps-service';
import {
  listPlatformAppServerEntries,
  resolveApiBaseHostFromEnv,
} from '@/shared/services/app-server-url-resolution';
import type { PlatformAppServerEntry } from '@/shared/types/platform-app-servers';
import { resolvePlatformBackendUrl } from '@/shared/config/resolve-platform-backend-url.node';

export class PlatformAppServerService {
  private static instance: PlatformAppServerService;

  public static getInstance(): PlatformAppServerService {
    if (!PlatformAppServerService.instance) {
      PlatformAppServerService.instance = new PlatformAppServerService();
    }
    return PlatformAppServerService.instance;
  }

  public listServerUrls(
    appManager: AppManager,
    filterIds?: string[],
  ): {
    platformBaseUrl: string;
    apiHost: string;
    apps: PlatformAppServerEntry[];
  } {
    const apiHost = resolveApiBaseHostFromEnv({
      backendUrl: process.env.BACKEND_URL,
      theLabBackendUrl: process.env.THE_LAB_BACKEND_URL,
      viteApiBaseUrl: process.env.VITE_API_BASE_URL,
      baseUrl: process.env.BASEURL,
    });
    const running = new Set(appManager.getRunningAppIds());
    const registryApps = appsService.getAllApps();
    const apps = listPlatformAppServerEntries(registryApps, apiHost, running, filterIds);
    return {
      platformBaseUrl: resolvePlatformBackendUrl(),
      apiHost,
      apps,
    };
  }
}
