import type { IntegrationServiceDescriptor } from '@/shared/types/lab-integration-service';
import type {
  FormBuilderContractModel,
  FormBuilderContractModelProperty,
  FormsBuilderContract,
} from '@/shared/types/forms-builder-integration';
import {
  buildStandardConnectorCrudPaths,
  resolveConnectorApiBase,
} from '@/shared/server/connector-discovery';
import { buildHelpDeskTicketLookupContracts } from '@/shared/lab-integrations/help-desk-ticket-lookup-contracts';
import { buildTaskEntityLookupContracts } from '@/shared/lab-integrations/task-list-task-lookup-contracts';

export interface RegistryDiscoveryAppContext {
  /** Registry app id, e.g. app-lab-tasklist */
  appId: string;
  /** App server port for CRUD baseUrl */
  serverPort: number;
  /** Host base without port, e.g. http://localhost */
  apiHostBase: string;
}

function buildEntityModel(descriptor: IntegrationServiceDescriptor): FormBuilderContractModel {
  const properties = descriptor.properties as FormBuilderContractModelProperty[];
  const pk = descriptor.primaryKeyType;
  return {
    id: pk,
    name: descriptor.entityName,
    description: descriptor.entityName,
    status: 'active',
    properties,
  } as FormBuilderContractModel;
}

function registryLookupsForService(
  descriptor: IntegrationServiceDescriptor,
  apiBase: string,
): FormsBuilderContract['endpoints']['lookups'] {
  if (!descriptor.capabilities?.includes('Lookups')) {
    return [];
  }
  if (descriptor.serviceId === 'task-list.tasks' || descriptor.connector.segment === 'tasks') {
    return buildTaskEntityLookupContracts(apiBase);
  }
  if (descriptor.serviceId === 'help-desk.tickets' || descriptor.connector.segment === 'tickets') {
    return buildHelpDeskTicketLookupContracts(apiBase);
  }
  return [];
}

/**
 * Build a FormsBuilderContract from registry integration service descriptor (T0 domain tier).
 */
export function buildRegistryDiscoveryContract(
  descriptor: IntegrationServiceDescriptor,
  ctx: RegistryDiscoveryAppContext,
): FormsBuilderContract {
  const appFolder = ctx.appId.replace(/^app-/, '');
  const apiBase = resolveConnectorApiBase(ctx.apiHostBase, ctx.serverPort);
  const getAllFilter = descriptor.integration?.contextKeys?.includes('taskListId')
    ? 'taskListId'
    : undefined;

  return {
    appName: appFolder,
    entityName: descriptor.entityName,
    capabilities: descriptor.capabilities,
    entityModel: buildEntityModel(descriptor),
    endpoints: {
      baseUrl: apiBase,
      crud: buildStandardConnectorCrudPaths({
        segment: descriptor.connector.segment,
        getAllFilter,
      }),
      lookups: registryLookupsForService(descriptor, apiBase),
    },
  };
}
