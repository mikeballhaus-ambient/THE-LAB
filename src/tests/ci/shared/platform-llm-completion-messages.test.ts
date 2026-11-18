import { describe, test, expect } from '@jest/globals';
import { buildPlatformCompletionMessages } from '@/shared/utils/platform-llm-completion-messages';

describe('buildPlatformCompletionMessages', () => {
  test('includes assistant tool_calls and tool result before retry user nudge', () => {
    const messages = buildPlatformCompletionMessages({
      purpose: 'test',
      system: 'sys',
      user: 'board snapshot',
      toolFeedbackTurns: [
        {
          toolCallId: 'call_abc',
          toolName: 'tile_word_grid_submit_move',
          arguments: '{"type":"place","placements":[{"row":1,"col":1,"letter":"A"}]}',
          resultContent: '{"success":false,"error":"Cell occupied"}',
        },
      ],
    });
    expect(messages.map((m) => m.role)).toEqual(['system', 'user', 'assistant', 'tool', 'user']);
    expect(messages[2].tool_calls?.[0].id).toBe('call_abc');
    expect(messages[3].tool_call_id).toBe('call_abc');
    expect(messages[3].content).toContain('Cell occupied');
  });

  test('appends every tool feedback turn in order before retry nudge', () => {
    const messages = buildPlatformCompletionMessages({
      purpose: 'test',
      system: 'sys',
      user: 'board snapshot',
      toolFeedbackTurns: [
        {
          toolCallId: 'call_1',
          toolName: 'tile_word_grid_submit_move',
          arguments: '{"type":"pass"}',
          resultContent: '{"success":false,"error":"first"}',
        },
        {
          toolCallId: 'call_2',
          toolName: 'tile_word_grid_submit_move',
          arguments: '{"type":"pass"}',
          resultContent: '{"success":false,"error":"second"}',
        },
        {
          toolCallId: 'call_3',
          toolName: 'tile_word_grid_submit_move',
          arguments: '{"type":"place"}',
          resultContent: '{"success":false,"error":"third"}',
        },
      ],
    });
    expect(messages.map((m) => m.role)).toEqual([
      'system',
      'user',
      'assistant',
      'tool',
      'assistant',
      'tool',
      'assistant',
      'tool',
      'user',
    ]);
    expect(messages[3].content).toContain('first');
    expect(messages[5].content).toContain('second');
    expect(messages[7].content).toContain('third');
  });
});
