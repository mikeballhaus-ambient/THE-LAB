import { randomUUID } from 'node:crypto';
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { VSCodeLogger } from '@/backend/utils/logger';
import { resolveLabAppActorUserId } from '@/shared/server/lab-app-http-auth';
import { publishLabDomainEvent } from '@/shared/services/platform-lab-events.client.node';
import { buildLabEventType } from '@/shared/types/lab-domain-event';
import { TaskService } from './task-service';
import { TaskListService } from './task-list-service';
import {
  TaskCreateInput,
  TaskPriority,
  TaskStatus,
  TaskUpdateInput,
  type TaskFilter,
  type FindTaskListsFilter,
} from '../../shared/types/task.types';
import { TASK_LIST_UI_HOST_SCOPE } from '../../shared/constants/app-scope';

function routeErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

// Initialize services
const taskService = TaskService.getInstance();
const taskListService = TaskListService.getInstance();

// API Route Handlers
export const registerTaskRoutes = (server: FastifyInstance) => {

  // Get all tasks
  server.get('/api/tasks', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const query = request.query as {
        page?: string;
        limit?: string;
        sortField?: string;
        sortDirection?: string;
        status?: string;
        priority?: string;
      };
      const page = query.page ? Number.parseInt(query.page, 10) : 1;
      const limit = query.limit ? Number.parseInt(query.limit, 10) : 20;
      const sort =
        query.sortField && query.sortDirection
          ? {
              field: query.sortField as 'createdAt' | 'updatedAt' | 'dueDate' | 'priority' | 'status',
              direction: query.sortDirection as 'asc' | 'desc',
            }
          : undefined;
      const filter: TaskFilter | undefined =
        query.status || query.priority
          ? {
              ...(query.status ? { status: query.status as TaskStatus } : {}),
              ...(query.priority ? { priority: query.priority as TaskPriority } : {}),
            }
          : undefined;
      console.log('[GET TASKS] Fetching tasks...');
      const response = await taskService.findTasks(filter, sort, {
        page,
        limit,
        total: 0,
        totalPages: 0,
      });
      console.log(`[GET TASKS] Retrieved ${response.tasks.length} tasks`);
      reply.status(200).send({ success: true, data: response })
    } catch (error: unknown) {
      console.error('[GET TASKS] Error:', error);
      reply.status(500).send({ success: false, error: routeErrorMessage(error, 'Failed to fetch tasks') });
    }
  });

  // Get tasks in a specific list
  server.get('/api/tasks/list/:listId', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { listId } = request.params as { listId: string };
      const tasks = await taskListService.getTasksInList(listId, TASK_LIST_UI_HOST_SCOPE);
      reply.status(200).send({ success: true, data: tasks })
    } catch (error: unknown) {
      reply.status(500).send({ success: false, error: routeErrorMessage(error, 'Failed to fetch tasks') });
    }
  });

  // Get task by ID
  server.get('/api/tasks/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.params;
      console.log(`[GET TASK] Fetching task with ID: ${id}`);
      const task = await taskService.getTask(parseInt(id));
      if (!task) {
        console.log(`[GET TASK] Task not found for ID: ${id}`);
        reply.code(404).send({ success: false, error: 'Task not found' });
      } else {
        console.log(`[GET TASK] Found task: ${task.title}`);
        reply.status(200).send({ success: true, data: task });
      }
    } catch (error: unknown) {
      console.error(`[GET TASK] Error fetching task ${request.params?.id}:`, error);
      reply.status(500).send({ success: false, error: routeErrorMessage(error, 'Failed to fetch task') });
    }
  });

  // Create new task
  server.post('/api/tasks', async (request: FastifyRequest<{ Body: TaskCreateInput }>, reply: FastifyReply) => {
    try {
      const input = request.body as TaskCreateInput;
      console.log(`[CREATE TASK] Creating new task with title: ${input.title}`);
      const task = await taskService.createTask(input);

      // If taskListId is provided, add the task to that list
      if (input.taskListId) {
        await taskListService.addTaskToList(input.taskListId, task!.id);
      }

      if (task) {
        try {
          const actorUserId = resolveLabAppActorUserId(request);
          await publishLabDomainEvent(request, {
            schemaVersion: 1,
            id: randomUUID(),
            type: buildLabEventType('app-lab-tasklist', 'task', 'created'),
            sourceAppId: 'app-lab-tasklist',
            occurredAt: new Date().toISOString(),
            actorUserId,
            payload: {
              taskId: task.id,
              title: task.title,
              assigneeId: task.assigneeId ?? null,
            },
          });
        } catch (publishError: unknown) {
          const logger = await VSCodeLogger.getInstance();
          logger.warn(
            `[task-list] lab-events publish skipped: ${
              publishError instanceof Error ? publishError.message : String(publishError)
            }`,
          );
        }
      }

      reply.status(200).send({ success: true, data: task });
    } catch (error: unknown) {
      reply.status(500).send({ success: false, error: routeErrorMessage(error, 'Failed to create task') });
    }
  });

  // Update task
  server.put('/api/tasks/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.params;
      const taskId = parseInt(id);
      const updates = request.body as TaskUpdateInput;
      // Load the pre-write state so a status echo does not publish a second time.
      const before = await taskService.getTask(taskId);
      const task = await taskService.updateTask(taskId, updates);
      if (!task) {
        reply.code(404).send({ success: false, error: 'Task not found' });
        return;
      }

      if (before && before.status !== task.status && task.status === TaskStatus.COMPLETED) {
        try {
          await publishLabDomainEvent(request, {
            schemaVersion: 1,
            id: randomUUID(),
            type: buildLabEventType('app-lab-tasklist', 'task', 'completed'),
            sourceAppId: 'app-lab-tasklist',
            occurredAt: new Date().toISOString(),
            actorUserId: resolveLabAppActorUserId(request),
            payload: {
              taskId: task.id,
              title: task.title,
              assigneeId: task.assigneeId ?? null,
            },
          });
        } catch (publishError: unknown) {
          const logger = await VSCodeLogger.getInstance();
          logger.warn(
            `[task-list] lab-events publish skipped: ${
              publishError instanceof Error ? publishError.message : String(publishError)
            }`,
          );
        }
      }

      reply.status(200).send({ success: true, data: task });
    } catch (error: unknown) {
      reply.status(500).send({ success: false, error: routeErrorMessage(error, 'Failed to update task') });
    }
  });

  // Delete task
  server.delete('/api/tasks/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.params;
      console.log(`[DELETE TASK] Received delete request for task ID: ${id}`);
      const deleted = await taskService.deleteTask(Number(id));
      console.log(`[DELETE TASK] Delete result: ${deleted}`);
      if (!deleted) {
        reply.code(404).send({ success: false, error: 'Task not found' });
      } else {
        reply.status(200).send({ success: true, message: 'Task deleted successfully' });
      }
    } catch (error: unknown) {
      const taskId = request.params?.id || 'unknown';
      console.error(`[DELETE TASK] Error deleting task ${taskId}:`, error);
      reply.status(500).send({ success: false, error: routeErrorMessage(error, 'Failed to delete task') });
    }
  });
};

export const registerTaskListRoutes = (server: FastifyInstance) => {

  // Get all task lists
  server.get('/api/task-lists', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const query = request.query as {
        searchQuery?: string;
        limit?: string;
        offset?: string;
        page?: string;
      };
      const filter: FindTaskListsFilter = {
        appId: TASK_LIST_UI_HOST_SCOPE,
        ...(query.searchQuery ? { searchQuery: query.searchQuery } : {}),
        ...(query.limit ? { limit: Number.parseInt(query.limit, 10) } : {}),
        ...(query.offset ? { offset: Number.parseInt(query.offset, 10) } : {}),
        ...(query.page ? { page: Number.parseInt(query.page, 10) } : {}),
      };
      const response = await taskListService.findLists(filter);
      reply.status(200).send({ success: true, data: response });
    } catch {
      reply.status(500).send({ success: false, error: 'Failed to fetch task lists' });
    }
  });

// Get task list by ID
  server.get('/api/task-lists/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: number };
      const list = await taskListService.getList(Number(id), TASK_LIST_UI_HOST_SCOPE);
      if (!list) {
        reply.code(404).send({ success: false, error: 'Task list not found' });
      }
      reply.status(200).send({ success: true, data: list });
    } catch {
      reply.status(500).send({ success: false, error: 'Failed to fetch task list' });
    }
  });

  // Create new task list
  server.post('/api/task-lists', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { name, description } = request.body as { name: string; description?: string };
      const list = await taskListService.createList({ name, description });
      reply.status(200).send({ success: true, data: list });
    } catch {
      reply.status(500).send({ success: false, error: 'Failed to create task list' });
    }
  });

  // Update task list
  server.put('/api/task-lists/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: number };
      const { name, description } = request.body as { name?: string; description?: string };
      const list = await taskListService.updateList(
        Number(id),
        { name, description },
        TASK_LIST_UI_HOST_SCOPE,
      );
      if (!list) {
        reply.code(404).send({ success: false, error: 'Task list not found' });
      }
      reply.status(200).send({ success: true, data: list });
    } catch {
      reply.status(500).send({ success: false, error: 'Failed to update task list' });
    }
  });

  // Delete task list
  server.delete('/api/task-lists/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      const deleted = await taskListService.deleteList(id, TASK_LIST_UI_HOST_SCOPE);
      if (!deleted) {
        reply.code(404).send({ success: false, error: 'Task list not found' });
      }
      reply.status(200).send({ success: true, message: 'Task list deleted successfully' });
    } catch {
      reply.status(500).send({ success: false, error: 'Failed to delete task list' });
    }
  });
};

export default { registerTaskRoutes, registerTaskListRoutes };