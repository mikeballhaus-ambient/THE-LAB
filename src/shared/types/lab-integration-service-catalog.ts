import type { IntegrationServiceDescriptor } from '@/shared/types/lab-integration-service';

export const LAB_INTEGRATION_SERVICE_CATALOG_SCHEMA_VERSION = 1;

/** One app that exposes connector integration services (manifest `integrationServices`). */
export interface LabIntegrationServiceCatalogAppGroup {
  appId: string;
  appName: string;
  services: IntegrationServiceDescriptor[];
}

export interface LabIntegrationServiceCatalogResponse {
  schemaVersion: typeof LAB_INTEGRATION_SERVICE_CATALOG_SCHEMA_VERSION;
  apps: LabIntegrationServiceCatalogAppGroup[];
}
