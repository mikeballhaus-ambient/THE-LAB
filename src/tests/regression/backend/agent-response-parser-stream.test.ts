import { describe, expect, test } from '@jest/globals';
import { AgentResponseParser } from '@/backend/utils/agent-response-parser';
import type { ChatMessage } from '@/shared/types';

describe('AgentResponseParser streaming (LM Studio batch chunk)', () => {
  test('ingestChatMessage emits tool calls on isComplete chunks', () => {
    const parser = new AgentResponseParser();
    const chunk: ChatMessage = {
      role: 'assistant',
      content: '',
      reasoning: 'thinking about tools',
      isComplete: true,
      tool_calls: [
        {
          type: 'function',
          id: 'call-1',
          function: { name: 'app_management_get_apps', arguments: '{"userId":1}' },
        },
      ],
    };

    const events = parser.ingestChatMessage(chunk);
    const toolEvents = events.filter((e) => e.type === 'function_call.complete');
    expect(toolEvents.length).toBe(1);
    expect(toolEvents[0].type === 'function_call.complete' && toolEvents[0].toolCall[0].function.name).toBe(
      'app_management_get_apps',
    );
  });

  test('ingestChatMessage emits text.delta for assistant content on isComplete chunks', () => {
    const parser = new AgentResponseParser();
    const chunk: ChatMessage = {
      role: 'assistant',
      content: 'Here are the apps in THE-LAB.',
      reasoning: 'Summarizing app list.',
      isComplete: true,
      tool_calls: [],
    };

    const events = parser.ingestChatMessage(chunk);
    const textDeltas = events.filter((e) => e.type === 'text.delta');
    expect(textDeltas.length).toBe(1);
    expect(textDeltas[0].type === 'text.delta' && textDeltas[0].text).toBe('Here are the apps in THE-LAB.');
  });

  test('isComplete chunk does not duplicate text already streamed incrementally', () => {
    const parser = new AgentResponseParser();

    parser.ingestChatMessage({
      role: 'assistant',
      content: 'Hello',
      isComplete: false,
      tool_calls: [],
    });
    parser.ingestChatMessage({
      role: 'assistant',
      content: ' world',
      isComplete: false,
      tool_calls: [],
    });

    const events = parser.ingestChatMessage({
      role: 'assistant',
      content: 'Hello world',
      isComplete: true,
      tool_calls: [],
    });

    const textDeltas = events.filter((e) => e.type === 'text.delta');
    expect(textDeltas.length).toBe(0);
    expect(parser.messageBuffer).toBe('Hello world');
  });
});
