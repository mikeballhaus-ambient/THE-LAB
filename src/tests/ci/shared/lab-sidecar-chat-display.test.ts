import { describe, expect, test } from '@jest/globals';
import {
  buildLabSidecarDisplayItems,
  getLabSidecarDisplayMessages,
  shouldShowLabSidecarTypingIndicator,
} from '@/shared/composables/lab-sidecar/lab-sidecar-chat-display';
import { isToolResultSystemMessage } from '@/shared/utils/merge-persisted-tool-result-messages';
import type { UIChatMessage } from '@/shared/types';

describe('lab-sidecar-chat-display', () => {
  test('hides empty assistant placeholders during tool runs', () => {
    const messages: UIChatMessage[] = [
      { role: 'user', content: 'launch crm' },
      { role: 'assistant', content: '', isPlaceholder: true, loading: true },
      { role: 'system', content: '', systemLog: { id: '1', data: {}, title: 'tool', content: '{}', isResult: false } },
      { role: 'assistant', content: '', isComplete: true },
    ];
    expect(getLabSidecarDisplayMessages(messages)).toEqual([
      { role: 'user', content: 'launch crm' },
    ]);
    expect(shouldShowLabSidecarTypingIndicator(messages, true)).toBe(true);
  });

  test('shows assistant once content arrives', () => {
    const messages: UIChatMessage[] = [
      { role: 'user', content: 'hi' },
      { role: 'assistant', content: 'Done.', isComplete: true },
    ];
    expect(getLabSidecarDisplayMessages(messages)).toHaveLength(2);
    expect(shouldShowLabSidecarTypingIndicator(messages, false)).toBe(false);
  });

  test('with showToolResults, inserts tool batch between user and assistant', () => {
    const toolLog: UIChatMessage = {
      role: 'system',
      content: '',
      systemLog: {
        id: 't1',
        title: 'todo_list',
        content: '',
        success: true,
        isResult: true,
        data: {},
      },
    };
    const messages: UIChatMessage[] = [
      { role: 'user', content: 'go' },
      toolLog,
      { role: 'assistant', content: 'Done.', isComplete: true },
    ];
    expect(isToolResultSystemMessage(toolLog)).toBe(true);
    const items = buildLabSidecarDisplayItems(messages, true);
    expect(items).toHaveLength(3);
    expect(items[0]).toMatchObject({ kind: 'message' });
    expect(items[1]).toMatchObject({ kind: 'tool-batch', batchId: 't1', messages: [toolLog] });
    expect(items[2]).toMatchObject({ kind: 'message' });
    expect(buildLabSidecarDisplayItems(messages, false)).toHaveLength(2);
  });

  test('typing hidden when streaming buffer has text', () => {
    const messages: UIChatMessage[] = [
      { role: 'user', content: 'hi' },
      { role: 'assistant', content: '', contentBuffer: 'Partial', isPlaceholder: true },
    ];
    expect(getLabSidecarDisplayMessages(messages)).toHaveLength(2);
    expect(shouldShowLabSidecarTypingIndicator(messages, true)).toBe(false);
  });
});
