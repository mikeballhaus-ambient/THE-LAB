import type { IntegrationServiceDescriptor } from '@/shared/types/lab-integration-service';
import type { FormsBuilderContract } from '@/shared/types/forms-builder-integration';
import {
  buildStandardConnectorCrudPaths,
  resolveConnectorApiBase,
} from '@/shared/server/connector-discovery';
import type { FormBuilderContractModelProperty } from '@/shared/types/forms-builder-integration';
import { buildPlatformConnectorLookupContracts } from './platform-connector-lookup-contracts';

const PLATFORM_BACKEND_PORT = 3000;

function buildEntityModel(descriptor: IntegrationServiceDescriptor) {
  const properties = descriptor.properties as FormBuilderContractModelProperty[];
  return {
    id: descriptor.primaryKeyType,
    name: descriptor.entityName,
    description: descriptor.entityName,
    status: 'active' as const,
    properties,
  };
}

/** Discovery contract for tier `platform` services on main backend (:3000). */
export function buildPlatformDiscoveryContract(
  hostAppId: string,
  descriptor: IntegrationServiceDescriptor,
  apiHostBase: string,
): FormsBuilderContract {
  const appFolder = hostAppId.replace(/^app-/, '');
  const apiBase = resolveConnectorApiBase(apiHostBase.replace(/\/$/, ''), PLATFORM_BACKEND_PORT);
  const properties = descriptor.properties as FormBuilderContractModelProperty[];
  return {
    appName: appFolder,
    entityName: descriptor.entityName,
    capabilities: descriptor.capabilities,
    entityModel: buildEntityModel(descriptor),
    endpoints: {
      baseUrl: apiBase,
      crud: buildStandardConnectorCrudPaths({
        segment: descriptor.connector.segment,
      }),
      lookups: buildPlatformConnectorLookupContracts(apiBase, properties, {
        serviceId: descriptor.serviceId,
        hostAppId,
      }),
    },
  };
}
