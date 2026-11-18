import { describe, expect, test } from '@jest/globals';

import { resolveProviderCapabilities } from '@/shared/config/lab-provider-capabilities';



describe('lab-provider-capabilities (2.8–2.11)', () => {

  test('Ollama matches other providers for tools and streaming', () => {

    const caps = resolveProviderCapabilities('Ollama', { baseUrl: 'http://127.0.0.1:11434' });

    expect(caps.nativeToolCalls).toBe(true);

    expect(caps.useTextToolExtraction).toBe(false);
    expect(caps.useLeakedToolCallExtraction).toBe(true);
    expect(caps.supportsStreaming).toBe(true);

  });



  test('custom base URL is openai-compatible profile', () => {

    const caps = resolveProviderCapabilities('OpenAI', { baseUrl: 'http://127.0.0.1:1234/v1' });

    expect(caps.profile).toBe('openai-compatible');

    expect(caps.supportsStreaming).toBe(true);

    expect(caps.useTextToolExtraction).toBe(false);

    expect(caps.nativeToolCalls).toBe(true);

  });

});

