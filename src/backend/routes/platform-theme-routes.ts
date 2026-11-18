import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { Server as SocketIOServer } from 'socket.io';

declare module 'fastify' {
  interface FastifyInstance {
    io?: SocketIOServer;
  }
}
import {
  requirePlatformHttpUser,
  requirePlatformOwnerOrAdmin,
} from '../middleware/platform-http-auth';
import { labThemeCustomPresetService } from '../db/Theme/lab-theme-custom-service';
import { labThemeService } from '../db/Theme/lab-theme-service';
import { SOCKET_EVENTS, type ThemeUpdatedEventData } from '@/shared/types/socket-events';
import type { LabThemeTokenMap } from '@/shared/theme/lab-theme-token-keys';

export function registerPlatformThemeRoutes(server: FastifyInstance): void {
  server.get(
    '/api/platform/theme',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const caller = await requirePlatformHttpUser(request, reply);
      if (!caller) {
        return;
      }
      const theme = labThemeService.getPlatformTheme();
      return reply.send({ success: true, data: { theme } });
    },
  );

  server.put(
    '/api/platform/theme',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const caller = await requirePlatformOwnerOrAdmin(request, reply);
      if (!caller) {
        return;
      }
      const result = labThemeService.savePlatformTheme(request.body);
      if (!result.success) {
        return reply.status(400).send({ success: false, error: result.error });
      }

      const payload: ThemeUpdatedEventData = {
        theme: result.theme,
        updatedAt: new Date().toISOString(),
      };
      const io = server.io;
      if (io) {
        io.emit(SOCKET_EVENTS.THEME_UPDATED, payload);
      }

      return reply.send({ success: true, data: payload });
    },
  );

  server.get(
    '/api/platform/theme/custom-presets',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const caller = await requirePlatformHttpUser(request, reply);
      if (!caller) {
        return;
      }
      const presets = labThemeCustomPresetService.listCustomPresets();
      return reply.send({ success: true, data: { presets } });
    },
  );

  server.post(
    '/api/platform/theme/custom-presets',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const caller = await requirePlatformOwnerOrAdmin(request, reply);
      if (!caller) {
        return;
      }
      const body = request.body as {
        name?: string;
        mode?: 'light' | 'dark';
        duplicateFromPresetId?: string;
      };
      const result = labThemeCustomPresetService.createCustomPreset({
        name: body.name ?? 'Custom theme',
        mode: body.mode ?? 'dark',
        duplicateFromPresetId: body.duplicateFromPresetId,
        createdByUserId: caller.id ?? null,
      });
      if (!result.success) {
        return reply.status(400).send({ success: false, error: result.error });
      }
      return reply.send({ success: true, data: { preset: result.preset } });
    },
  );

  server.put(
    '/api/platform/theme/custom-presets/:id',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const caller = await requirePlatformOwnerOrAdmin(request, reply);
      if (!caller) {
        return;
      }
      const body = request.body as {
        name?: string;
        mode?: 'light' | 'dark';
        tokens?: LabThemeTokenMap;
      };
      const result = labThemeCustomPresetService.updateCustomPreset(request.params.id, body);
      if (!result.success) {
        return reply.status(400).send({ success: false, error: result.error });
      }
      return reply.send({ success: true, data: { preset: result.preset } });
    },
  );

  server.delete(
    '/api/platform/theme/custom-presets/:id',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const caller = await requirePlatformOwnerOrAdmin(request, reply);
      if (!caller) {
        return;
      }
      const result = labThemeCustomPresetService.deleteCustomPreset(request.params.id);
      if (!result.success) {
        return reply.status(400).send({ success: false, error: result.error });
      }
      return reply.send({ success: true });
    },
  );
}
