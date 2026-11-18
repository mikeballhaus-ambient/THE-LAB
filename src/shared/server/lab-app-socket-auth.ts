import type { Socket } from 'socket.io';
import { parseBearerToken, verifyLabUserJwt } from '@/shared/auth/lab-jwt';

export type LabAppSocket = Socket & { labUserId?: number };

export function resolveLabAppUserIdFromSocket(socket: Socket): number | null {
  const auth = socket.handshake.auth as { accessToken?: string };
  const headerAuth = socket.handshake.headers.authorization;
  const bearer =
    auth?.accessToken?.trim() ||
    parseBearerToken(Array.isArray(headerAuth) ? headerAuth[0] : headerAuth);
  if (!bearer) {
    return null;
  }
  const payload = verifyLabUserJwt(bearer);
  if (!payload?.sub || payload.sub < 1) {
    return null;
  }
  return payload.sub;
}
