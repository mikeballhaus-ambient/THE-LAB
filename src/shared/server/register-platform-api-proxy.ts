import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { resolvePlatformBackendUrl } from '@/shared/config/resolve-platform-backend-url.node';
import { buildPlatformServiceAuthHeaders } from '@/shared/services/platform-user-client.node';
import { resolveLabAppActorUserId } from '@/shared/server/lab-app-http-auth';

async function forwardPlatformGet(
  request: FastifyRequest,
  reply: FastifyReply,
  path: string,
): Promise<void> {
  let actorUserId: number;
  try {
    actorUserId = resolveLabAppActorUserId(request);
  } catch {
    await reply.status(401).send({
      success: false,
      error: 'Authentication required — Authorization Bearer user JWT from THE-LAB login',
    });
    return;
  }
  const base = resolvePlatformBackendUrl();
  const query = new URL(request.url, 'http://local').search;
  const url = `${base}${path}${query}`;
  const headers: HeadersInit = buildPlatformServiceAuthHeaders(actorUserId);
  const hostApp = request.headers['x-host-app-id'];
  if (hostApp) {
    headers['X-Host-App-Id'] = Array.isArray(hostApp) ? hostApp[0] : hostApp;
  }
  const response = await fetch(url, { headers });
  const body = await response.text();
  reply.status(response.status).type('application/json').send(body);
}

/** Proxies selected main-backend platform APIs onto the app server (same-origin for the app UI). */
export function registerPlatformApiProxyRoutes(server: FastifyInstance): void {
  server.get('/api/platform/users/lookup', async (request, reply) => {
    await forwardPlatformGet(request, reply, '/api/platform/users/lookup');
  });

  server.get('/api/platform/users', async (request, reply) => {
    await forwardPlatformGet(request, reply, '/api/platform/users');
  });

  server.get('/api/platform/users/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    await forwardPlatformGet(request, reply, `/api/platform/users/${id}`);
  });

  server.get('/api/platform/apps/server-urls', async (request, reply) => {
    await forwardPlatformGet(request, reply, '/api/platform/apps/server-urls');
  });

  server.get('/api/platform/virtual-bank', async (request, reply) => {
    await forwardPlatformGet(request, reply, '/api/platform/virtual-bank');
  });

  server.get('/api/platform/virtual-bank/ledger', async (request, reply) => {
    await forwardPlatformGet(request, reply, '/api/platform/virtual-bank/ledger');
  });
}
