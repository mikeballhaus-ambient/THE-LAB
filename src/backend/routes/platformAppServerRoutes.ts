import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { AppManager } from '../AppManager';
import { requirePlatformHttpUser } from '../middleware/platform-http-auth';
import { PlatformAppServerService } from '../services/platform-app-server-service';

function parseIdsFilter(request: FastifyRequest): string[] | undefined {
  const query = request.query as { ids?: string };
  const raw = query.ids?.trim();
  if (!raw) {
    return undefined;
  }
  const ids = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return ids.length > 0 ? ids : undefined;
}

export function registerPlatformAppServerRoutes(server: FastifyInstance, appManager: AppManager): void {
  server.get(
    '/api/platform/apps/server-urls',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const caller = await requirePlatformHttpUser(request, reply);
      if (!caller) {
        return;
      }
      const filterIds = parseIdsFilter(request);
      const data = PlatformAppServerService.getInstance().listServerUrls(appManager, filterIds);
      return reply.send({ success: true, data });
    },
  );
}
