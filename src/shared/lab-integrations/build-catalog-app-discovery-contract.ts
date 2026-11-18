import type { IntegrationServiceDescriptor } from '@/shared/types/lab-integration-service';
import type {
  FormBuilderContractModelProperty,
  FormsBuilderContract,
  LookupContract,
} from '@/shared/types/forms-builder-integration';
import {
  buildStandardConnectorCrudPaths,
  resolveConnectorApiBase,
} from '@/shared/server/connector-discovery';

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

/**
 * Build lookup contracts from property metadata.
 *
 * Catalog discovery previously hardcoded `lookups: []`, so no catalog app advertised any
 * lookup — every relationship field rendered as free text in Forms Builder. This derives
 * contracts from `lookupProvider` on each property.
 *
 * URL shapes:
 * - `enum`            → embedded `response` (no fetch)
 * - `self-entity`     → this app's `/api/connector/{entityKey}/lookups/{prop}`
 * - `lab-user`        → `/api/platform/users/lookup` (reached via the app's platform proxy)
 * - `provider-entity` → `/api/connector/{entityKey}/lookups/{prop}` on `lookupProviderAppId`
 *                       (absolute base URL supplied by the caller, since the provider lives
 *                        on another port)
 */
export function buildCatalogLookupContracts(
  descriptor: IntegrationServiceDescriptor,
  options: {
    /** Absolute base URL of this app server, e.g. `http://localhost:4110`. */
    selfBaseUrl: string;
  },
): LookupContract[] {
  const properties = descriptor.properties as FormBuilderContractModelProperty[];
  const lookups: LookupContract[] = [];

  for (const property of properties) {
    const provider = property.lookupProvider;
    if (!provider) {
      continue;
    }

    if (provider === 'enum') {
      const options = property.options ?? [];
      if (options.length === 0) {
        continue;
      }
      lookups.push({
        forProperty: property.name,
        endpoint: {
          url: '',
          type: 'GET',
          data: {},
          response: options.map((option) => ({
            id: option.value,
            value: option.value,
            label: option.label,
          })),
        },
      });
      continue;
    }

    if (provider === 'lab-user') {
      lookups.push({
        forProperty: property.name,
        endpoint: {
          url: '/api/platform/users/lookup',
          type: 'GET',
          data: {},
          response: [],
        },
      });
      continue;
    }

    const entityKey = property.lookupEntityKey?.trim();
    if (!entityKey) {
      continue;
    }

    if (provider === 'self-entity') {
      lookups.push({
        forProperty: property.name,
        endpoint: {
          url: `${options.selfBaseUrl.replace(/\/$/, '')}/api/connector/${entityKey}/lookups/${property.name}`,
          type: 'GET',
          data: {},
          response: [],
        },
      });
      continue;
    }

    // provider-entity — routed through the platform so the caller never needs the
    // provider's port. `:3000` resolves it from the registry at request time.
    const providerAppId = property.lookupProviderAppId?.trim();
    if (!providerAppId) {
      continue;
    }

    lookups.push({
      forProperty: property.name,
      endpoint: {
        url: `/api/platform/lab-lookup/${providerAppId}/${entityKey}/lookups/${property.name}`,
        type: 'GET',
        data: {},
        response: [],
      },
    });
  }

  return lookups;
}

/** Discovery contract for catalog hosts on their app server port. */
export function buildCatalogAppDiscoveryContract(
  appFolder: string,
  descriptor: IntegrationServiceDescriptor,
  baseUrl: string,
  port: number,
): FormsBuilderContract {
  const apiBase = resolveConnectorApiBase(baseUrl.replace(/\/$/, ''), port);
  const lookups = buildCatalogLookupContracts(descriptor, {
    selfBaseUrl: apiBase,
  });

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
      lookups,
    },
  };
}
