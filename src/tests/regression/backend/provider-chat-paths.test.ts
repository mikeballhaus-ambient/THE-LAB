import { describe, expect, test } from '@jest/globals';
import { baseUtils } from '@/backend/utils/chat/base-utils';
import { resolveProviderCapabilitiesFromAdapter } from '@/shared/config/lab-provider-capabilities';
import { buildProviderAdapter } from '@/backend/ai/provider-adapter-factory';
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

describe('provider chat paths (2.19)', () => {
  test('Ollama capabilities align with cloud-compatible providers', () => {
    const adapter = buildProviderAdapter(baseConfig('Ollama'));
    expect(adapter).toBeDefined();
    const caps = resolveProviderCapabilitiesFromAdapter(adapter!);
    expect(caps.useTextToolExtraction).toBe(false);
    expect(caps.nativeToolCalls).toBe(true);
  });

  test('OpenAI adapter keeps text extraction available when no native tool_calls', () => {
    const parsed = baseUtils.parseModelOutput(
      '{"tool_calls":[{"id":"1","type":"function","function":{"name":"todo_list","arguments":"{}"}}]}',
      '',
      { allowTextToolExtraction: true },
    );
    expect(parsed.toolCalls.length).toBeGreaterThan(0);
  });

  test('text extraction suppressed when allowTextToolExtraction is false', () => {
    const parsed = baseUtils.parseModelOutput(
      '{"tool_calls":[{"id":"1","type":"function","function":{"name":"todo_list","arguments":"{}"}}]}',
      '',
      { allowTextToolExtraction: false, allowLeakedToolExtraction: false },
    );
    expect(parsed.toolCalls).toHaveLength(0);
  });

  test('leaked tool JSON is parsed even when full text extraction is off', () => {
    const parsed = baseUtils.parseModelOutput(
      '[{"name":"app_management_get_app","parameters":{"id":"app-lab-crm"}}]',
      '',
      { allowTextToolExtraction: false, allowLeakedToolExtraction: true },
    );
    expect(parsed.toolCalls).toHaveLength(1);
    expect(parsed.toolCalls[0].function.name).toBe('app_management_get_app');
    expect(parsed.toolCallFromContent).toBe(true);
  });

  test('buildAgentResponse prefers native tool_calls over parsed content', async () => {
    const agent = await baseUtils.buildAgentResponse(1, {
      role: 'assistant',
      content: '{"tool_calls":[]}',
      tool_calls: [
        {
          id: 'native-1',
          type: 'function',
          function: { name: 'read_file', arguments: '{"filePath":"a.txt"}' },
        },
      ],
    });
    expect(agent.tool_calls[0]?.id).toBe('native-1');
    expect(agent.hasToolCall).toBe(true);
  });
});
