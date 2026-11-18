import type { FastifyInstance, FastifyRequest } from 'fastify';
import { TaskPriority, TaskStatus } from '../../../shared/types/task.types';
import { listAllTaskListIds } from '../../utils/connector/connector-task-queries';
import { resolveLabAppActorUserId } from '@/shared/server/lab-app-http-auth';
import {
  fetchPlatformUsersLookup,
} from '@/shared/services/platform-user-client.node';
import { hostAppIdFromRequest } from '../../utils/request-host-scope';
import { TASK_LIST_APP_REGISTRY_ID } from '../../../shared/constants/app-scope';

export const TASK_STATUS_LOOKUP = [
  { id: TaskStatus.PENDING, value: TaskStatus.PENDING, label: 'Pending' },
  { id: TaskStatus.IN_PROGRESS, value: TaskStatus.IN_PROGRESS, label: 'In progress' },
  { id: TaskStatus.COMPLETED, value: TaskStatus.COMPLETED, label: 'Completed' },
  { id: TaskStatus.CANCELLED, value: TaskStatus.CANCELLED, label: 'Cancelled' },
] as const;

export const TASK_PRIORITY_LOOKUP = [
  { id: TaskPriority.LOW, value: TaskPriority.LOW, label: 'Low' },
  { id: TaskPriority.MEDIUM, value: TaskPriority.MEDIUM, label: 'Medium' },
  { id: TaskPriority.HIGH, value: TaskPriority.HIGH, label: 'High' },
  { id: TaskPriority.URGENT, value: TaskPriority.URGENT, label: 'Urgent' },
] as const;

export const TASK_TAG_LOOKUP = [
  { id: 'bug', value: 'bug', label: 'Bug' },
  { id: 'feature', value: 'feature', label: 'Feature' },
  { id: 'docs', value: 'docs', label: 'Documentation' },
  { id: 'blocked', value: 'blocked', label: 'Blocked' },
  { id: 'review', value: 'review', label: 'Review' },
] as const;

/** Registered with prefix `/api/connector/tasks` — static paths before `/:id`. */
const taskLookupsRoutes = async (fastifyInstance: FastifyInstance) => {
  fastifyInstance.get('/statuses', async () => [...TASK_STATUS_LOOKUP]);
  fastifyInstance.get('/priorities', async () => [...TASK_PRIORITY_LOOKUP]);
  fastifyInstance.get('/tags', async () => [...TASK_TAG_LOOKUP]);
  fastifyInstance.get('/task-lists', async () => {
    const lists = await listAllTaskListIds();
    return lists.map((row) => ({
      id: row.id,
      value: String(row.id),
      label: row.name,
    }));
  });

  fastifyInstance.get('/assignees', async (request: FastifyRequest) => {
    const actorUserId = resolveLabAppActorUserId(request);
    const q = (request.query as { q?: string })?.q;
    const hostScope = hostAppIdFromRequest(request);
    const appId = hostScope ?? TASK_LIST_APP_REGISTRY_ID;
    const options = await fetchPlatformUsersLookup({
      actorUserId,
      q,
      appId,
      limit: 100,
    });
    return options.map((row) => ({
      id: row.value,
      value: String(row.value),
      label: row.label,
      email: row.email,
    }));
  });
};

export default taskLookupsRoutes;
