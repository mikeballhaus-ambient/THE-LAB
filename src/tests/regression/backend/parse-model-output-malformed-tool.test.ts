import { describe, expect, test } from '@jest/globals';
import { chatUtils } from '@/backend/utils/chat/utils';

describe('parseModelOutput malformed tool envelope', () => {
  test('does not enqueue tool call when inner arguments JSON is broken', () => {
    // Truncated mid-selector — must not enqueue (see tool-call-turn-validation CI fixture).
    const raw =
      '[{"id":"call_1","type":"function","function":{"name":"ui_automation_element_action","arguments":"{\\"actions\\":[{\\"order\\":1,\\"target\\":\\"button[data-pc-name=pcclosebutton]"}}]';
    const parsed = chatUtils.parseModelOutput(raw, '', {
      allowTextToolExtraction: true,
      allowLeakedToolExtraction: true,
    });
    expect(parsed.toolCalls).toHaveLength(0);
    expect(parsed.invalidToolCallExtracted).toBe(true);
    expect(parsed.content).not.toContain('ui_automation_element_action');
  });
});
