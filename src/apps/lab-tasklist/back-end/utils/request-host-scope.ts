import type { FastifyRequest } from 'fastify';
import { normalizeTaskListAppId, type TaskListHostAppId } from '../../shared/constants/app-scope';

const HEADER = 'x-host-app-id';

/** Host scope for connector / scoped APIs. Omit header = Task List native (app_id null). */
export function hostAppIdFromRequest(request: FastifyRequest): TaskListHostAppId {
  const raw = request.headers[HEADER];
  if (Array.isArray(raw)) {
    return normalizeTaskListAppId(raw[0]);
  }
  return normalizeTaskListAppId(raw);
}
