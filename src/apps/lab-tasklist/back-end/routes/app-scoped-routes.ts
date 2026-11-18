import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { normalizeTaskListAppId } from '../../shared/constants/app-scope';
import { TaskListService } from '../utils/task-list-service';

const taskListService = TaskListService.getInstance();

function parseAppIdQuery(request: FastifyRequest): string | null {
  const q = (request.query as { appId?: string })?.appId;
  const id = normalizeTaskListAppId(q);
  if (!id) {
    return null;
  }
  return id;
}

export function registerAppScopedRoutes(server: FastifyInstance): void {
  server.get(
    '/api/app-scoped/task-lists',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const appId = parseAppIdQuery(request);
      if (!appId) {
        return reply.status(400).send({
          success: false,
          error: 'Query appId is required (e.g. appId=app-lab-crm)',
        });
      }
      const response = await taskListService.findLists({
        appId,
        limit: 100,
        offset: 0,
      });
      return reply.send({ success: true, data: response });
    },
  );

  server.get(
    '/api/app-scoped/tasks',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const appId = parseAppIdQuery(request);
      if (!appId) {
        return reply.status(400).send({
          success: false,
          error: 'Query appId is required (e.g. appId=app-lab-crm)',
        });
      }
      const query = request.query as { appId?: string; entityKey?: string; recordId?: string };
      const recordIdRaw = query.recordId;
      const recordId =
        recordIdRaw != null && recordIdRaw !== '' && !Number.isNaN(Number(recordIdRaw))
          ? Number(recordIdRaw)
          : undefined;
      const entityKey = query.entityKey?.trim() || undefined;
      const tasks = await taskListService.findTasksForHostApp(appId, {
        entityKey,
        recordId,
      });
      return reply.send({ success: true, data: tasks });
    },
  );

  server.post(
    '/api/app-scoped/task-lists',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = request.body as { appId?: string; name?: string; description?: string };
      const appId = normalizeTaskListAppId(body?.appId);
      if (!appId) {
        return reply.status(400).send({
          success: false,
          error: 'body.appId is required for scoped lists',
        });
      }
      const name = body?.name?.trim();
      if (!name) {
        return reply.status(400).send({ success: false, error: 'name is required' });
      }
      const list = await taskListService.createList({
        name,
        description: body.description,
        appId,
      });
      if (!list) {
        return reply.status(500).send({ success: false, error: 'Failed to create list' });
      }
      return reply.send({ success: true, data: list });
    },
  );
}
