import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { Server as SocketIOServer } from 'socket.io';
import type { User } from '@/shared/types/user';
import { LabDomainEventPublishSchema } from '@/shared/types/schemas/lab-domain-event-schema';
import {
  requirePlatformHttpUser,
  requirePlatformOwnerOrAdmin,
} from '../middleware/platform-http-auth';
import { labEventsService } from '../db/LabEvents/lab-events-service';
import { emitLabUnreadCount } from '../lab-events/lab-events-notify';
import { publishLabDomainEventPipeline } from '../lab-events/publish-lab-domain-event-pipeline';

declare module 'fastify' {
  interface FastifyInstance {
    io?: SocketIOServer;
  }

  interface Request {
    labUser?: User;
  }

  interface FastifyRequest {
    labUser?: User;
  }
}

function parseQueryLimit(value: unknown, defaultLimit: number, max: number): number {
  if (value == null || value === '') {
    return defaultLimit;
  }
  const parsed = typeof value === 'number' ? value : Number.parseInt(String(value), 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return defaultLimit;
  }
  return Math.min(parsed, max);
}

export function registerPlatformLabEventsRoutes(server: FastifyInstance): void {
  server.post(
    '/api/platform/lab-events/publish',
    {
      preHandler: (request, reply) => requirePlatformHttpUser(request, reply),
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const caller = request.labUser;
      if (!caller) {
        return reply.status(401).send({ success: false, error: 'Authentication required' });
      }

      const parsed = LabDomainEventPublishSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          success: false,
          error: 'VALIDATION_ERROR',
          message: parsed.error.message,
        });
      }
      const envelope = parsed.data;
      const payloadJson = JSON.stringify(envelope.payload);
      if (payloadJson.length > 16 * 1024) {
        return reply.status(400).send({
          success: false,
          error: 'PAYLOAD_TOO_LARGE',
          message: 'Payload exceeds 16 KB limit',
        });
      }

      await publishLabDomainEventPipeline(envelope, caller.userId, server.io);

      return reply.send({ success: true, data: { eventId: envelope.id } });
    },
  );

  server.get(
    '/api/platform/lab-events/notifications',
    {
      preHandler: (request, reply) => requirePlatformHttpUser(request, reply),
      schema: {
        querystring: {
          type: 'object',
          properties: {
            limit: { type: 'number', default: 50 },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const caller = request.labUser;
      if (!caller) {
        return reply.status(401).send({ success: false, error: 'Authentication required' });
      }

      const query = request.query as Record<string, unknown>;
      const limit = parseQueryLimit(query.limit, 50, 200);
      const notifications = await labEventsService.listNotificationsForUser(caller.userId, limit);
      return reply.send({ success: true, data: { notifications } });
    },
  );

  server.post(
    '/api/platform/lab-events/notifications/:id/read',
    {
      preHandler: (request, reply) => requirePlatformHttpUser(request, reply),
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const caller = request.labUser;
      if (!caller) {
        return reply.status(401).send({ success: false, error: 'Authentication required' });
      }

      await labEventsService.markNotificationRead(caller.userId, (request.params as { id: string }).id);

      // Emit updated unread count to user's room
      if (server.io) {
        const unreadCount = await labEventsService.countUnreadNotificationsForUser(caller.userId);
        emitLabUnreadCount(server.io, caller.userId, unreadCount);
      }

      return reply.send({ success: true, data: { notificationId: (request.params as { id: string }).id } });
    },
  );

  /**
   * Dismiss one of the caller's own notifications.
   *
   * Scoped to the caller in the repository query, so the id alone is not a capability. Emits the new
   * unread count to the user's room for the same reason `read` does: the bell badge is driven by the
   * socket, and deleting an unread row changes that count.
   */
  server.delete(
    '/api/platform/lab-events/notifications/:id',
    {
      preHandler: (request, reply) => requirePlatformHttpUser(request, reply),
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const caller = request.labUser;
      if (!caller) {
        return reply.status(401).send({ success: false, error: 'Authentication required' });
      }
      const notificationId = (request.params as { id: string }).id;
      try {
        await labEventsService.deleteNotification(caller.userId, notificationId);
      } catch {
        return reply.status(404).send({ success: false, error: 'Notification not found' });
      }

      if (server.io) {
        const unreadCount = await labEventsService.countUnreadNotificationsForUser(caller.userId);
        emitLabUnreadCount(server.io, caller.userId, unreadCount);
      }

      return reply.send({ success: true, data: { notificationId } });
    },
  );

  /**
   * Dismiss several of the caller's notifications in one request.
   *
   * Bulk because the dialog deletes a selection: N round-trips would leave a half-deleted selection
   * whenever one failed. Ids are scoped to the caller in the query, and missing ones are ignored — a
   * row removed elsewhere between render and click must not fail the rows that still exist.
   */
  server.post(
    '/api/platform/lab-events/notifications/delete',
    {
      preHandler: (request, reply) => requirePlatformHttpUser(request, reply),
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const caller = request.labUser;
      if (!caller) {
        return reply.status(401).send({ success: false, error: 'Authentication required' });
      }
      const body = request.body as { notificationIds?: unknown } | undefined;
      const ids = Array.isArray(body?.notificationIds)
        ? body.notificationIds.filter((id): id is string => typeof id === 'string' && id.length > 0)
        : [];
      if (ids.length === 0) {
        return reply
          .status(400)
          .send({ success: false, error: 'notificationIds must be a non-empty array' });
      }

      const deleted = await labEventsService.deleteNotifications(caller.userId, ids);

      // Deleting unread rows changes the badge, so the socket count must be refreshed for the same
      // reason the single-row delete does it.
      if (server.io) {
        const unreadCount = await labEventsService.countUnreadNotificationsForUser(caller.userId);
        emitLabUnreadCount(server.io, caller.userId, unreadCount);
      }

      return reply.send({ success: true, data: { deleted } });
    },
  );

  server.get(
    '/api/platform/lab-events/catalog',
    {
      preHandler: (request, reply) => requirePlatformHttpUser(request, reply),
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const caller = request.labUser;
      if (!caller) {
        return reply.status(401).send({ success: false, error: 'Authentication required' });
      }
      if (caller.role === 'viewer') {
        return reply.status(403).send({ success: false, error: 'FORBIDDEN' });
      }
      const catalog = labEventsService.getEventCatalog();
      return reply.send({ success: true, data: catalog });
    },
  );

  server.get(
    '/api/platform/lab-events/log',
    {
      preHandler: (request, reply) => requirePlatformOwnerOrAdmin(request, reply),
      schema: {
        querystring: {
          type: 'object',
          properties: {
            limit: { type: 'number', default: 100 },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const caller = request.labUser;
      if (!caller) {
        return reply.status(401).send({ success: false, error: 'Authentication required' });
      }

      const query = request.query as Record<string, unknown>;
      const limit = parseQueryLimit(query.limit, 100, 500);
      const events = await labEventsService.listRecentEventsForAdmin(limit);
      return reply.send({ success: true, data: { events } });
    },
  );
}
