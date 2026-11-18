import type { FastifyReply, FastifyRequest } from 'fastify';
import { UserService } from '../db/Auth/auth-service';
import type { User } from '@/shared/types/user';
import { parseBearerToken } from '../auth/lab-jwt';
import { LAB_SESSION_COOKIE, LabSessionService } from '../auth/lab-session-service';
import { resolveLabAppServiceToken } from '@/shared/server/lab-app-service-token';

const LAB_APP_SERVICE_TOKEN_HEADER = 'x-lab-app-service-token';

/** @deprecated Spoofable — rejected unless paired with valid service token (app servers). */
export function parseLabUserIdFromRequest(request: FastifyRequest): number | null {
  const raw = request.headers['x-lab-user-id'];
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (value == null || String(value).trim() === '') {
    return null;
  }
  const id = Number.parseInt(String(value), 10);
  if (Number.isNaN(id) || id < 1) {
    return null;
  }
  return id;
}

export function resolveActivePlatformUser(userId: number): User | null {
  const user = UserService.getInstance().getUserById(userId);
  if (!user || user.status !== 'active') {
    return null;
  }
  return user;
}

function parseSessionCookie(request: FastifyRequest): string | null {
  const cookieHeader = request.headers.cookie;
  if (!cookieHeader) {
    return null;
  }
  for (const part of cookieHeader.split(';')) {
    const [name, ...rest] = part.trim().split('=');
    if (name === LAB_SESSION_COOKIE) {
      return decodeURIComponent(rest.join('='));
    }
  }
  return null;
}

export function resolvePlatformUserFromRequest(request: FastifyRequest): User | null {
  const bearer = parseBearerToken(
    Array.isArray(request.headers.authorization)
      ? request.headers.authorization[0]
      : request.headers.authorization,
  );
  const fromJwt = LabSessionService.getInstance().resolveUserFromAccessToken(bearer);
  if (fromJwt) {
    return fromJwt;
  }
  const sessionId = parseSessionCookie(request);
  return LabSessionService.getInstance().resolveSession(sessionId);
}

/**
 * App server → platform: service token + acting user header (after app validated user JWT).
 */
export function resolvePlatformUserFromServiceToken(request: FastifyRequest): User | null {
  const expected = resolveLabAppServiceToken();
  const raw = request.headers[LAB_APP_SERVICE_TOKEN_HEADER];
  const token = Array.isArray(raw) ? raw[0] : raw;
  if (!token || token !== expected) {
    return null;
  }
  const actingUserId = parseLabUserIdFromRequest(request);
  if (actingUserId == null) {
    return null;
  }
  return resolveActivePlatformUser(actingUserId);
}

export async function requirePlatformHttpUser(
  request: FastifyRequest,
  reply: FastifyReply,
  options?: { allowPasswordChangeRequired?: boolean },
): Promise<User | null> {
  const user =
    resolvePlatformUserFromRequest(request) ??
    resolvePlatformUserFromServiceToken(request);

  if (!user) {
    await reply.status(401).send({
      success: false,
      error:
        'Authentication required — use session cookie, Authorization Bearer JWT, or app service token',
    });
    return null;
  }

  if (
    user.mustChangePassword &&
    !options?.allowPasswordChangeRequired &&
    !isPasswordChangeExemptPath(request.url)
  ) {
    await reply.status(403).send({
      success: false,
      error: 'PASSWORD_CHANGE_REQUIRED',
      mustChangePassword: true,
    });
    return null;
  }

  (request as FastifyRequest & { labUser?: User }).labUser = user;
  return user;
}

function isPasswordChangeExemptPath(url: string): boolean {
  const path = url.split('?')[0] ?? url;
  return path === '/auth/change-password' || path === '/auth/logout';
}

/** App server → platform: service token only (no acting user), e.g. match state fan-out. */
export function requirePlatformAppServiceToken(
  request: FastifyRequest,
  reply: FastifyReply,
): boolean {
  const expected = resolveLabAppServiceToken();
  const raw = request.headers[LAB_APP_SERVICE_TOKEN_HEADER];
  const token = Array.isArray(raw) ? raw[0] : raw;
  if (!token || token !== expected) {
    void reply.status(401).send({
      success: false,
      error: 'Valid X-Lab-App-Service-Token required',
    });
    return false;
  }
  return true;
}

export async function requirePlatformOwnerOrAdmin(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<User | null> {
  const user = await requirePlatformHttpUser(request, reply);
  if (!user) {
    return null;
  }
  if (user.role !== 'owner' && user.role !== 'admin') {
    await reply.status(403).send({
      success: false,
      error: 'Only platform owners or admins can manage OIDC providers.',
    });
    return null;
  }
  return user;
}
