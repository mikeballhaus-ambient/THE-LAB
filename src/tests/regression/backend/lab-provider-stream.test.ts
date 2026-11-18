import { describe, expect, test } from '@jest/globals';
import { buildProviderAdapter } from '@/backend/ai/provider-adapter-factory';
import { resolveEffectiveStreaming } from '@/shared/config/lab-provider-stream';
import type { ProviderConfigBase } from '@/shared/types';

const baseConfig = (provider: string): ProviderConfigBase => ({
  id: 1,
  provider,
  providerId: 1,
  providerType: 'chat',
  model: 'test',
  apiKey: '',
  baseUrl: 'http://localhost',
  maxContext: '8192',
});

describe('lab-provider-stream', () => {
  test('resolveEffectiveStreaming enables Ollama when requested', () => {
    const ollama = buildProviderAdapter(baseConfig('Ollama'));
    expect(resolveEffectiveStreaming(true, ollama)).toBe(true);
    expect(resolveEffectiveStreaming(false, ollama)).toBe(false);
  });
});
