import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { parseBearerToken, verifyLabUserJwt } from '@/shared/auth/lab-jwt';
import { resolveLabAppServiceToken } from '@/shared/server/lab-app-service-token';

export interface LabAppAuthenticatedUser {
  labUserId: number;
  labUserEmail: string;
}

export type LabAppHttpAuthRequest = FastifyRequest & {
  labAppUser?: LabAppAuthenticatedUser;
};

/** Paths that skip user JWT (public form submit, health). */
export const DEFAULT_LAB_APP_PUBLIC_PATH_PREFIXES = [
  '/health',
  '/api/v1/forms/submit/',
  '/api/v2/forms/submit/',
] as const;

function requestPath(request: FastifyRequest): string {
  return request.url.split('?')[0] ?? request.url;
}

export function isLabAppPublicPath(
  path: string,
  publicPrefixes: readonly string[] = DEFAULT_LAB_APP_PUBLIC_PATH_PREFIXES,
): boolean {
  if (path === '/health') {
    return true;
  }
  return publicPrefixes.some((prefix) => path.startsWith(prefix));
}

export function getLabAppUserFromRequest(request: FastifyRequest): LabAppAuthenticatedUser | null {
  return (request as LabAppHttpAuthRequest).labAppUser ?? null;
}

export function resolveLabAppActorUserId(request: FastifyRequest): number {
  const user = getLabAppUserFromRequest(request);
  if (!user) {
    throw new Error('Authenticated lab user required');
  }
  return user.labUserId;
}

/** Platform backend → app server (seed-data admin, user lookup proxy). */
export function resolveLabAppUserFromServiceToken(request: FastifyRequest): LabAppAuthenticatedUser | null {
  const expected = resolveLabAppServiceToken();
  const rawToken = request.headers['x-lab-app-service-token'];
  const token = Array.isArray(rawToken) ? rawToken[0] : rawToken;
  if (!token || token !== expected) {
    return null;
  }
  const rawId = request.headers['x-lab-user-id'];
  const idStr = Array.isArray(rawId) ? rawId[0] : rawId;
  if (idStr == null || String(idStr).trim() === '') {
    return null;
  }
  const id = Number.parseInt(String(idStr), 10);
  if (Number.isNaN(id) || id < 1) {
    return null;
  }
  return { labUserId: id, labUserEmail: '' };
}

export function registerLabAppHttpAuth(
  server: FastifyInstance,
  options?: { publicPathPrefixes?: readonly string[] },
): void {
  const publicPrefixes = options?.publicPathPrefixes ?? DEFAULT_LAB_APP_PUBLIC_PATH_PREFIXES;

  server.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    if (request.method === 'OPTIONS') {
      return;
    }
    const path = requestPath(request);
    if (isLabAppPublicPath(path, publicPrefixes)) {
      return;
    }

    const fromService = resolveLabAppUserFromServiceToken(request);
    if (fromService) {
      (request as LabAppHttpAuthRequest).labAppUser = fromService;
      return;
    }

    const authHeader = Array.isArray(request.headers.authorization)
      ? request.headers.authorization[0]
      : request.headers.authorization;
    const bearer = parseBearerToken(authHeader);
    const payload = bearer ? verifyLabUserJwt(bearer) : null;
    if (!payload) {
      await reply.status(401).send({
        success: false,
        error: 'Authentication required — Authorization Bearer user JWT from THE-LAB login',
      });
      return;
    }

    (request as LabAppHttpAuthRequest).labAppUser = {
      labUserId: payload.sub,
      labUserEmail: payload.email,
    };
  });
}
