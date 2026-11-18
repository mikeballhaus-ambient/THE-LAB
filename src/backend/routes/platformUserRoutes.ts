import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { PlatformUserService } from '../db/Auth/platform-user-service';
import { requirePlatformHttpUser } from '../middleware/platform-http-auth';
import type { UserRole, UserStatus } from '@/shared/types/user';
import { parsePlatformUserShowSystemUserFlag } from '@/shared/types/platform-users';

const platformUserService = PlatformUserService.getInstance();

function parseAppId(request: FastifyRequest): string | undefined {
  const header = request.headers['x-host-app-id'];
  const fromHeader = Array.isArray(header) ? header[0] : header;
  const query = (request.query as { appId?: string })?.appId;
  const value = (fromHeader ?? query)?.trim();
  return value || undefined;
}

export function registerPlatformUserRoutes(server: FastifyInstance): void {
  server.get(
    '/api/platform/users/lookup',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const caller = await requirePlatformHttpUser(request, reply);
      if (!caller) {
        return;
      }
      const q = request.query as { q?: string; appId?: string; limit?: string; showSystemUser?: string };
      const items = platformUserService.lookupUsers(q.q ?? '', {
        appId: parseAppId(request) ?? q.appId,
        limit: q.limit != null ? Number.parseInt(q.limit, 10) : undefined,
        showSystemUser: parsePlatformUserShowSystemUserFlag(q.showSystemUser),
      });
      return reply.send({ success: true, data: items });
    },
  );

  server.get(
    '/api/platform/users',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const caller = await requirePlatformHttpUser(request, reply);
      if (!caller) {
        return;
      }
      const query = request.query as {
        status?: UserStatus;
        role?: UserRole;
        appId?: string;
        limit?: string;
        offset?: string;
        showSystemUser?: string;
      };
      const result = platformUserService.listUsers({
        status: query.status ?? 'active',
        role: query.role,
        appId: parseAppId(request) ?? query.appId,
        limit: query.limit != null ? Number.parseInt(query.limit, 10) : undefined,
        offset: query.offset != null ? Number.parseInt(query.offset, 10) : undefined,
        showSystemUser: parsePlatformUserShowSystemUserFlag(query.showSystemUser),
      });
      return reply.send({ success: true, data: result });
    },
  );

  server.get(
    '/api/platform/users/:id',
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply,
    ) => {
      const caller = await requirePlatformHttpUser(request, reply);
      if (!caller) {
        return;
      }
      const id = Number.parseInt(request.params.id, 10);
      if (Number.isNaN(id)) {
        return reply.status(400).send({ success: false, error: 'Invalid user id' });
      }
      const byIdQuery = request.query as { showSystemUser?: string };
      const user = platformUserService.getUserById(id, {
        showSystemUser: parsePlatformUserShowSystemUserFlag(byIdQuery.showSystemUser),
      });
      if (!user) {
        return reply.status(404).send({ success: false, error: 'User not found' });
      }
      return reply.send({ success: true, data: user });
    },
  );

  server.get(
    '/api/platform/training-certifications/badges',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const caller = await requirePlatformHttpUser(request, reply);
      if (!caller) {
        return;
      }
      const q = request.query as { userIds?: string };
      const raw = q.userIds?.trim() ?? '';
      const userIds = raw
        .split(',')
        .map((part) => Number.parseInt(part.trim(), 10))
        .filter((id) => Number.isFinite(id) && id > 0);
      const { fetchTrainingCertBadgesByUserIds } = await import(
        '../platform/training-quizzes-cert-badges.js'
      );
      const badges = await fetchTrainingCertBadgesByUserIds(userIds);
      return reply.send({ success: true, data: badges });
    },
  );
}
