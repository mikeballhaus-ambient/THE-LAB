import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { CRM_APP_REGISTRY_ID } from '../../shared/constants/app-scope';
import { TicketService } from '../services/ticket-service';

function parseAppId(request: FastifyRequest): string | null {
  const q = (request.query as { appId?: string })?.appId;
  const header = request.headers['x-host-app-id'];
  const fromHeader = Array.isArray(header) ? header[0] : header;
  const id = (fromHeader ?? q)?.trim();
  return id || null;
}

export function registerAppScopedRoutes(server: FastifyInstance): void {
  server.get('/api/app-scoped/tickets', async (request: FastifyRequest, reply: FastifyReply) => {
    const appId = parseAppId(request);
    if (appId !== CRM_APP_REGISTRY_ID) {
      return reply.status(400).send({
        success: false,
        error: `appId must be ${CRM_APP_REGISTRY_ID} for CRM-scoped tickets`,
      });
    }
    const query = request.query as { entityKey?: string; recordId?: string };
    const recordId =
      query.recordId != null && !Number.isNaN(Number(query.recordId))
        ? Number(query.recordId)
        : undefined;
    const tickets = await TicketService.getInstance().list({
      entityKey: query.entityKey,
      recordId,
    });
    return reply.send({ success: true, data: tickets });
  });
}
