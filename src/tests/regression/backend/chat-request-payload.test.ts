import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from '@jest/globals';
import {
  buildOpenAiCompatRequestExtras,
  mapChatRequestPayload,
  resolveOllamaThink,
  resolveRequestTemperature,
} from '@/backend/ai/providers/shared/chat-request-payload';
import { buildProviderAdapter } from '@/backend/ai/provider-adapter-factory';
import type { ChatRequestPayload, ProviderConfigBase } from '@/shared/types';

const labChatPayload: ChatRequestPayload = {
  sessionId: 'sess-1',
  persona: 'Code',
};

const platformAgentPayload: ChatRequestPayload = {
  sessionId: 'platform-llm:agent:1:abc',
  persona: 'PlatformAgent',
  temperature: 0,
  maxTokens: 384,
  reasoningEffort: 'none',
  sampling: { top_p: 0.72, repeat_penalty: 1.42 },
};

describe('mapChatRequestPayload (provider contract)', () => {
  test('Lab Assistant payload does not send reasoning or platform sampling', () => {
    const mapped = mapChatRequestPayload(labChatPayload);
    expect(mapped.openAiCompatExtras).toEqual({});
    expect(mapped.ollamaThink).toBe(false);
    expect(mapped.ollamaOptions.temperature).toBe(0.7);
    expect(mapped.ollamaOptions.num_predict).toBeUndefined();
  });

  test('Platform agent payload maps OpenAI-compat thinking off + caps', () => {
    const extras = buildOpenAiCompatRequestExtras(platformAgentPayload);
    expect(extras.reasoning_effort).toBe('none');
    expect(extras.chat_template_kwargs).toEqual({ enable_thinking: false });
    expect(extras.max_tokens).toBe(384);
    expect(extras.top_p).toBe(0.72);
    expect(extras.repeat_penalty).toBe(1.42);
  });

  test('Platform non-none reasoningEffort enables binary thinking (no granular effort string)', () => {
    const extras = buildOpenAiCompatRequestExtras({
      ...platformAgentPayload,
      reasoningEffort: 'low',
    });
    expect(extras.reasoning_effort).toBeUndefined();
    expect(extras.chat_template_kwargs).toEqual({ enable_thinking: true });
  });

  test('Platform temperature override wins over persona default', () => {
    expect(resolveRequestTemperature(platformAgentPayload)).toBe(0);
  });

  test('Ollama think follows reasoningEffort', () => {
    expect(resolveOllamaThink(labChatPayload)).toBe(false);
    expect(resolveOllamaThink(platformAgentPayload)).toBe(false);
    expect(resolveOllamaThink({ ...platformAgentPayload, reasoningEffort: 'low' })).toBe(true);
  });
});

const stubProviderConfig = (provider: string): ProviderConfigBase => ({
  id: 1,
  provider,
  providerId: 1,
  providerType: 'chat',
  model: 'test-model',
  apiKey: '',
  baseUrl: 'http://localhost:9999',
  maxContext: '8192',
});

describe('LLMProvider.resolveChatRequestOptions', () => {
  // Resolve from the repo root rather than from this file's location: the file lives under a
  // test tier directory, so a relative hop count would break if the suite ever moves.
  const providersDir = join(process.cwd(), 'src', 'backend', 'ai', 'providers');

  test.each(['openai-provider.ts', 'lm-studio-provider.ts', 'ollama-provider.ts'])(
    '%s implements resolveChatRequestOptions',
    (file) => {
      const src = readFileSync(join(providersDir, file), 'utf8');
      expect(src).toContain('resolveChatRequestOptions');
      expect(src).toContain('mapChatRequestPayload');
    },
  );

  test.each([
    ['OpenAI', platformAgentPayload],
    ['LM Studio', labChatPayload],
    ['Ollama', platformAgentPayload],
  ] as const)('%s adapter matches shared mapper', (providerName, payload) => {
    const adapter = buildProviderAdapter(stubProviderConfig(providerName));
    expect(adapter).toBeDefined();
    expect(adapter!.resolveChatRequestOptions(payload)).toEqual(mapChatRequestPayload(payload));
  });
});
