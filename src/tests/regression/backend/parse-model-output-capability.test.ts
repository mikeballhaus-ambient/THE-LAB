import { describe, expect, test } from '@jest/globals';
import { chatUtils } from '@/backend/utils/chat/utils';

describe('parseModelOutput capability guard (2.13)', () => {
  test('skips text tool extraction when disabled', () => {
    const raw = '[Tool Call]Executing: todo_list with arguments: {"action":"list"}';
    const parsed = chatUtils.parseModelOutput(raw, '', { allowTextToolExtraction: false });
    expect(parsed.toolCalls.length).toBe(0);
  });

  test('still extracts leaked tool arrays when text extraction is disabled', () => {
    const raw = '[{"name":"read_file","parameters":{"filePath":"a.ts"}}]';
    const parsed = chatUtils.parseModelOutput(raw, '', {
      allowTextToolExtraction: false,
      allowLeakedToolExtraction: true,
    });
    expect(parsed.toolCalls).toHaveLength(1);
    expect(parsed.toolCalls[0].function.name).toBe('read_file');
  });

  test('salvages create_app leak with nested catalogTagIds (Ollama-style envelope)', () => {
    const raw =
      '[{"id":"call_1","type":"function","function":{"name":"app_management_create_app","arguments":"{\\"userId\\":1,\\"type\\":\\"browser\\",\\"name\\":\\"Lab Smoke Test\\",\\"catalogTagIds\\":[\\"testing\\", \\"examples\\"],\\"isEnabled\\":true}"}}]}}';
    const parsed = chatUtils.parseModelOutput(raw, '', {
      allowTextToolExtraction: false,
      allowLeakedToolExtraction: true,
    });
    expect(parsed.invalidToolCallExtracted).toBe(false);
    expect(parsed.toolCalls).toHaveLength(1);
    expect(parsed.toolCalls[0].function.name).toBe('app_management_create_app');
  });

  test('salvages leaked tools even when legacy text JSON parse marked invalid', () => {
    const raw =
      '[{"id":"call_1","type":"function","function":{"name":"todo_list","arguments":"{\\"action\\":\\"list\\"}"}}]}}';
    const parsed = chatUtils.parseModelOutput(raw, '', {
      allowTextToolExtraction: true,
      allowLeakedToolExtraction: true,
    });
    expect(parsed.toolCalls).toHaveLength(1);
    expect(parsed.toolCalls[0].function.name).toBe('todo_list');
  });
});
