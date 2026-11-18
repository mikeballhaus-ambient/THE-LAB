import type { FastifyInstance } from 'fastify';
import { FormBindingService } from '../services/form-binding-service';
import type { FormBindingPurpose } from '../../shared/types/entity.types';

export default async function formBindingRoutes(fastify: FastifyInstance) {
  const bindings = FormBindingService.getInstance();

  fastify.get('/form-bindings', async (request) => {
    const query = request.query as { entityKey?: string };
    const data = await bindings.listBindings(query.entityKey);
    const staleDuplicateRows = await bindings.countStaleDuplicateRows();
    return { data, meta: { staleDuplicateRows } };
  });

  fastify.post('/form-bindings/dedupe', async (_request, reply) => {
    try {
      const removed = await bindings.dedupeStoredBindings();
      return reply.send({ success: true, removed });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Dedupe failed';
      return reply.status(500).send({ error: message });
    }
  });

  const setEntityFormKeyHandler = async (
    request: { body: unknown },
    reply: { status: (code: number) => { send: (body: unknown) => unknown } },
  ) => {
    const body = request.body as { entityKey?: string; formKey?: string };
    const entityKey = body.entityKey?.trim();
    const formKey = body.formKey?.trim();
    if (!entityKey || !formKey) {
      return reply.status(400).send({ error: 'entityKey and formKey are required' });
    }
    try {
      await bindings.setEntityFormKey(entityKey, formKey);
      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save form key';
      return reply.status(500).send({ error: message });
    }
  };

  fastify.post('/form-bindings/entity-form-key', setEntityFormKeyHandler);
  fastify.put('/form-bindings/entity-form-key', setEntityFormKeyHandler);

  fastify.post('/form-bindings', async (request, reply) => {
    const body = request.body as {
      entityKey: string;
      purpose: FormBindingPurpose;
      formKey: string;
      isDefault?: boolean;
    };
    if (!body.entityKey || !body.purpose || !body.formKey) {
      return reply.status(400).send({ error: 'entityKey, purpose, and formKey are required' });
    }
    try {
      const row = await bindings.upsertBinding(body);
      if (!row) {
        return reply.status(404).send({ error: 'Unknown entity' });
      }
      return reply.status(201).send(row);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save binding';
      return reply.status(500).send({ error: message });
    }
  });

  fastify.delete('/form-bindings/:id', async (request, reply) => {
    const id = parseInt((request.params as { id: string }).id, 10);
    if (Number.isNaN(id)) {
      return reply.status(400).send({ error: 'Invalid id' });
    }
    const ok = await bindings.deleteBinding(id);
    if (!ok) {
      return reply.status(404).send({ error: 'Not found' });
    }
    return { success: true };
  });
}
