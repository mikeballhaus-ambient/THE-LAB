import appsService from '../db/Apps/apps-service';
import { appsRepository } from '../db/Apps/apps-repository';
import {
  LabIntegrationsError,
  canReadHostBindings,
} from '../db/LabIntegrations/lab-integrations-service';
import type { AppLabIntegrationManifestV1 } from '@/shared/types/lab-integration-manifest';
import type { FormsBuilderContract } from '@/shared/types/forms-builder-integration';
import type { IntegrationServiceDescriptor } from '@/shared/types/lab-integration-service';
import type {
  LabIntegrationServiceCatalogAppGroup,
  LabIntegrationServiceCatalogResponse,
} from '@/shared/types/lab-integration-service-catalog';
import { LAB_INTEGRATION_SERVICE_CATALOG_SCHEMA_VERSION } from '@/shared/types/lab-integration-service-catalog';
import type { User } from '@/shared/types/user';
import { buildRegistryDiscoveryContract } from './build-registry-discovery-contract';
import { buildPlatformDiscoveryContract } from '@/shared/lab-integrations/build-platform-discovery-contract';
import { resolveIntegrationAppIdForService } from '@/shared/lab-integrations/resolve-integration-connector-server-url';

function resolveApiHostBase(): string {
  const raw = process.env.BACKEND_URL ?? process.env.VITE_API_BASE_URL ?? 'http://localhost';
  return raw.replace(/\/$/, '').replace(/:\d+$/, '');
}

export class LabIntegrationsHubService {
  private static instance: LabIntegrationsHubService | null = null;

  private constructor() {}

  static getInstance(): LabIntegrationsHubService {
    if (!LabIntegrationsHubService.instance) {
      LabIntegrationsHubService.instance = new LabIntegrationsHubService();
    }
    return LabIntegrationsHubService.instance;
  }

  getManifestForCaller(caller: User, appId: string): AppLabIntegrationManifestV1 {
    if (!canReadHostBindings(caller, appId)) {
      throw new LabIntegrationsError('Not allowed to read integration manifest', 'FORBIDDEN');
    }
    const manifest = appsRepository.getIntegrationManifest(appId);
    if (!manifest) {
      throw new LabIntegrationsError('Integration manifest not found for app', 'NOT_FOUND');
    }
    return manifest;
  }

  listServicesForCaller(caller: User, appId: string): IntegrationServiceDescriptor[] {
    const manifest = this.getManifestForCaller(caller, appId);
    return manifest.integrationServices ?? [];
  }

  /**
   * Aggregate integration services from every enabled app manifest the caller may read.
   * Used by Workflow Studio / Rules for entity field reference (lookups use connector APIs at runtime).
   */
  listIntegrationServiceCatalogForCaller(caller: User): LabIntegrationServiceCatalogResponse {
    const apps: LabIntegrationServiceCatalogAppGroup[] = [];
    for (const app of appsService.getEnabledApps()) {
      if (!canReadHostBindings(caller, app.id)) {
        continue;
      }
      const manifest = appsRepository.getIntegrationManifest(app.id);
      const services = manifest?.integrationServices ?? [];
      if (!services.length) {
        continue;
      }
      apps.push({
        appId: app.id,
        appName: app.name,
        services,
      });
    }
    apps.sort((a, b) => a.appName.localeCompare(b.appName));
    return {
      schemaVersion: LAB_INTEGRATION_SERVICE_CATALOG_SCHEMA_VERSION,
      apps,
    };
  }

  getRegistryDiscoveryForCaller(
    caller: User,
    appId: string,
    serviceId: string,
  ): FormsBuilderContract {
    if (!canReadHostBindings(caller, appId)) {
      throw new LabIntegrationsError('Not allowed to read discovery contract', 'FORBIDDEN');
    }
    const manifest = appsRepository.getIntegrationManifest(appId);
    if (!manifest) {
      throw new LabIntegrationsError('Integration manifest not found for app', 'NOT_FOUND');
    }
    const service = manifest.integrationServices?.find((row) => row.serviceId === serviceId);
    if (!service) {
      throw new LabIntegrationsError(`Integration service not found: ${serviceId}`, 'NOT_FOUND');
    }
    if (service.tier === 'platform') {
      return buildPlatformDiscoveryContract(appId, service, resolveApiHostBase());
    }
    const connectorAppId = resolveIntegrationAppIdForService(appId, serviceId);
    const app = appsService.getAppById(connectorAppId);
    if (!app?.serverPort) {
      throw new LabIntegrationsError('App server port not configured', 'VALIDATION');
    }
    return buildRegistryDiscoveryContract(service, {
      appId: connectorAppId,
      serverPort: app.serverPort,
      apiHostBase: resolveApiHostBase(),
    });
  }
}

export const labIntegrationsHubService = LabIntegrationsHubService.getInstance();
