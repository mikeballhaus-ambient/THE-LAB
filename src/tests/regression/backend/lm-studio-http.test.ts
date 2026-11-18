import { describe, expect, test, jest, beforeEach, afterEach } from '@jest/globals';
import {
  collectModelIdsFromV1,
  listLmStudioModelIds,
} from '@/backend/ai/providers/lm-studio/lm-studio-http';
import type { ProviderConfigBase } from '@/shared/types';

const config: ProviderConfigBase = {
  id: 1,
  provider: 'LM Studio',
  providerId: 3,
  providerType: 'chat',
  model: 'qwen/qwen3.5-9b',
  apiKey: '',
  baseUrl: 'http://10.0.0.216:1234',
  maxContext: '8192',
};

describe('lm-studio-http', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  test('collectModelIdsFromV1 includes keys and loaded instance ids', () => {
    const ids = collectModelIdsFromV1({
      models: [
        {
          key: 'qwen/qwen3.5-9b',
          loaded_instances: [{ id: 'qwen/qwen3.5-9b' }],
        },
        { key: 'text-embedding-nomic-embed-text-v1.5-embedding' },
      ],
    });
    expect(ids).toContain('qwen/qwen3.5-9b');
    expect(ids).toContain('text-embedding-nomic-embed-text-v1.5-embedding');
  });

  test('listLmStudioModelIds calls GET /api/v1/models on server root', async () => {
    global.fetch = jest.fn(async (input: RequestInfo | URL) => {
      expect(String(input)).toBe('http://10.0.0.216:1234/api/v1/models');
      return {
        ok: true,
        json: async () => ({
          models: [{ key: 'qwen/qwen3.5-9b', loaded_instances: [] }],
        }),
      } as Response;
    }) as typeof fetch;

    const ids = await listLmStudioModelIds(config);
    expect(ids).toEqual(['qwen/qwen3.5-9b']);
  });
});
