import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { EntityDefinitionService } from '../../services/entity-definition-service';
import { EntityRecordService } from '../../services/entity-record-service';
import type { EntityDefinition } from '../../../shared/types/entity.types';
import { formatLookupRecordLabel } from '../../../shared/utils/lookup-record-label';

const RESERVED_SEGMENTS = new Set(['discovery']);

async function resolveDefinition(entityKey: string): Promise<EntityDefinition | null> {
  if (RESERVED_SEGMENTS.has(entityKey)) {
    return null;
  }
  return EntityDefinitionService.getInstance().getByEntityKey(entityKey);
}

const entityConnectorRoutes = async (fastifyInstance: FastifyInstance) => {
  const records = EntityRecordService.getInstance();

  fastifyInstance.get(
    '/:entityKey/lookups/:propertyName',
    async (
      request: FastifyRequest<{ Params: { entityKey: string; propertyName: string } }>,
      reply: FastifyReply,
    ) => {
      const { entityKey, propertyName } = request.params;
      const definition = await resolveDefinition(entityKey);
      if (!definition) {
        return reply.status(404).send({ error: 'Unknown entity' });
      }
      const prop = definition.properties.find((p) => p.name === propertyName);
      if (!prop) {
        return reply.status(404).send({ error: 'Unknown property' });
      }
      if (prop.type === 'enum' && prop.options) {
        return prop.options.map((o) => ({
          id: o.value,
          value: o.value,
          label: o.label,
        }));
      }
      if (prop.type === 'lookup' && prop.lookupEntityKey) {
        const targetDef = await EntityDefinitionService.getInstance().getByEntityKey(
          prop.lookupEntityKey,
        );
        const rows = await records.listByEntityKey(prop.lookupEntityKey, { limit: 500 });
        return rows.map((row) => {
          const { id: rawId, ...rest } = { ...row };
          const id = Number(rawId);
          return {
            id,
            value: String(id),
            label: targetDef
              ? formatLookupRecordLabel(targetDef, { ...rest, id }, prop.lookupLabelProperty)
              : String(id),
          };
        });
      }
      return reply.status(400).send({ error: 'Property is not a lookup or enum' });
    },
  );

  fastifyInstance.get(
    '/:entityKey',
    async (request: FastifyRequest<{ Params: { entityKey: string }; Querystring: { q?: string } }>, reply: FastifyReply) => {
      const definition = await resolveDefinition(request.params.entityKey);
      if (!definition) {
        return reply.status(404).send({ error: 'Unknown entity' });
      }
      const q = request.query.q?.trim() || undefined;
      return records.listByEntityKey(definition.entityKey, { q });
    },
  );

  fastifyInstance.get(
    '/:entityKey/:id',
    async (
      request: FastifyRequest<{ Params: { entityKey: string; id: string } }>,
      reply: FastifyReply,
    ) => {
      const { entityKey, id } = request.params;
      if (id === 'lookups') {
        return reply.status(404).send({ error: 'Not found' });
      }
      const definition = await resolveDefinition(entityKey);
      if (!definition) {
        return reply.status(404).send({ error: 'Unknown entity' });
      }
      const recordId = parseInt(id, 10);
      if (Number.isNaN(recordId)) {
        return reply.status(400).send({ error: 'Invalid id' });
      }
      const record = await records.getByEntityKeyAndId(definition.entityKey, recordId);
      if (!record) {
        return reply.status(404).send({ error: 'Not found' });
      }
      return record;
    },
  );

  fastifyInstance.post(
    '/:entityKey',
    async (
      request: FastifyRequest<{ Params: { entityKey: string }; Body: Record<string, unknown> }>,
      reply: FastifyReply,
    ) => {
      const definition = await resolveDefinition(request.params.entityKey);
      if (!definition) {
        return reply.status(404).send({ error: 'Unknown entity' });
      }
      const body = (request.body ?? {}) as Record<string, unknown>;
      const payload = { ...body };
      delete payload.id;
      const result = await records.create(definition.entityKey, payload);
      if (result.errors?.length) {
        return reply.status(400).send({ error: 'Validation failed', details: result.errors });
      }
      return reply.status(201).send(result.record);
    },
  );

  fastifyInstance.post(
    '/:entityKey/:id',
    async (
      request: FastifyRequest<{
        Params: { entityKey: string; id: string };
        Body: Record<string, unknown>;
      }>,
      reply: FastifyReply,
    ) => {
      const { entityKey, id } = request.params;
      const definition = await resolveDefinition(entityKey);
      if (!definition) {
        return reply.status(404).send({ error: 'Unknown entity' });
      }
      const recordId = parseInt(id, 10);
      if (Number.isNaN(recordId)) {
        return reply.status(400).send({ error: 'Invalid id' });
      }
      const body = (request.body ?? {}) as Record<string, unknown>;
      const payload = { ...body };
      delete payload.id;
      const result = await records.update(definition.entityKey, recordId, payload);
      if (result.notFound) {
        return reply.status(404).send({ error: 'Not found' });
      }
      if (result.errors?.length) {
        return reply.status(400).send({ error: 'Validation failed', details: result.errors });
      }
      return result.record;
    },
  );

  fastifyInstance.delete(
    '/:entityKey/:id',
    async (
      request: FastifyRequest<{ Params: { entityKey: string; id: string } }>,
      reply: FastifyReply,
    ) => {
      const { entityKey, id } = request.params;
      const definition = await resolveDefinition(entityKey);
      if (!definition) {
        return reply.status(404).send({ error: 'Unknown entity' });
      }
      const recordId = parseInt(id, 10);
      if (Number.isNaN(recordId)) {
        return reply.status(400).send({ error: 'Invalid id' });
      }
      const deleted = await records.delete(definition.entityKey, recordId);
      if (!deleted.deleted) {
        return reply.status(deleted.status ?? 404).send({
          error: deleted.error ?? 'Not found',
          references: deleted.references,
        });
      }
      return { success: true, message: `Record ${recordId} deleted` };
    },
  );
};

export default entityConnectorRoutes;
