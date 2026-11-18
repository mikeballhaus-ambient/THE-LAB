import type { FastifyInstance, FastifyRequest } from 'fastify';
import { resolveLabAppActorUserId } from '@/shared/server/lab-app-http-auth';
import {
  fetchPlatformUsersLookup,
} from '@/shared/services/platform-user-client.node';
import { HELP_DESK_APP_REGISTRY_ID } from '../../../shared/constants/app-scope';
import { hostAppIdFromRequest } from '../../utils/request-host-scope';
import type { TicketPriority, TicketStatus } from '../../../shared/types/ticket.types';

export const TICKET_STATUS_LOOKUP = [
  { id: 'new', value: 'new', label: 'New' },
  { id: 'open', value: 'open', label: 'Open' },
  { id: 'pending', value: 'pending', label: 'Pending' },
  { id: 'resolved', value: 'resolved', label: 'Resolved' },
  { id: 'closed', value: 'closed', label: 'Closed' },
] as const satisfies ReadonlyArray<{ id: TicketStatus; value: TicketStatus; label: string }>;

export const TICKET_PRIORITY_LOOKUP = [
  { id: 'low', value: 'low', label: 'Low' },
  { id: 'medium', value: 'medium', label: 'Medium' },
  { id: 'high', value: 'high', label: 'High' },
  { id: 'urgent', value: 'urgent', label: 'Urgent' },
] as const satisfies ReadonlyArray<{ id: TicketPriority; value: TicketPriority; label: string }>;

/** Static paths registered before `/:id` on `/api/connector/tickets`. */
const ticketLookupsRoutes = async (fastifyInstance: FastifyInstance) => {
  fastifyInstance.get('/statuses', async () => [...TICKET_STATUS_LOOKUP]);

  fastifyInstance.get('/priorities', async () => [...TICKET_PRIORITY_LOOKUP]);

  fastifyInstance.get('/assignees', async (request: FastifyRequest) => {
    const actorUserId = resolveLabAppActorUserId(request);
    const q = (request.query as { q?: string })?.q;
    const hostScope = hostAppIdFromRequest(request);
    const appId = hostScope ?? HELP_DESK_APP_REGISTRY_ID;
    const options = await fetchPlatformUsersLookup({
      actorUserId,
      q,
      appId,
      limit: 100,
    });
    return options.map(row => ({
      id: row.value,
      value: String(row.value),
      label: row.label,
      email: row.email,
    }));
  });
};

export default ticketLookupsRoutes;
