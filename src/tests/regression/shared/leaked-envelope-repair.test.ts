import { describe, expect, test } from '@jest/globals';
import { extractLeakedToolCallsFromText } from '@/shared/utils/leaked-tool-call-extraction';
import { chatUtils } from '@/backend/utils/chat/utils';

/** User-reported Ollama leak (note: one `}` short before `]`). */
const USER_LEAK =
  '[{"id":"ONTqRgq8IhGZvNrD2lN1KYciIhJv4pTi","type":"function","function":{"name":"app_management_create_app","arguments":"{\\"userId\\":1,\\"type\\":\\"browser\\",\\"name\\":\\"Lab Smoke Test\\",\\"description\\":\\"Single-screen browser app to verify App Builder scaffold and catalog launch. Counter optional; no backend.\\",\\"faIcon\\":\\"fa-vial\\",\\"catalogTagIds\\":[\\"testing\\", \\"examples\\"],\\"isEnabled\\":true,\\"version\\":\\"1.0.0\\"}"}]}}';

describe('user Ollama create_app envelope', () => {
  test('raw user string is invalid JSON', () => {
    expect(() => JSON.parse(USER_LEAK)).toThrow();
  });

  test('salvage after envelope repair', () => {
    const leaked = extractLeakedToolCallsFromText(USER_LEAK, '');
    expect(leaked.extracted).toBe(true);
    expect(leaked.toolCalls[0].function.name).toBe('app_management_create_app');

    const parsed = chatUtils.parseModelOutput(USER_LEAK, '', {
      allowTextToolExtraction: false,
      allowLeakedToolExtraction: true,
    });
    expect(parsed.toolCalls).toHaveLength(1);
  });
});
