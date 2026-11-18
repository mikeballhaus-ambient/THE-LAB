import { afterEach, describe, expect, test } from '@jest/globals';
import type { FastifyReply, FastifyRequest } from 'fastify';
import {
  parseLabUserIdFromRequest,
  requirePlatformHttpUser,
  resolvePlatformUserFromRequest,
  resolvePlatformUserFromServiceToken,
} from '@/backend/middleware/platform-http-auth';

function req(partial: Partial<FastifyRequest>): FastifyRequest {
  return partial as FastifyRequest;
}

describe('platform HTTP auth spine (1.13)', () => {
  const prevToken = process.env.LAB_APP_SERVICE_TOKEN;

  afterEach(() => {
    if (prevToken === undefined) {
      delete process.env.LAB_APP_SERVICE_TOKEN;
    } else {
      process.env.LAB_APP_SERVICE_TOKEN = prevToken;
    }
  });

  test('parseLabUserIdFromRequest rejects invalid values', () => {
    expect(parseLabUserIdFromRequest(req({ headers: {} }))).toBeNull();
    expect(parseLabUserIdFromRequest(req({ headers: { 'x-lab-user-id': '0' } }))).toBeNull();
    expect(parseLabUserIdFromRequest(req({ headers: { 'x-lab-user-id': 'abc' } }))).toBeNull();
    expect(parseLabUserIdFromRequest(req({ headers: { 'x-lab-user-id': '42' } }))).toBe(42);
  });

  test('resolvePlatformUserFromRequest rejects spoofed X-Lab-User-Id alone', () => {
    const user = resolvePlatformUserFromRequest(
      req({ headers: { 'x-lab-user-id': '1' } }),
    );
    expect(user).toBeNull();
  });

  test('resolvePlatformUserFromServiceToken requires matching service token and user id', () => {
    process.env.LAB_APP_SERVICE_TOKEN = 'unit-test-service-token';
    expect(
      resolvePlatformUserFromServiceToken(
        req({ headers: { 'x-lab-app-service-token': 'wrong' } }),
      ),
    ).toBeNull();
    expect(
      resolvePlatformUserFromServiceToken(
        req({
          headers: {
            'x-lab-app-service-token': 'unit-test-service-token',
          },
        }),
      ),
    ).toBeNull();
  });

  test('requirePlatformHttpUser returns 401 when unauthenticated', async () => {
    const replyState: { status?: number; body?: unknown } = {};
    const reply = {
      status(code: number) {
        replyState.status = code;
        return this;
      },
      async send(body: unknown) {
        replyState.body = body;
        return this;
      },
    } as unknown as FastifyReply;
    const user = await requirePlatformHttpUser(req({ headers: {}, url: '/api/platform/users' }), reply);
    expect(user).toBeNull();
    expect(replyState.status).toBe(401);
  });

  test('invalid Bearer JWT does not authenticate platform user', () => {
    const user = resolvePlatformUserFromRequest(
      req({ headers: { authorization: 'Bearer not-a-valid-jwt' } }),
    );
    expect(user).toBeNull();
  });
});
