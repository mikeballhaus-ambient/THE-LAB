import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { AppSeedOperationResult, AppSeedPackStatus } from '@/shared/types/app/app-seed-data';
import { getAppSeedManifest, packAllowsRemove } from '@/shared/config/app-seed-data-registry';
import { requireLabAppSeedAdmin } from '@/shared/server/lab-app-seed-admin-auth';

export interface AppSeedDataHandlers {
  appId: string;
  getStatus(): Promise<AppSeedPackStatus[]>;
  applyPack(packId: string): Promise<AppSeedOperationResult>;
  removePack(packId: string): Promise<AppSeedOperationResult>;
}

export function registerAppSeedDataRoutes(server: FastifyInstance, handlers: AppSeedDataHandlers): void {
  const manifest = getAppSeedManifest(handlers.appId);
  if (!manifest) {
    throw new Error(`No seed manifest registered for app ${handlers.appId}`);
  }

  server.get('/api/admin/seed-data', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await requireLabAppSeedAdmin(request, reply))) {
      return;
    }
    const status = await handlers.getStatus();
    return reply.send({
      success: true,
      data: {
        appId: handlers.appId,
        appName: manifest.appName,
        packs: manifest.packs,
        status,
      },
    });
  });

  server.post(
    '/api/admin/seed-data/:packId/apply',
    async (request: FastifyRequest<{ Params: { packId: string }; Body: { confirm?: boolean } }>, reply: FastifyReply) => {
      if (!(await requireLabAppSeedAdmin(request, reply))) {
        return;
      }
      const { packId } = request.params;
      if (!manifest.packs.some((p) => p.packId === packId)) {
        return reply.status(404).send({ success: false, error: `Unknown pack: ${packId}` });
      }
      if (request.body?.confirm !== true) {
        return reply.status(400).send({ success: false, error: 'Body must include { confirm: true }' });
      }
      const result = await handlers.applyPack(packId);
      return reply.status(result.success ? 200 : 400).send(result);
    },
  );

  server.post(
    '/api/admin/seed-data/:packId/remove',
    async (request: FastifyRequest<{ Params: { packId: string }; Body: { confirm?: boolean } }>, reply: FastifyReply) => {
      if (!(await requireLabAppSeedAdmin(request, reply))) {
        return;
      }
      const { packId } = request.params;
      if (!manifest.packs.some((p) => p.packId === packId)) {
        return reply.status(404).send({ success: false, error: `Unknown pack: ${packId}` });
      }
      if (!packAllowsRemove(handlers.appId, packId)) {
        return reply.status(403).send({
          success: false,
          content: 'This pack is required platform infrastructure and cannot be removed. Use Apply to repair missing rows.',
        });
      }
      if (request.body?.confirm !== true) {
        return reply.status(400).send({ success: false, error: 'Body must include { confirm: true }' });
      }
      const result = await handlers.removePack(packId);
      return reply.status(result.success ? 200 : 400).send(result);
    },
  );
}
