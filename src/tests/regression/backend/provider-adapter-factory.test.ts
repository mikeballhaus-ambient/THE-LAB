import { describe, expect, test } from '@jest/globals';
import {
  adapterSupportsStreaming,
  buildProviderAdapter,
  createProviderAdapter,
} from '@/backend/ai/provider-adapter-factory';
import { LmStudioAdapter } from '@/backend/ai/providers/lm-studio-provider';
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

describe('provider-adapter-factory (2.9)', () => {
  test('createProviderAdapter is alias of buildProviderAdapter', () => {
    expect(createProviderAdapter(undefined)).toBeUndefined();
    expect(createProviderAdapter(baseConfig('Ollama'))?.getName()).toBe('Ollama');
  });

  test('adapterSupportsStreaming is true for Ollama', () => {
    const ollama = buildProviderAdapter(baseConfig('Ollama'));
    expect(adapterSupportsStreaming(ollama)).toBe(true);
  });

  test('adapterSupportsStreaming is true for OpenAI adapter', () => {
    const openai = buildProviderAdapter(baseConfig('OpenAI'));
    expect(adapterSupportsStreaming(openai)).toBe(true);
  });

  test('LM Studio uses native REST adapter with streaming', () => {
    const lm = buildProviderAdapter(baseConfig('LM Studio'));
    expect(lm).toBeInstanceOf(LmStudioAdapter);
    expect(lm?.getName()).toBe('LM Studio');
    expect(adapterSupportsStreaming(lm)).toBe(true);
  });
});
