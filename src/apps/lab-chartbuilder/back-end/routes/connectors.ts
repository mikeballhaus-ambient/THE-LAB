import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { getLabAppUserFromRequest } from '@/shared/server/lab-app-http-auth';
import type { ChartService } from '../services/chart-service';
import { buildConnectorRequestHeaders } from '../services/connector-request';
import { describeDiscoveryFetchFailure } from '../utils/discovery-fetch-errors';

/**
 * `/api/v1/connectors` — data connector CRUD + discovery preview.
 *
 * Payload shape is fixed by `front-end/composables/useChartConnectors.ts`:
 *   GET    /api/v1/connectors            → { connectors }
 *   POST   /api/v1/connectors            ← { discovery_url, is_active? }
 *   POST   /api/v1/connectors/preview    ← { discovery_url }
 *   POST   /api/v1/connectors/:id/verify → connector (with contractPreview)
 *   DELETE /api/v1/connectors/:id
 */

const CreateSchema = z.object({
  discovery_url: z.string().url(),
  is_active: z.boolean().optional(),
});

const PreviewSchema = z.object({
  discovery_url: z.string().url(),
});

interface DiscoveryModelProperty {
  name?: string;
}

function actorUserIdOf(request: FastifyRequest): number | null {
  return getLabAppUserFromRequest(request)?.labUserId ?? null;
}

/** Ask a discovery URL for its contract and reduce it to the fields the UI shows. */
async function fetchContract(
  discoveryUrl: string,
  actorUserId: number | null = null,
): Promise<{ appName: string; entityName: string; propertyNames: string[] }> {
  let response: Response;
  try {
    response = await fetch(discoveryUrl, {
      headers: {
        Accept: 'application/json',
        ...buildConnectorRequestHeaders(discoveryUrl, actorUserId),
      },
    });
  } catch (err) {
    throw new Error(describeDiscoveryFetchFailure(discoveryUrl, err));
  }
  if (!response.ok) {
    throw new Error(describeDiscoveryFetchFailure(discoveryUrl, null, response.status));
  }
  const body = (await response.json()) as {
    appName?: string;
    entityName?: string;
    entityModel?: { properties?: DiscoveryModelProperty[] };
  };
  return {
    appName: body.appName ?? '',
    entityName: body.entityName ?? '',
    propertyNames: (body.entityModel?.properties ?? [])
      .map((property) => property.name)
      .filter((name): name is string => Boolean(name)),
  };
}

export function registerConnectorRoutes(server: FastifyInstance, service: ChartService): void {
  server.get('/api/v1/connectors', async () => ({
    connectors: service.connectors.findAll(),
  }));

  server.post('/api/v1/connectors/preview', async (request, reply) => {
    const parsed = PreviewSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.message });
    }
    try {
      return await fetchContract(parsed.data.discovery_url, actorUserIdOf(request));
    } catch (err) {
      return reply
        .status(422)
        .send({ error: err instanceof Error ? err.message : 'Discovery failed' });
    }
  });

  server.post('/api/v1/connectors', async (request, reply: FastifyReply) => {
    const parsed = CreateSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.message });
    }

    let contract: { appName: string; entityName: string; propertyNames: string[] };
    try {
      contract = await fetchContract(parsed.data.discovery_url, actorUserIdOf(request));
    } catch (err) {
      return reply
        .status(422)
        .send({ error: err instanceof Error ? err.message : 'Discovery failed' });
    }

    // Idempotent per (app, entity): re-adding an existing source updates its URL.
    const existing = service.connectors.findByAppEntity(contract.appName, contract.entityName);
    if (existing) {
      const updated = service.connectors.update(existing.id, {
        discoveryUrl: parsed.data.discovery_url,
        isActive: parsed.data.is_active ?? true,
      });
      return reply.send(updated);
    }

    const created = service.connectors.create({
      appName: contract.appName,
      entityName: contract.entityName,
      discoveryUrl: parsed.data.discovery_url,
      isActive: parsed.data.is_active ?? true,
    });
    return reply.status(201).send(created);
  });

  server.post('/api/v1/connectors/:id/verify', async (request, reply) => {
    const id = Number((request.params as { id: string }).id);
    const connector = service.connectors.findById(id);
    if (!connector) {
      return reply.status(404).send({ error: `Connector not found: ${id}` });
    }
    try {
      const contract = await fetchContract(connector.discoveryUrl, actorUserIdOf(request));
      return {
        ...connector,
        contractPreview: {
          appName: contract.appName,
          entityName: contract.entityName,
          entityModel: {
            properties: contract.propertyNames.map((name) => ({ name })),
          },
        },
      };
    } catch (err) {
      return reply
        .status(422)
        .send({ error: err instanceof Error ? err.message : 'Verify failed' });
    }
  });

  server.delete('/api/v1/connectors/:id', async (request, reply) => {
    const id = Number((request.params as { id: string }).id);
    const deleted = service.connectors.delete(id);
    return deleted ? { success: true } : reply.status(404).send({ error: `Connector not found: ${id}` });
  });
}
