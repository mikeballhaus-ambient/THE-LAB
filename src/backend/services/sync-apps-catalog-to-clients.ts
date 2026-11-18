import { ProviderService } from '@/backend/ai/provider-service';
import appsService from '@/backend/db/Apps/apps-service';
import type { ProviderData, RuntimeApp } from '@/shared/types';
import { SOCKET_EVENTS, type AppsOrderUpdatedEventData } from '@/shared/types/socket-events';

/** Refresh in-memory provider app list and push catalog to connected dashboards. */
export function syncAppsCatalogToClients(): RuntimeApp[] {
  const updatedApps = appsService.getAllAppsWithCatalogTags() as RuntimeApp[];
  const providerSvc = ProviderService.getInstance();
  const providerData: ProviderData = providerSvc.getProviderData();
  providerData.apps = updatedApps;
  providerSvc.setProviderData(providerData);

  const io = providerSvc.getSocketIOServer();
  if (io) {
    const payload: AppsOrderUpdatedEventData = {
      apps: updatedApps,
      updatedAt: new Date().toISOString(),
    };
    io.emit(SOCKET_EVENTS.APPS_ORDER_UPDATED, payload);
  }

  return updatedApps;
}
