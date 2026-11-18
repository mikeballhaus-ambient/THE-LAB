import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { KanbanBoardService } from '../services/kanban-board-service';
import type {
  KanbanBoardColumn,
  KanbanBoardFieldKey,
} from '../../shared/types/kanban-board.types';

function parseColumns(body: Record<string, unknown>): KanbanBoardColumn[] | undefined {
  if (!Array.isArray(body.columns)) {
    return undefined;
  }
  return body.columns as KanbanBoardColumn[];
}

const kanbanBoardRoutes = async (fastifyInstance: FastifyInstance) => {
  const boards = KanbanBoardService.getInstance();

  fastifyInstance.get('/', async () => {
    return await boards.list();
  });

  fastifyInstance.get('/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply) => {
    const id = Number.parseInt(request.params.id, 10);
    if (Number.isNaN(id)) {
      return reply.status(400).send({ error: 'Invalid id' });
    }
    const board = await boards.getById(id);
    if (!board) {
      return reply.status(404).send({ error: 'Not found' });
    }
    return board;
  });

  fastifyInstance.post('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = (request.body ?? {}) as Record<string, unknown>;
    const name = String(body.name ?? '').trim();
    const fieldKey = body.fieldKey as KanbanBoardFieldKey;
    const columns = parseColumns(body);
    if (!columns) {
      return reply.status(400).send({ error: 'columns array is required' });
    }
    try {
      const created = await boards.create({
        name,
        fieldKey,
        columns,
        sortOrder: body.sortOrder != null ? Number(body.sortOrder) : undefined,
      });
      if (!created) {
        return reply.status(500).send({ error: 'Failed to create board' });
      }
      return reply.status(201).send(created);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Invalid board';
      return reply.status(400).send({ error: message });
    }
  });

  fastifyInstance.post('/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply) => {
    const id = Number.parseInt(request.params.id, 10);
    if (Number.isNaN(id)) {
      return reply.status(400).send({ error: 'Invalid id' });
    }
    const body = (request.body ?? {}) as Record<string, unknown>;
    const columns = body.columns !== undefined ? parseColumns(body) : undefined;
    if (body.columns !== undefined && !columns) {
      return reply.status(400).send({ error: 'columns must be an array' });
    }
    try {
      const updated = await boards.update(id, {
        name: body.name != null ? String(body.name) : undefined,
        fieldKey: body.fieldKey as KanbanBoardFieldKey | undefined,
        columns,
        sortOrder: body.sortOrder != null ? Number(body.sortOrder) : undefined,
      });
      if (!updated) {
        return reply.status(404).send({ error: 'Not found' });
      }
      return updated;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Invalid board';
      return reply.status(400).send({ error: message });
    }
  });

  fastifyInstance.delete('/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply) => {
    const id = Number.parseInt(request.params.id, 10);
    if (Number.isNaN(id)) {
      return reply.status(400).send({ error: 'Invalid id' });
    }
    const result = await boards.delete(id);
    if (!result.ok) {
      const status = result.error === 'not found' ? 404 : 400;
      return reply.status(status).send({ error: result.error ?? 'Delete failed' });
    }
    return reply.status(204).send();
  });
};

export default kanbanBoardRoutes;
