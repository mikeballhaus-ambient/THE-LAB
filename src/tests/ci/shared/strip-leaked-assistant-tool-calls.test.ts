import { describe, expect, test } from '@jest/globals';
import { stripLeakedNativeToolCallsFromText } from '@/shared/utils/strip-leaked-assistant-tool-calls';

const LEAKED =
  '[{"id":"mKpLqRvNwXzTcBjHsYdFgP2aEoUxWnQr","type":"function","function":{"name":"lab_integrations_delete_binding","arguments":"{\\"userId\\":1}"}}]';

describe('stripLeakedNativeToolCallsFromText', () => {
  test('removes leading tool-call array glued to markdown', () => {
    const input = `${LEAKED}## Done`;
    expect(stripLeakedNativeToolCallsFromText(input)).toBe('## Done');
  });

  test('removes multiple leading tool-call blobs', () => {
    const input = `${LEAKED}\n${LEAKED}\nHello`;
    expect(stripLeakedNativeToolCallsFromText(input)).toBe('Hello');
  });

  test('preserves intentional JSON in fenced code blocks', () => {
    const fenced = '```json\n[{"type":"function","id":"x","function":{"name":"demo"}}]\n```';
    const input = `See:\n${fenced}\n\n${LEAKED}Summary`;
    expect(stripLeakedNativeToolCallsFromText(input)).toContain(fenced);
    expect(stripLeakedNativeToolCallsFromText(input).trimEnd()).toMatch(/Summary$/);
  });

  test('preserves generic JSON objects that are not tool calls', () => {
    const input = '{"foo":"bar","type":"function"}';
    expect(stripLeakedNativeToolCallsFromText(input)).toBe(input);
  });

  test('no-op when no function tool marker', () => {
    const input = '{"items":[1,2,3]}';
    expect(stripLeakedNativeToolCallsFromText(input)).toBe(input);
  });
});
