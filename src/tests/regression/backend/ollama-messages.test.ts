import { describe, expect, test } from '@jest/globals';
import { normalizeMessagesForOllamaChat } from '@/backend/ai/providers/ollama/ollama-messages';

describe('ollama-messages', () => {
  test('coerces assistant tool_calls arguments from JSON string to object', () => {
    const out = normalizeMessagesForOllamaChat([
      {
        role: 'assistant',
        content: '',
        tool_calls: [
          {
            id: 'call_1',
            type: 'function',
            function: {
              name: 'nmem_remember',
              arguments: '{"memory_type":"fact","content":"hello"}',
            },
          },
        ],
      },
    ]);

    expect(out[0].tool_calls?.[0].function.arguments).toEqual({
      memory_type: 'fact',
      content: 'hello',
    });
  });

  test('preserves tool result messages', () => {
    const out = normalizeMessagesForOllamaChat([
      {
        role: 'tool',
        tool_call_id: 'call_1',
        content: '{"success":true}',
      },
    ]);
    expect(out[0].role).toBe('tool');
    expect(out[0].content).toBe('{"success":true}');
  });
});
