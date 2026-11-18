import type { FastifyInstance } from 'fastify';
import { buildCatalogHostManifest } from '@/shared/lab-integrations/catalog-manifest-builder';
import { catalogHostDef } from '@/shared/lab-integrations/catalog-manifests';
import type { AppLabIntegrationManifestV1 } from '@/shared/types/lab-integration-manifest';
import type { IntegrationServiceDescriptor } from '@/shared/types/lab-integration-service';
import {
  registerCatalogCrudConnectorRoutes,
  registerCatalogLookupRoutes,
  type CatalogCrudConnectorHandlers,
} from '@/shared/server/catalog-crud-connector-routes';
import { registerCatalogDiscoveryRoutes } from '@/shared/server/register-catalog-discovery-routes';

export type CatalogConnectorHandlerMap = Record<string, CatalogCrudConnectorHandlers<unknown>>;

function discoveryEntityKeyFromPath(discoveryPath: string | undefined, fallbackSegment: string): string {
  const trimmed = (discoveryPath ?? '').trim();
  const match = trimmed.match(/^\/?discovery\/(.+)$/);
  if (match?.[1]) {
    return match[1];
  }
  return fallbackSegment;
}

/**
 * Registers `/api/connector/{segment}` CRUD + discovery for hosts that ship an integration
 * manifest but are not Wave C catalog apps (e.g. Chart Builder).
 */
export async function registerIntegrationServiceConnectors(
  server: FastifyInstance,
  manifest: AppLabIntegrationManifestV1,
  handlersBySegment: CatalogConnectorHandlerMap,
  discoveryAppFolder: string,
): Promise<void> {
  const discoveryRows: Array<{
    entityKey: string;
    name: string;
    descriptor: IntegrationServiceDescriptor;
  }> = [];

  for (const service of manifest.integrationServices ?? []) {
    const segment = service.connector?.segment;
    if (!segment) {
      continue;
    }
    const handlers = handlersBySegment[segment];
    if (!handlers) {
      continue;
    }
    await registerCatalogCrudConnectorRoutes(server, `/api/connector/${segment}`, handlers);
    await registerCatalogLookupRoutes(
      server,
      `/api/connector/${segment}`,
      handlers,
      service.properties ?? [],
    );
    discoveryRows.push({
      entityKey: discoveryEntityKeyFromPath(service.connector.discoveryPath, segment),
      name: service.entityName,
      descriptor: service,
    });
  }

  if (discoveryRows.length > 0) {
    registerCatalogDiscoveryRoutes(server, discoveryAppFolder, discoveryRows);
  }
}

/**
 * Registers connector CRUD for a host app — catalog Wave C hosts use {@link registerCatalogConnectors};
 * other manifests (Chart Builder) use {@link registerIntegrationServiceConnectors}.
 */
export async function registerHostIntegrationConnectors(
  server: FastifyInstance,
  options: {
    hostAppId: string;
    manifest: AppLabIntegrationManifestV1;
    handlersBySegment: CatalogConnectorHandlerMap;
    discoveryAppFolder: string;
  },
): Promise<void> {
  if (catalogHostDef(options.hostAppId)) {
    await registerCatalogConnectors(server, options.hostAppId, options.handlersBySegment);
    return;
  }
  await registerIntegrationServiceConnectors(
    server,
    options.manifest,
    options.handlersBySegment,
    options.discoveryAppFolder,
  );
}

/** Registers connector + discovery for every entity in the catalog host manifest. */
export async function registerCatalogConnectors(
  server: FastifyInstance,
  hostAppId: string,
  handlersBySegment: CatalogConnectorHandlerMap,
): Promise<void> {
  const def = catalogHostDef(hostAppId);
  if (!def?.entities.length) {
    return;
  }
  const manifest = buildCatalogHostManifest(def);
  const discoveryRows: Array<{
    entityKey: string;
    name: string;
    descriptor: NonNullable<typeof manifest.integrationServices>[number];
  }> = [];

  for (const entity of def.entities) {
    const handlers = handlersBySegment[entity.connectorSegment];
    if (!handlers) {
      continue;
    }
    const descriptor = manifest.integrationServices?.find(
      (row) => row.serviceId === `${def.slug}.${entity.connectorSegment}`,
    );
    if (!descriptor) {
      continue;
    }
    await registerCatalogCrudConnectorRoutes(
      server,
      `/api/connector/${entity.connectorSegment}`,
      handlers,
    );
    await registerCatalogLookupRoutes(
      server,
      `/api/connector/${entity.connectorSegment}`,
      handlers,
      entity.properties,
    );
    discoveryRows.push({
      entityKey: entity.discoveryEntityKey,
      name: entity.entityName,
      descriptor,
    });
  }

  if (discoveryRows.length > 0) {
    registerCatalogDiscoveryRoutes(server, def.slug, discoveryRows);
  }
}

/** @deprecated Use registerCatalogConnectors with a single-segment map. */
export async function registerCatalogPrimaryConnector<TRecord>(
  server: FastifyInstance,
  hostAppId: string,
  handlers: CatalogCrudConnectorHandlers<TRecord>,
): Promise<void> {
  const def = catalogHostDef(hostAppId);
  const segment = def?.entities[0]?.connectorSegment;
  if (!segment) {
    return;
  }
  await registerCatalogConnectors(server, hostAppId, {
    [segment]: handlers as CatalogCrudConnectorHandlers<unknown>,
  });
}
