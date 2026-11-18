import type { FastifyReply } from 'fastify';
import { LAB_SESSION_COOKIE, LabSessionService } from './lab-session-service';
import { resolveLabFrontendUrl } from '@/shared/config/resolve-lab-frontend-url.node';

export function attachLabSessionToReply(
  reply: FastifyReply,
  userId: number,
): { sessionId: string; accessToken: string; expiresAt: Date } {
  const session = LabSessionService.getInstance().createSession(userId);
  reply.setCookie(LAB_SESSION_COOKIE, session.sessionId, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: process.env.LAB_PRODUCTION_PROFILE === '1',
    expires: session.expiresAt,
  });
  return session;
}

export function buildFrontendSsoCompleteUrl(params: {
  userId: number;
  labSessionId: string;
  accessToken: string;
}): string {
  const url = new URL(resolveLabFrontendUrl());
  url.searchParams.set('sso', '1');
  url.searchParams.set('userId', String(params.userId));
  url.searchParams.set('labSessionId', params.labSessionId);
  url.searchParams.set('accessToken', params.accessToken);
  return url.toString();
}
