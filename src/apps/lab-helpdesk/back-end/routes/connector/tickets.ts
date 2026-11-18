import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { TicketService } from '../../services/ticket-service';
import type { Ticket, TicketPriority, TicketStatus } from '../../../shared/types/ticket.types';
import { validateTaskAssigneeId } from '@/shared/server/lab-user-reference-validation';
import { resolveLabAppActorUserId } from '@/shared/server/lab-app-http-auth';

async function resolveLabUserIdField(
  raw: unknown,
  actorUserId: number,
): Promise<number | null | undefined> {
  if (raw === undefined) {
    return undefined;
  }
  if (raw === null || raw === '') {
    return null;
  }
  const validated = await validateTaskAssigneeId(String(raw), actorUserId);
  if (!validated) {
    return null;
  }
  const n = Number.parseInt(validated, 10);
  return Number.isNaN(n) ? null : n;
}

function toConnector(ticket: Ticket) {
  return {
    id: ticket.id,
    subject: ticket.subject,
    description: ticket.description,
    status: ticket.status,
    priority: ticket.priority,
    assigneeId: ticket.assigneeId ?? undefined,
    requesterLabUserId: ticket.requesterLabUserId ?? undefined,
    requesterEmail: ticket.requesterEmail ?? undefined,
    metadata: ticket.metadata ?? undefined,
    createdAt: ticket.createdAt,
    updatedAt: ticket.updatedAt,
  };
}

const connectorTicketsRoutes = async (fastifyInstance: FastifyInstance) => {
  const tickets = TicketService.getInstance();

  fastifyInstance.get('/', async () => {
    const list = await tickets.list();
    return list.map(toConnector);
  });

  fastifyInstance.get('/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply) => {
    const id = Number.parseInt(request.params.id, 10);
    if (Number.isNaN(id)) {
      return reply.status(400).send({ error: 'Invalid id' });
    }
    const ticket = await tickets.getById(id);
    if (!ticket) {
      return reply.status(404).send({ error: 'Not found' });
    }
    return toConnector(ticket);
  });

  fastifyInstance.post('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = (request.body ?? {}) as Record<string, unknown>;
    const subject = String(body.subject ?? '').trim();
    if (!subject) {
      return reply.status(400).send({ error: 'subject is required' });
    }
    const actorUserId = resolveLabAppActorUserId(request);
    let assigneeId: string | undefined;
    try {
      assigneeId = await validateTaskAssigneeId(
        body.assigneeId != null ? String(body.assigneeId) : undefined,
        actorUserId,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Invalid assigneeId';
      return reply.status(400).send({ error: message });
    }
    let requesterLabUserId: number | null | undefined;
    try {
      requesterLabUserId = await resolveLabUserIdField(body.requesterLabUserId, actorUserId);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Invalid requesterLabUserId';
      return reply.status(400).send({ error: message });
    }
    const requesterForCreate = Object.prototype.hasOwnProperty.call(body, 'requesterLabUserId')
      ? (requesterLabUserId ?? null)
      : (requesterLabUserId ?? actorUserId);

    const created = await tickets.create({
      subject,
      description: body.description != null ? String(body.description) : '',
      status: body.status as TicketStatus | undefined,
      priority: body.priority as TicketPriority | undefined,
      assigneeId: assigneeId ?? null,
      requesterLabUserId: requesterForCreate,
      requesterEmail: body.requesterEmail != null ? String(body.requesterEmail) : null,
      metadata: body.metadata != null ? String(body.metadata) : null,
    });
    if (!created) {
      return reply.status(500).send({ error: 'Failed to create ticket' });
    }
    return reply.status(201).send(toConnector(created));
  });

  fastifyInstance.post('/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply) => {
    const id = Number.parseInt(request.params.id, 10);
    if (Number.isNaN(id)) {
      return reply.status(400).send({ error: 'Invalid id' });
    }
    const body = (request.body ?? {}) as Record<string, unknown>;
    const actorUserId = resolveLabAppActorUserId(request);
    let assigneeId: string | undefined | null = undefined;
    if (body.assigneeId !== undefined) {
      try {
        assigneeId = (await validateTaskAssigneeId(String(body.assigneeId), actorUserId)) ?? null;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Invalid assigneeId';
        return reply.status(400).send({ error: message });
      }
    }
    let requesterLabUserId: number | null | undefined;
    try {
      requesterLabUserId = await resolveLabUserIdField(body.requesterLabUserId, actorUserId);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Invalid requesterLabUserId';
      return reply.status(400).send({ error: message });
    }
    const updated = await tickets.update(id, {
      subject: body.subject != null ? String(body.subject) : undefined,
      description: body.description != null ? String(body.description) : undefined,
      status: body.status as 'new' | 'open' | 'pending' | 'resolved' | 'closed' | undefined,
      priority: body.priority as 'low' | 'medium' | 'high' | 'urgent' | undefined,
      assigneeId,
      requesterLabUserId,
      requesterEmail: body.requesterEmail != null ? String(body.requesterEmail) : undefined,
      metadata: body.metadata != null ? String(body.metadata) : undefined,
    });
    if (!updated) {
      return reply.status(404).send({ error: 'Not found' });
    }
    return toConnector(updated);
  });

  fastifyInstance.delete('/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply) => {
    const id = Number.parseInt(request.params.id, 10);
    if (Number.isNaN(id)) {
      return reply.status(400).send({ error: 'Invalid id' });
    }
    const ok = await tickets.delete(id);
    if (!ok) {
      return reply.status(404).send({ error: 'Not found' });
    }
    return reply.status(204).send();
  });
};

export default connectorTicketsRoutes;
