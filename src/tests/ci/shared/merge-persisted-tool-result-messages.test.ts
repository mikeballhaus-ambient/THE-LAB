import { describe, expect, test } from '@jest/globals';
import { mergePersistedToolResultMessages } from '@/shared/utils/merge-persisted-tool-result-messages';
import type { UIChatMessage } from '@/shared/types';

describe('mergePersistedToolResultMessages', () => {
  test('returns next unchanged when no tool logs in persistence', () => {
    const next: UIChatMessage[] = [
      { role: 'user', content: 'hi', chatId: 'u1' },
      { role: 'assistant', content: 'ok', chatId: 'a1' },
    ];
    expect(mergePersistedToolResultMessages(next, next)).toEqual(next);
  });

  test('re-inserts tool result dropped from in-memory save before assistant placeholder', () => {
    const toolLog: UIChatMessage = {
      role: 'system',
      content: '',
      systemLog: {
        id: 'op-1',
        title: 'lab_integrations_list_bindings',
        content: '',
        success: true,
        isResult: true,
        data: { toolCall: { id: 'c1', type: 'function', function: { name: 'x', arguments: '{}' } } },
      },
    };
    const persisted: UIChatMessage[] = [
      { role: 'user', content: 'wire charts', chatId: 'u1' },
      toolLog,
      { role: 'assistant', content: '', chatId: 'a1', isPlaceholder: true },
    ];
    const staleMemory: UIChatMessage[] = [
      { role: 'user', content: 'wire charts', chatId: 'u1' },
      { role: 'assistant', content: '[{"name":"leaked"}]', chatId: 'a1' },
    ];

    const merged = mergePersistedToolResultMessages(persisted, staleMemory);
    expect(merged).toHaveLength(3);
    expect(merged[1]).toBe(toolLog);
    expect(merged[2].chatId).toBe('a1');
  });
});
