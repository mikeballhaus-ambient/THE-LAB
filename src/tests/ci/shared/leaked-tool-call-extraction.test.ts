import { describe, expect, test } from '@jest/globals';
import { extractLeakedToolCallsFromText } from '@/shared/utils/leaked-tool-call-extraction';

describe('extractLeakedToolCallsFromText', () => {
  test('parses Ollama-style name/parameters array', () => {
    const raw = '[{"name":"app_management_get_app","parameters":{"id":"CRM"}}]';
    const result = extractLeakedToolCallsFromText(raw, '');
    expect(result.extracted).toBe(true);
    expect(result.toolCalls).toHaveLength(1);
    expect(result.toolCalls[0].function.name).toBe('app_management_get_app');
    expect(JSON.parse(result.toolCalls[0].function.arguments as string)).toEqual({ id: 'CRM' });
    expect(result.contentWithoutLeak).toBe('');
  });

  test('parses OpenAI-style function objects in array', () => {
    const raw =
      '[{"id":"call_1","type":"function","function":{"name":"read_file","arguments":{"filePath":"a.ts"}}}]';
    const result = extractLeakedToolCallsFromText(raw, '');
    expect(result.extracted).toBe(true);
    expect(result.toolCalls[0].function.name).toBe('read_file');
  });

  test('repairs stray closing brace after array (common local model typo)', () => {
    const valid =
      '[{"id":"call_1","type":"function","function":{"name":"todo_list","arguments":"{\\"action\\":\\"list\\"}"}}]';
    const raw = `${valid}}`;
    const result = extractLeakedToolCallsFromText(raw, '');
    expect(result.extracted).toBe(true);
    expect(result.toolCalls[0].function.name).toBe('todo_list');
  });

  test('parses OpenAI-style leak when arguments string contains nested arrays', () => {
    const raw =
      '[{"id":"call_1","type":"function","function":{"name":"app_management_create_app","arguments":"{\\"catalogTagIds\\":[\\"testing\\", \\"examples\\"]}"}}]';
    const result = extractLeakedToolCallsFromText(raw, '');
    expect(result.extracted).toBe(true);
    expect(result.toolCalls[0].function.name).toBe('app_management_create_app');
    expect(JSON.parse(result.toolCalls[0].function.arguments as string)).toEqual({
      catalogTagIds: ['testing', 'examples'],
    });
  });

  test('ignores normal prose', () => {
    const result = extractLeakedToolCallsFromText('The CRM app is a hybrid app.', '');
    expect(result.extracted).toBe(false);
    expect(result.toolCalls).toHaveLength(0);
  });

  test('repairs ui_automation discover leak with extra brace and missing arguments close quote', () => {
    const raw =
      '[{"id":"2vX9r1kL8qHnM5wT7pBfR4jY3sN6aDc0","type":"function","function":{"name":"ui_automation_discover_elements","arguments":"{\\"contextArea\\":\\"app-loaded-container\\",\\"maxResults\\":50,\\"persona\\":\\"Architect\\",\\"sessionId\\":\\"82f27619-5c0d-4098-894d-b226e6848280\\",\\"searchPattern\\":\\"Edit\\"}}]';
    const result = extractLeakedToolCallsFromText(raw, '');
    expect(result.extracted).toBe(true);
    expect(result.toolCalls[0].function.name).toBe('ui_automation_discover_elements');
    expect(JSON.parse(result.toolCalls[0].function.arguments as string)).toMatchObject({
      contextArea: 'app-loaded-container',
      searchPattern: 'Edit',
    });
    expect(result.contentWithoutLeak).toBe('');
  });
});
