import { afterEach, describe, expect, test } from '@jest/globals';
import type { FastifyReply, FastifyRequest } from 'fastify';
import {
  enforceFormsPublicSubmitRateLimit,
  resetFormsPublicSubmitRateLimitForTests,
} from '@/shared/server/forms-public-rate-limit';

function mockRequest(ip: string): FastifyRequest {
  return { ip, headers: {} } as FastifyRequest;
}

type MockReply = FastifyReply & {
  statusCode: number;
  body: unknown;
  headers: Record<string, string>;
};

function mockReply(): MockReply {
  const state = {
    statusCode: 200,
    body: undefined as unknown,
    headers: {} as Record<string, string>,
  };
  const reply = {
    get statusCode() {
      return state.statusCode;
    },
    get body() {
      return state.body;
    },
    get headers() {
      return state.headers;
    },
    status(code: number) {
      state.statusCode = code;
      return reply;
    },
    header(name: string, value: string) {
      state.headers[name] = value;
      return reply;
    },
    async send(payload: unknown) {
      state.body = payload;
      return reply;
    },
  };
  return reply as unknown as MockReply;
}

describe('enforceFormsPublicSubmitRateLimit', () => {
  afterEach(() => {
    resetFormsPublicSubmitRateLimitForTests();
    delete process.env.LAB_FORMS_PUBLIC_SUBMIT_MAX;
    delete process.env.LAB_FORMS_PUBLIC_SUBMIT_WINDOW_MS;
  });

  test('allows requests under the limit', async () => {
    process.env.LAB_FORMS_PUBLIC_SUBMIT_MAX = '3';
    const req = mockRequest('203.0.113.1');
    for (let i = 0; i < 3; i++) {
      const ok = await enforceFormsPublicSubmitRateLimit(req, mockReply());
      expect(ok).toBe(true);
    }
  });

  test('returns 429 when limit exceeded', async () => {
    process.env.LAB_FORMS_PUBLIC_SUBMIT_MAX = '2';
    const req = mockRequest('203.0.113.2');
    await enforceFormsPublicSubmitRateLimit(req, mockReply());
    await enforceFormsPublicSubmitRateLimit(req, mockReply());
    const blocked = mockReply();
    const ok = await enforceFormsPublicSubmitRateLimit(req, blocked);
    expect(ok).toBe(false);
    expect(blocked.statusCode).toBe(429);
    expect(blocked.body).toMatchObject({ error: 'RATE_LIMIT_EXCEEDED' });
    expect(blocked.headers['Retry-After']).toBeDefined();
  });
});
