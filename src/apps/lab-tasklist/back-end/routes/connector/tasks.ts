import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { TaskService } from '../../utils/task-service';
import { TaskListService } from '../../utils/task-list-service';
import {
  parseConnectorTaskCreate,
  parseConnectorTaskUpdate,
  taskToConnectorRecord,
} from '../../utils/connector/connector-mappers';
import { getTaskListIdForTask } from '../../utils/connector/connector-task-queries';
import type {
  ConnectorTaskCreateBody,
  ConnectorTaskUpdateBody,
} from '../../../shared/types/connector.types';
import { TaskPriority } from '../../../shared/types/task.types';
import { hostAppIdFromRequest } from '../../utils/request-host-scope';
import { validateTaskAssigneeId } from '@/shared/server/lab-user-reference-validation';
import { resolveLabAppActorUserId } from '@/shared/server/lab-app-http-auth';

const connectorTasksRoutes = async (fastifyInstance: FastifyInstance) => {
  const taskService = TaskService.getInstance();
  const taskListService = TaskListService.getInstance();

  fastifyInstance.get('/', async (request: FastifyRequest<{ Querystring: { taskListId?: string } }>) => {
    const hostScope = hostAppIdFromRequest(request);
    const taskListId = request.query.taskListId
      ? parseInt(request.query.taskListId, 10)
      : undefined;
    let tasks;
    if (taskListId && !Number.isNaN(taskListId)) {
      tasks = await taskListService.getTasksInList(taskListId, hostScope);
    } else {
      const result = await taskService.findTasks(undefined, undefined, {
        page: 1,
        limit: 500,
        total: 0,
        totalPages: 0,
      });
      tasks = result.tasks;
    }
    const records = await Promise.all(
      tasks.map(async (task) => {
        const listId = await getTaskListIdForTask(task.id);
        return taskToConnectorRecord(task, listId);
      }),
    );
    return records;
  });

  fastifyInstance.get('/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const id = parseInt(request.params.id, 10);
    if (Number.isNaN(id)) {
      return reply.status(400).send({ error: 'Invalid task id' });
    }
    const task = await taskService.getTask(id);
    if (!task) {
      return reply.status(404).send({ error: 'Not Found', message: `Task ${id} not found` });
    }
    const taskListId = await getTaskListIdForTask(id);
    return taskToConnectorRecord(task, taskListId);
  });

  fastifyInstance.post('/', async (request: FastifyRequest<{ Body: ConnectorTaskCreateBody }>, reply: FastifyReply) => {
    const hostScope = hostAppIdFromRequest(request);
    const parsed = parseConnectorTaskCreate(request.body ?? ({} as ConnectorTaskCreateBody));
    if (!parsed.title) {
      return reply.status(400).send({ error: 'Bad Request', message: 'title is required' });
    }
    if (parsed.taskListId != null && !(await taskListService.assertListInHostScope(parsed.taskListId, hostScope))) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'taskListId is not in scope for this host app',
      });
    }
    const actorUserId = resolveLabAppActorUserId(request);
    let assigneeId: string | undefined;
    try {
      assigneeId = await validateTaskAssigneeId(parsed.assigneeId, actorUserId);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Invalid assigneeId';
      return reply.status(400).send({ error: 'Bad Request', message });
    }
    const task = await taskService.createTask({
      title: parsed.title,
      description: parsed.description,
      status: parsed.status,
      priority: parsed.priority ?? TaskPriority.MEDIUM,
      dueDate: parsed.dueDate,
      assigneeId,
      tags: parsed.tags,
      metadata: parsed.metadata,
    });
    if (!task) {
      return reply.status(500).send({ error: 'Failed to create task' });
    }
    if (parsed.taskListId != null) {
      const linked = await taskListService.addTaskToList(parsed.taskListId, task.id, hostScope);
      if (!linked) {
        return reply.status(400).send({ error: 'Bad Request', message: 'Failed to add task to list' });
      }
    }
    const taskListId = parsed.taskListId ?? (await getTaskListIdForTask(task.id));
    return reply.status(201).send(taskToConnectorRecord(task, taskListId));
  });

  fastifyInstance.post('/:id', async (request: FastifyRequest<{ Params: { id: string }; Body: ConnectorTaskUpdateBody }>, reply: FastifyReply) => {
    const hostScope = hostAppIdFromRequest(request);
    const id = parseInt(request.params.id, 10);
    if (Number.isNaN(id)) {
      return reply.status(400).send({ error: 'Invalid task id' });
    }
    const existing = await taskService.getTask(id);
    if (!existing) {
      return reply.status(404).send({ error: 'Not Found', message: `Task ${id} not found` });
    }
    const parsed = parseConnectorTaskUpdate(request.body ?? {});
    const { taskListId, ...updates } = parsed;
    const actorUserId = resolveLabAppActorUserId(request);
    let assigneeId = updates.assigneeId;
    if (updates.assigneeId !== undefined) {
      try {
        assigneeId = await validateTaskAssigneeId(updates.assigneeId, actorUserId);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Invalid assigneeId';
        return reply.status(400).send({ error: 'Bad Request', message });
      }
    }
    const updated = await taskService.updateTask(id, {
      title: updates.title,
      description: updates.description,
      status: updates.status,
      priority: updates.priority,
      dueDate: updates.dueDate,
      assigneeId,
      tags: updates.tags,
      metadata: updates.metadata,
    });
    if (!updated) {
      return reply.status(500).send({ error: 'Failed to update task' });
    }
    if (taskListId != null && !Number.isNaN(taskListId)) {
      if (!(await taskListService.assertListInHostScope(taskListId, hostScope))) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'taskListId is not in scope for this host app',
        });
      }
      const linked = await taskListService.addTaskToList(taskListId, id, hostScope);
      if (!linked) {
        return reply.status(400).send({ error: 'Bad Request', message: 'Failed to add task to list' });
      }
    }
    const resolvedListId = taskListId ?? (await getTaskListIdForTask(id));
    return taskToConnectorRecord(updated, resolvedListId);
  });

  fastifyInstance.delete('/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const id = parseInt(request.params.id, 10);
    if (Number.isNaN(id)) {
      return reply.status(400).send({ error: 'Invalid task id' });
    }
    const deleted = await taskService.deleteTask(id);
    if (!deleted) {
      return reply.status(404).send({ error: 'Not Found', message: `Task ${id} not found` });
    }
    return { success: true, message: `Task ${id} deleted` };
  });
};

export default connectorTasksRoutes;
