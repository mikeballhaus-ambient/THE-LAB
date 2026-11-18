import { describe, expect, test } from '@jest/globals';
import {
  DEFAULT_LAB_APP_PUBLIC_PATH_PREFIXES,
  isLabAppPublicPath,
  resolveLabAppUserFromServiceToken,
} from '@/shared/server/lab-app-http-auth';
import { signLabUserJwt, verifyLabUserJwt } from '@/shared/auth/lab-jwt';

describe('lab app HTTP auth (1.13)', () => {
  test('public paths include health and form submit only', () => {
    expect(isLabAppPublicPath('/health')).toBe(true);
    expect(isLabAppPublicPath('/api/v1/forms/submit/my-form-key')).toBe(true);
    expect(isLabAppPublicPath('/api/v2/forms/submit/my-form-key')).toBe(true);
    expect(isLabAppPublicPath('/api/v1/forms/load/my-form-key')).toBe(false);
    expect(isLabAppPublicPath('/api/platform/users')).toBe(false);
  });

  test('DEFAULT_LAB_APP_PUBLIC_PATH_PREFIXES stays stable', () => {
    expect(DEFAULT_LAB_APP_PUBLIC_PATH_PREFIXES).toContain('/health');
    expect(DEFAULT_LAB_APP_PUBLIC_PATH_PREFIXES.some((p) => p.includes('forms/submit'))).toBe(
      true,
    );
  });

  test('resolveLabAppUserFromServiceToken accepts platform proxy headers', () => {
    process.env.LAB_APP_SERVICE_TOKEN = 'test-service-token-for-auth';
    const request = {
      headers: {
        'x-lab-app-service-token': 'test-service-token-for-auth',
        'x-lab-user-id': '42',
      },
    } as unknown as import('fastify').FastifyRequest;
    const user = resolveLabAppUserFromServiceToken(request);
    expect(user?.labUserId).toBe(42);
  });

  test('user JWT round-trip for app Bearer middleware', () => {
    const token = signLabUserJwt(7, 'member@lab.test', 120);
    const payload = verifyLabUserJwt(token);
    expect(payload?.sub).toBe(7);
    expect(payload?.email).toBe('member@lab.test');
  });
});
