import type { FastifyReply, FastifyRequest } from 'fastify';
import { resolvePlatformBackendUrl } from '@/shared/config/resolve-platform-backend-url.node';
import { buildPlatformServiceAuthHeaders } from '@/shared/services/platform-user-client.node';
import { resolveLabAppActorUserId } from '@/shared/server/lab-app-http-auth';
import type { User } from '@/shared/types/user';

async function fetchPlatformUser(userId: number): Promise<User | null> {
  const base = resolvePlatformBackendUrl();
  const response = await fetch(`${base}/api/platform/users/${userId}`, {
    headers: buildPlatformServiceAuthHeaders(userId),
  });
  if (!response.ok) {
    return null;
  }
  const body = (await response.json()) as { success?: boolean; data?: User };
  return body.success && body.data ? body.data : null;
}

function isOwnerOrAdmin(user: User): boolean {
  return user.role === 'owner' || user.role === 'admin';
}

/**
 * App-server gate for seed-data admin routes.
 * Requires lab user JWT or platform service token (set on request by lab-app-http-auth hook).
 */
export async function requireLabAppSeedAdmin(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<boolean> {
  let actorId: number;
  try {
    actorId = resolveLabAppActorUserId(request);
  } catch {
    await reply.status(401).send({
      success: false,
      error: 'Authentication required — Authorization Bearer user JWT from THE-LAB login',
    });
    return false;
  }

  const user = await fetchPlatformUser(actorId);
  if (!user || !isOwnerOrAdmin(user)) {
    await reply.status(403).send({
      success: false,
      error: 'Only platform owners or admins can manage app seed data.',
    });
    return false;
  }
  return true;
}
