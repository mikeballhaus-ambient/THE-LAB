import { describe, expect, test } from '@jest/globals';
import { labPlatformFetchInit } from '@/shared/composables/useLabPlatformAuth';

describe('labPlatformFetchInit', () => {
  test('adds empty JSON body for POST without body (Fastify JSON parser)', () => {
    const init = labPlatformFetchInit({ method: 'POST' });
    expect(init.body).toBe('{}');
    expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/json');
  });

  test('does not override an explicit request body', () => {
    const init = labPlatformFetchInit({
      method: 'POST',
      body: JSON.stringify({ discovery_url: 'http://example.test/discovery' }),
    });
    expect(init.body).toBe('{"discovery_url":"http://example.test/discovery"}');
  });

  test('GET requests stay bodyless', () => {
    const init = labPlatformFetchInit({ method: 'GET' });
    expect(init.body).toBeUndefined();
  });
});
