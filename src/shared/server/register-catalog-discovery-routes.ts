import type { FastifyInstance } from 'fastify';
import { buildConnectorDiscoveryIndex } from '@/shared/server/connector-discovery';
import type { IntegrationServiceDescriptor } from '@/shared/types/lab-integration-service';
import { buildCatalogAppDiscoveryContract } from '@/shared/lab-integrations/build-catalog-app-discovery-contract';

export interface CatalogDiscoveryEntityRegistration {
  entityKey: string;
  name: string;
  descriptor: IntegrationServiceDescriptor;
}

export function registerCatalogDiscoveryRoutes(
  server: FastifyInstance,
  appFolder: string,
  entities: CatalogDiscoveryEntityRegistration[],
): void {
  server.get('/api/connector/discovery', async () =>
    buildConnectorDiscoveryIndex(
      appFolder,
      entities.map((row) => ({
        entityKey: row.entityKey,
        name: row.name,
        discoveryPath: row.entityKey,
      })),
    ),
  );

  for (const entity of entities) {
    server.get(`/api/connector/discovery/${entity.entityKey}`, async () => {
      const baseUrl = process.env.BASEURL ?? 'http://localhost';
      const port = process.env.PORT ? Number.parseInt(process.env.PORT, 10) : 3000;
      return buildCatalogAppDiscoveryContract(appFolder, entity.descriptor, baseUrl, port);
    });
  }
}
