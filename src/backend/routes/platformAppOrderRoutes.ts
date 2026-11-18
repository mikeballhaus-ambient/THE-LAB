import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import appsService from '../db/Apps/apps-service';
import { appTagsService } from '../db/AppTags/app-tags-service';
import { syncAppsCatalogToClients } from '../services/sync-apps-catalog-to-clients';
import {
  requirePlatformHttpUser,
  requirePlatformOwnerOrAdmin,
} from '../middleware/platform-http-auth';

interface ReorderAppsBody {
  appIds?: string[];
  enabledByAppId?: Record<string, boolean>;
}

export function registerPlatformAppOrderRoutes(server: FastifyInstance): void {
  server.get(
    '/api/platform/apps/catalog-admin',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const caller = await requirePlatformOwnerOrAdmin(request, reply);
      if (!caller) {
        return;
      }
      const assignments = appTagsService.getCatalogTagAssignments();
      const apps = appsService.getAllApps().map((app) => ({
        ...app,
        catalogTagIds: assignments[app.id] ?? [],
      }));
      return reply.send({ success: true, data: { apps } });
    },
  );
  server.get(
    '/api/platform/apps/order',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const caller = await requirePlatformHttpUser(request, reply);
      if (!caller) {
        return;
      }
      const apps = appsService.getAllApps();
      return reply.send({
        success: true,
        data: { appIds: apps.map((app) => app.id) },
      });
    },
  );

  server.put(
    '/api/platform/apps/order',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const caller = await requirePlatformOwnerOrAdmin(request, reply);
      if (!caller) {
        return;
      }

      const body = request.body as ReorderAppsBody;
      const appIds = body?.appIds;
      if (!Array.isArray(appIds)) {
        return reply.status(400).send({ success: false, error: 'appIds must be an array' });
      }

      const enabledByAppId = body?.enabledByAppId;
      if (enabledByAppId !== undefined) {
        if (typeof enabledByAppId !== 'object' || enabledByAppId === null || Array.isArray(enabledByAppId)) {
          return reply.status(400).send({ success: false, error: 'enabledByAppId must be an object' });
        }
        for (const value of Object.values(enabledByAppId)) {
          if (typeof value !== 'boolean') {
            return reply.status(400).send({ success: false, error: 'enabledByAppId values must be booleans' });
          }
        }
        const enabledResult = appsService.updateAppsEnabled(enabledByAppId);
        if (!enabledResult.success) {
          return reply.status(400).send({ success: false, error: enabledResult.error });
        }
      }

      const result = appsService.reorderApps(appIds);
      if (!result.success) {
        return reply.status(400).send({ success: false, error: result.error });
      }

      syncAppsCatalogToClients();

      const assignments = appTagsService.getCatalogTagAssignments();
      const adminApps = appsService.getAllApps().map((app) => ({
        ...app,
        catalogTagIds: assignments[app.id] ?? [],
      }));

      return reply.send({ success: true, data: { apps: adminApps } });
    },
  );
}
