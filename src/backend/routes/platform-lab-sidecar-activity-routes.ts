import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { Server as SocketIOServer } from 'socket.io';
import {
  requirePlatformHttpUser,
  requirePlatformOwnerOrAdmin,
} from '../middleware/platform-http-auth';
import { labSidecarActivityService } from '../db/LabSidecarActivity/lab-sidecar-activity-service';
import {
  SOCKET_EVENTS,
  type LabSidecarActivityUpdatedEventData,
} from '@/shared/types/socket-events';

declare module 'fastify' {
  interface FastifyInstance {
    io?: SocketIOServer;
  }
}

export function registerPlatformLabSidecarActivityRoutes(server: FastifyInstance): void {
  server.get(
    '/api/platform/lab-sidecar-activity',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const caller = await requirePlatformHttpUser(request, reply);
      if (!caller) {
        return;
      }
      const settings = labSidecarActivityService.getPlatformSettings();
      return reply.send({ success: true, data: { settings } });
    },
  );

  server.put(
    '/api/platform/lab-sidecar-activity',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const caller = await requirePlatformOwnerOrAdmin(request, reply);
      if (!caller) {
        return;
      }
      const result = labSidecarActivityService.savePlatformSettings(request.body);
      if (!result.success) {
        return reply.status(400).send({ success: false, error: result.error });
      }

      const payload: LabSidecarActivityUpdatedEventData = {
        settings: result.settings,
        updatedAt: new Date().toISOString(),
      };
      server.io?.emit(SOCKET_EVENTS.LAB_SIDECAR_ACTIVITY_UPDATED, payload);

      return reply.send({ success: true, data: payload });
    },
  );

  server.post(
    '/api/platform/lab-sidecar-activity/reset',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const caller = await requirePlatformOwnerOrAdmin(request, reply);
      if (!caller) {
        return;
      }
      const settings = labSidecarActivityService.resetToDefaults();
      const payload: LabSidecarActivityUpdatedEventData = {
        settings,
        updatedAt: new Date().toISOString(),
      };
      server.io?.emit(SOCKET_EVENTS.LAB_SIDECAR_ACTIVITY_UPDATED, payload);
      return reply.send({ success: true, data: payload });
    },
  );
}
