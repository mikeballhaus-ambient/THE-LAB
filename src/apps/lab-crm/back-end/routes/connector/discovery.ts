import type { FastifyInstance } from 'fastify';
import { EntityDefinitionService } from '../../services/entity-definition-service';
import { buildEntityDiscoveryContract } from '../../utils/connector/discovery-builder';
import { buildConnectorDiscoveryIndex } from '@/shared/server/connector-discovery';

const RESERVED = new Set(['discovery']);

const discoveryRoutes = async (fastifyInstance: FastifyInstance) => {
  const baseUrl = process.env.BASEURL ?? 'http://localhost';
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3010;
  const definitions = EntityDefinitionService.getInstance();

  fastifyInstance.get('/', async () => {
    const defs = await definitions.listDefinitions();
    return buildConnectorDiscoveryIndex(
      'crm',
      defs.map((d) => ({
        entityKey: d.entityKey,
        name: d.name,
        discoveryPath: d.entityKey,
      })),
    );
  });

  fastifyInstance.get('/:entityKey', async (request, reply) => {
    const { entityKey } = request.params as { entityKey: string };
    if (RESERVED.has(entityKey)) {
      return reply.status(404).send({ error: 'Not found' });
    }
    const definition = await definitions.getByEntityKey(entityKey);
    if (!definition) {
      return reply.status(404).send({ error: 'Unknown entity', entityKey });
    }
    return buildEntityDiscoveryContract(definition, baseUrl, port);
  });
};

export default discoveryRoutes;
