import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { KanbanBoardService } from '../../services/kanban-board-service';
import type {
  KanbanBoard,
  KanbanBoardColumn,
  KanbanBoardFieldKey,
} from '../../../shared/types/kanban-board.types';
import { parseKanbanColumnsJson } from '../../../shared/utils/kanban-board-utils';

function toConnector(board: KanbanBoard) {
  return {
    id: board.id,
    name: board.name,
    fieldKey: board.fieldKey,
    columnsJson: JSON.stringify(board.columns),
    sortOrder: board.sortOrder,
    isSystem: board.isSystem,
    createdAt: board.createdAt,
    updatedAt: board.updatedAt,
  };
}

function parseColumnsFromBody(body: Record<string, unknown>): KanbanBoardColumn[] {
  if (Array.isArray(body.columns)) {
    return body.columns as KanbanBoardColumn[];
  }
  const raw = body.columnsJson;
  if (typeof raw === 'string' && raw.trim()) {
    return parseKanbanColumnsJson(raw);
  }
  return [];
}

function parseFieldKey(raw: unknown): KanbanBoardFieldKey {
  const value = String(raw ?? 'status');
  if (value === 'priority' || value === 'assigneeId' || value === 'status') {
    return value;
  }
  return 'status';
}

const connectorKanbanBoardsRoutes = async (fastifyInstance: FastifyInstance) => {
  const boards = KanbanBoardService.getInstance();

  fastifyInstance.get('/', async () => {
    const list = await boards.list();
    return list.map(toConnector);
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
    return toConnector(board);
  });

  fastifyInstance.post('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = (request.body ?? {}) as Record<string, unknown>;
    const name = String(body.name ?? '').trim();
    if (!name) {
      return reply.status(400).send({ error: 'name is required' });
    }
    try {
      const created = await boards.create({
        name,
        fieldKey: parseFieldKey(body.fieldKey),
        columns: parseColumnsFromBody(body),
        sortOrder: body.sortOrder != null ? Number(body.sortOrder) : undefined,
      });
      if (!created) {
        return reply.status(500).send({ error: 'Failed to create board' });
      }
      return toConnector(created);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Invalid board';
      return reply.status(400).send({ error: message });
    }
  });

  const updateById = async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) => {
    const id = Number.parseInt(request.params.id, 10);
    if (Number.isNaN(id)) {
      return reply.status(400).send({ error: 'Invalid id' });
    }
    const body = (request.body ?? {}) as Record<string, unknown>;
    try {
      const updated = await boards.update(id, {
        name: body.name != null ? String(body.name) : undefined,
        fieldKey: body.fieldKey != null ? parseFieldKey(body.fieldKey) : undefined,
        columns: body.columns !== undefined || body.columnsJson !== undefined
          ? parseColumnsFromBody(body)
          : undefined,
        sortOrder: body.sortOrder != null ? Number(body.sortOrder) : undefined,
      });
      if (!updated) {
        return reply.status(404).send({ error: 'Not found' });
      }
      return toConnector(updated);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Invalid board';
      return reply.status(400).send({ error: message });
    }
  };

  /** rm-46 connector contract: Forms Builder stubs use POST on `/:id` for updates (same as tickets). */
  fastifyInstance.post('/:id', updateById);
  fastifyInstance.put('/:id', updateById);

  fastifyInstance.delete(
    '/:id',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const id = Number.parseInt(request.params.id, 10);
      if (Number.isNaN(id)) {
        return reply.status(400).send({ error: 'Invalid id' });
      }
      const result = await boards.delete(id);
      if (!result.ok) {
        return reply.status(result.error === 'not found' ? 404 : 400).send({ error: result.error });
      }
      return { success: true };
    },
  );
};

export default connectorKanbanBoardsRoutes;
