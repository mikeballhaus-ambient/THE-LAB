import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { TaskListService } from '../../utils/task-list-service';
import { listToConnectorRecord } from '../../utils/connector/connector-mappers';
import type {
  ConnectorTaskListCreateBody,
  ConnectorTaskListUpdateBody,
} from '../../../shared/types/connector.types';
import { hostAppIdFromRequest } from '../../utils/request-host-scope';
const connectorTaskListsRoutes = async (fastifyInstance: FastifyInstance) => {
  const taskListService = TaskListService.getInstance();

  fastifyInstance.get('/', async (request: FastifyRequest) => {
    const hostScope = hostAppIdFromRequest(request);
    const response = await taskListService.findLists({
      limit: 500,
      offset: 0,
      appId: hostScope,
    });
    return response.lists.map((list) => listToConnectorRecord(list));
  });

  fastifyInstance.get('/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const id = parseInt(request.params.id, 10);
    if (Number.isNaN(id)) {
      return reply.status(400).send({ error: 'Invalid task list id' });
    }
    const list = await taskListService.getList(id, hostAppIdFromRequest(request));
    if (!list) {
      return reply.status(404).send({ error: 'Not Found', message: `Task list ${id} not found` });
    }
    return listToConnectorRecord(list);
  });

  fastifyInstance.post('/', async (request: FastifyRequest<{ Body: ConnectorTaskListCreateBody }>, reply: FastifyReply) => {
    const name = request.body?.name?.trim();
    if (!name) {
      return reply.status(400).send({ error: 'Bad Request', message: 'name is required' });
    }
    const hostScope = hostAppIdFromRequest(request);
    const list = await taskListService.createList({
      name,
      description: request.body.description,
      appId: hostScope ?? undefined,
    });
    if (!list) {
      return reply.status(500).send({ error: 'Failed to create task list' });
    }
    return reply.status(201).send(listToConnectorRecord(list));
  });

  fastifyInstance.post('/:id', async (request: FastifyRequest<{ Params: { id: string }; Body: ConnectorTaskListUpdateBody }>, reply: FastifyReply) => {
    const hostScope = hostAppIdFromRequest(request);
    const id = parseInt(request.params.id, 10);
    if (Number.isNaN(id)) {
      return reply.status(400).send({ error: 'Invalid task list id' });
    }
    const updated = await taskListService.updateList(
      id,
      {
        name: request.body?.name,
        description: request.body?.description,
      },
      hostScope,
    );
    if (!updated) {
      return reply.status(404).send({ error: 'Not Found', message: `Task list ${id} not found` });
    }
    return listToConnectorRecord(updated);
  });

  fastifyInstance.delete('/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const id = request.params.id;
    const deleted = await taskListService.deleteList(id, hostAppIdFromRequest(request));
    if (!deleted) {
      return reply.status(404).send({ error: 'Not Found', message: `Task list ${id} not found` });
    }
    return { success: true, message: `Task list ${id} deleted` };
  });
};

export default connectorTaskListsRoutes;
