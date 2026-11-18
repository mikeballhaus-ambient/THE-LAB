import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { EntityDefinitionService } from '../services/entity-definition-service';
import { EntityRecordService } from '../services/entity-record-service';
import { LookupDisplayService } from '../services/lookup-display-service';
import type { EntityProperty } from '../../shared/types/entity.types';
import { resolveLabAppActorUserId } from '@/shared/server/lab-app-http-auth';
import {
  syncCrmIntegrationsAfterEntityChange,
  syncCrmIntegrationsAfterEntityRemoved,
  syncCrmIntegrationsForNewEntity,
} from '../services/crm-platform-integration-sync';

function parseListQuery(request: FastifyRequest): { q?: string } {
  const query = request.query as { q?: string };
  return { q: query.q?.trim() || undefined };
}

export default async function entityApiRoutes(fastify: FastifyInstance) {
  const definitions = EntityDefinitionService.getInstance();
  const records = EntityRecordService.getInstance();

  fastify.get('/definitions', async () => {
    return { data: await definitions.listDefinitions() };
  });

  fastify.put('/definitions/reorder', async (request, reply) => {
    const body = request.body as { entityKeys?: string[] };
    const entityKeys = body.entityKeys ?? [];
    if (!Array.isArray(entityKeys) || entityKeys.length === 0) {
      return reply.status(400).send({ error: 'entityKeys array is required' });
    }
    const result = await definitions.reorderDefinitions(entityKeys);
    if (result.errors?.length) {
      return reply.status(400).send({ error: 'Validation failed', details: result.errors });
    }
    return { data: result.definitions ?? [] };
  });

  fastify.post('/definitions', async (request, reply) => {
    const body = request.body as {
      entityKey: string;
      name: string;
      description?: string;
      icon?: string;
      sortOrder?: number;
      properties: EntityProperty[];
      lookupDisplayProperty?: string | null;
      lookupDisplayFormat?: string | null;
    };
    const result = await definitions.createDefinition(body);
    if (result.errors?.length) {
      return reply.status(400).send({ error: 'Validation failed', details: result.errors });
    }
    if (result.definition) {
      try {
        const actorUserId = resolveLabAppActorUserId(request);
        await syncCrmIntegrationsForNewEntity(actorUserId, result.definition);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return reply.status(502).send({
          error: 'Entity created but integration provisioning failed',
          details: message,
          definition: result.definition,
        });
      }
    }
    return reply.status(201).send(result.definition);
  });

  fastify.get('/definitions/:entityKey', async (request, reply) => {
    const { entityKey } = request.params as { entityKey: string };
    const def = await definitions.getByEntityKey(entityKey);
    if (!def) {
      return reply.status(404).send({ error: 'Not found' });
    }
    return def;
  });

  fastify.put('/definitions/:entityKey', async (request, reply) => {
    const { entityKey } = request.params as { entityKey: string };
    const body = request.body as {
      name?: string;
      description?: string;
      icon?: string;
      sortOrder?: number;
      properties?: EntityProperty[];
      lookupDisplayProperty?: string | null;
      lookupDisplayFormat?: string | null;
    };
    const updated = await definitions.updateDefinition(entityKey, body);
    if (updated.errors?.length) {
      return reply.status(400).send({ error: 'Validation failed', details: updated.errors });
    }
    if (!updated.definition) {
      return reply.status(404).send({ error: 'Not found' });
    }
    try {
      const actorUserId = resolveLabAppActorUserId(request);
      await syncCrmIntegrationsAfterEntityChange(actorUserId);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return reply.status(502).send({
        error: 'Entity updated but integration manifest sync failed',
        details: message,
        definition: updated.definition,
      });
    }
    return updated.definition;
  });

  fastify.delete('/definitions/:entityKey', async (request, reply) => {
    const { entityKey } = request.params as { entityKey: string };
    const result = await definitions.deleteDefinition(entityKey);
    if (!result.deleted) {
      return reply.status(result.status ?? 400).send({ error: result.error ?? 'Delete failed' });
    }
    try {
      const actorUserId = resolveLabAppActorUserId(request);
      await syncCrmIntegrationsAfterEntityRemoved(actorUserId, entityKey);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return reply.status(502).send({
        error: 'Entity deleted but integration cleanup failed',
        details: message,
      });
    }
    return { success: true };
  });

  fastify.get('/:entityKey/records', async (request, reply) => {
    const { entityKey } = request.params as { entityKey: string };
    const def = await definitions.getByEntityKey(entityKey);
    if (!def) {
      return reply.status(404).send({ error: 'Unknown entity' });
    }
    const { q } = parseListQuery(request);
    const data = await records.listByEntityKey(entityKey, { q });
    const lookupLabels = await LookupDisplayService.getInstance().buildLookupLabels(def, data);
    return { data, lookupLabels };
  });

  fastify.get('/:entityKey/records/:id', async (request, reply) => {
    const { entityKey, id } = request.params as { entityKey: string; id: string };
    const recordId = parseInt(id, 10);
    if (Number.isNaN(recordId)) {
      return reply.status(400).send({ error: 'Invalid id' });
    }
    const record = await records.getByEntityKeyAndId(entityKey, recordId);
    if (!record) {
      return reply.status(404).send({ error: 'Not found' });
    }
    return record;
  });

  fastify.post(
    '/:entityKey/records',
    async (
      request: FastifyRequest<{ Params: { entityKey: string }; Body: Record<string, unknown> }>,
      reply: FastifyReply,
    ) => {
      const { entityKey } = request.params;
      const result = await records.create(entityKey, request.body ?? {});
      if (result.errors?.length) {
        return reply.status(400).send({ error: 'Validation failed', details: result.errors });
      }
      return reply.status(201).send(result.record);
    },
  );

  fastify.put(
    '/:entityKey/records/:id',
    async (
      request: FastifyRequest<{
        Params: { entityKey: string; id: string };
        Body: Record<string, unknown>;
      }>,
      reply: FastifyReply,
    ) => {
      const recordId = parseInt(request.params.id, 10);
      if (Number.isNaN(recordId)) {
        return reply.status(400).send({ error: 'Invalid id' });
      }
      const result = await records.update(request.params.entityKey, recordId, request.body ?? {});
      if (result.notFound) {
        return reply.status(404).send({ error: 'Not found' });
      }
      if (result.errors?.length) {
        return reply.status(400).send({ error: 'Validation failed', details: result.errors });
      }
      return result.record;
    },
  );

  fastify.delete('/:entityKey/records/:id', async (request, reply) => {
    const recordId = parseInt((request.params as { id: string }).id, 10);
    if (Number.isNaN(recordId)) {
      return reply.status(400).send({ error: 'Invalid id' });
    }
    const result = await records.delete(
      (request.params as { entityKey: string }).entityKey,
      recordId,
    );
    if (!result.deleted) {
      return reply.status(result.status ?? 404).send({
        error: result.error ?? 'Not found',
        references: result.references,
      });
    }
    return { success: true };
  });
}
