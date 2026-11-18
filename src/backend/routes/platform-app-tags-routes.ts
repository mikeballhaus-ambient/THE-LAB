import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { Server as SocketIOServer } from 'socket.io';
import { z } from 'zod';
import {
  requirePlatformHttpUser,
  requirePlatformOwnerOrAdmin,
} from '../middleware/platform-http-auth';
import { assertUserCanSetAppCatalogTags } from '../utils/catalog-tag-permissions';
import { appTagsService } from '../db/AppTags/app-tags-service';
import appsService from '../db/Apps/apps-service';
import { ProviderService } from '../ai/provider-service';
import { SOCKET_EVENTS, type AppsOrderUpdatedEventData } from '@/shared/types/socket-events';
import type { ProviderData, RuntimeApp } from '@/shared/types';
import type { PlatformAppTag } from '@/shared/types/platform-app-tags';

declare module 'fastify' {
  interface FastifyInstance {
    io?: SocketIOServer;
  }
}

const CreateTagSchema = z.object({
  id: z
    .string()
    .min(2)
    .max(64)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'id must be lowercase slug'),
  label: z.string().min(1).max(120),
  description: z.string().max(500).optional(),
  sortOrder: z.number().int().positive().optional(),
});

const UpdateTagSchema = z.object({
  label: z.string().min(1).max(120).optional(),
  description: z.string().max(500).optional(),
  sortOrder: z.number().int().positive().optional(),
});

const SetAppTagsSchema = z.object({
  appId: z.string().min(1),
  tagIds: z.array(z.string().min(1)).min(1),
});

function mapTagRow(row: {
  id: string;
  label: string;
  description: string;
  sort_order: number;
}): PlatformAppTag {
  return {
    id: row.id,
    label: row.label,
    description: row.description,
    sortOrder: row.sort_order,
  };
}

function syncProviderAppsAndBroadcast(server: FastifyInstance): RuntimeApp[] {
  const updatedApps = appsService.getAllAppsWithCatalogTags() as RuntimeApp[];
  const providerSvc = ProviderService.getInstance();
  const providerData: ProviderData = providerSvc.getProviderData();
  providerData.apps = updatedApps;
  providerSvc.setProviderData(providerData);

  const payload: AppsOrderUpdatedEventData = {
    apps: updatedApps,
    updatedAt: new Date().toISOString(),
  };
  server.io?.emit(SOCKET_EVENTS.APPS_ORDER_UPDATED, payload);
  return updatedApps;
}

export function registerPlatformAppTagsRoutes(server: FastifyInstance): void {
  server.get(
    '/api/platform/app-tags',
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (!(await requirePlatformHttpUser(request, reply))) return;
      const tags = appTagsService.listTags().map(mapTagRow);
      const catalogTagAssignments = appTagsService.getCatalogTagAssignments();
      return reply.send({ success: true, data: { tags, catalogTagAssignments } });
    },
  );

  server.post(
    '/api/platform/app-tags',
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (!(await requirePlatformOwnerOrAdmin(request, reply))) return;
      const parsed = CreateTagSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ success: false, error: parsed.error.message });
      }
      try {
        appTagsService.createTag(parsed.data);
      } catch (err) {
        return reply.status(400).send({
          success: false,
          error: err instanceof Error ? err.message : 'Create failed',
        });
      }
      syncProviderAppsAndBroadcast(server);
      const tags = appTagsService.listTags().map(mapTagRow);
      return reply.send({ success: true, data: { tags } });
    },
  );

  server.put(
    '/api/platform/app-tags/:tagId',
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (!(await requirePlatformOwnerOrAdmin(request, reply))) return;
      const tagId = (request.params as { tagId: string }).tagId;
      const parsed = UpdateTagSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ success: false, error: parsed.error.message });
      }
      try {
        appTagsService.updateTag(tagId, {
          label: parsed.data.label,
          description: parsed.data.description,
          sortOrder: parsed.data.sortOrder,
        });
      } catch (err) {
        return reply.status(404).send({
          success: false,
          error: err instanceof Error ? err.message : 'Update failed',
        });
      }
      const tags = appTagsService.listTags().map(mapTagRow);
      return reply.send({ success: true, data: { tags } });
    },
  );

  server.delete(
    '/api/platform/app-tags/:tagId',
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (!(await requirePlatformOwnerOrAdmin(request, reply))) return;
      const tagId = (request.params as { tagId: string }).tagId;
      const result = appTagsService.deleteTag(tagId);
      if (!result.success) {
        return reply.status(409).send({
          success: false,
          error: 'TAG_IN_USE',
          message: `Cannot delete tag "${tagId}" — ${result.apps.length} app(s) still use it.`,
          apps: result.apps.map((a) => ({ appId: a.appId, appName: a.appName })),
        });
      }
      return reply.send({ success: true });
    },
  );

  server.get(
    '/api/platform/app-tags/:tagId/usage',
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (!(await requirePlatformOwnerOrAdmin(request, reply))) return;
      const tagId = (request.params as { tagId: string }).tagId;
      if (!appTagsService.listTags().some((t) => t.id === tagId)) {
        return reply.status(404).send({ success: false, error: 'Tag not found' });
      }
      const usage = appTagsService.listAppsUsingTag(tagId);
      return reply.send({ success: true, data: { apps: usage } });
    },
  );

  server.put(
    '/api/platform/apps/catalog-tags',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const caller = await requirePlatformHttpUser(request, reply);
      if (!caller) {
        return;
      }
      const parsed = SetAppTagsSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ success: false, error: parsed.error.message });
      }
      if (!assertUserCanSetAppCatalogTags(caller, parsed.data.appId)) {
        return reply.status(403).send({ success: false, error: 'Forbidden' });
      }
      const app = appsService.getAppById(parsed.data.appId);
      if (!app) {
        return reply.status(404).send({ success: false, error: 'App not found' });
      }
      try {
        appTagsService.setAppTags(parsed.data.appId, parsed.data.tagIds);
      } catch (err) {
        return reply.status(400).send({
          success: false,
          error: err instanceof Error ? err.message : 'Invalid tags',
        });
      }
      const apps = syncProviderAppsAndBroadcast(server);
      return reply.send({ success: true, data: { apps } });
    },
  );
}
