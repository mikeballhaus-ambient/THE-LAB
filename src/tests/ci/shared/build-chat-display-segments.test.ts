import { describe, expect, test } from '@jest/globals';
import { buildChatDisplaySegments } from '@/shared/utils/build-chat-display-segments';
import type { UIChatMessage } from '@/shared/types';

function toolLog(id: string, title = 'todo_list'): UIChatMessage {
  return {
    role: 'system',
    content: '',
    systemLog: {
      id,
      title,
      content: '',
      success: true,
      isResult: true,
      data: {},
    },
  };
}

describe('buildChatDisplaySegments', () => {
  test('groups contiguous tool results into one batch', () => {
    const messages: UIChatMessage[] = [
      { role: 'user', content: 'go', chatId: 'u1' },
      toolLog('t1', 'todo_list'),
      toolLog('t2', 'todo_list'),
      toolLog('t3', 'todo_list'),
      { role: 'assistant', content: 'done', chatId: 'a1' },
    ];
    const segments = buildChatDisplaySegments(messages);
    expect(segments).toEqual([
      { kind: 'message', messageIndex: 0 },
      { kind: 'tool-batch', batchId: 't1', messageIndices: [1, 2, 3] },
      { kind: 'message', messageIndex: 4 },
    ]);
  });

  test('mixed tools without break form a single batch of six', () => {
    const messages: UIChatMessage[] = [
      { role: 'user', content: 'run', chatId: 'u1' },
      toolLog('a'),
      toolLog('b'),
      toolLog('c'),
      toolLog('d'),
      toolLog('e'),
      toolLog('f'),
    ];
    const segments = buildChatDisplaySegments(messages);
    expect(segments[1]).toMatchObject({
      kind: 'tool-batch',
      messageIndices: [1, 2, 3, 4, 5, 6],
    });
  });

  test('assistant reply between tool runs creates two batches', () => {
    const messages: UIChatMessage[] = [
      { role: 'user', content: 'first', chatId: 'u1' },
      toolLog('x1'),
      toolLog('x2'),
      { role: 'assistant', content: 'here', chatId: 'a1' },
      { role: 'user', content: 'second', chatId: 'u2' },
      toolLog('y1'),
      toolLog('y2'),
    ];
    const segments = buildChatDisplaySegments(messages);
    expect(segments).toEqual([
      { kind: 'message', messageIndex: 0 },
      { kind: 'tool-batch', batchId: 'x1', messageIndices: [1, 2] },
      { kind: 'message', messageIndex: 3 },
      { kind: 'message', messageIndex: 4 },
      { kind: 'tool-batch', batchId: 'y1', messageIndices: [5, 6] },
    ]);
  });

  test('non–tool-result system log breaks the batch', () => {
    const messages: UIChatMessage[] = [
      toolLog('t1'),
      {
        role: 'system',
        content: 'pending',
        systemLog: {
          id: 'pending-1',
          title: 'Running',
          content: '',
          isResult: false,
          data: {},
        },
      },
      toolLog('t2'),
    ];
    const segments = buildChatDisplaySegments(messages);
    expect(segments).toEqual([
      { kind: 'tool-batch', batchId: 't1', messageIndices: [0] },
      { kind: 'message', messageIndex: 1 },
      { kind: 'tool-batch', batchId: 't2', messageIndices: [2] },
    ]);
  });

  test('single tool call is a batch of one', () => {
    const messages: UIChatMessage[] = [
      { role: 'user', content: 'x', chatId: 'u1' },
      toolLog('only'),
    ];
    const segments = buildChatDisplaySegments(messages);
    expect(segments[1]).toEqual({
      kind: 'tool-batch',
      batchId: 'only',
      messageIndices: [1],
    });
  });
});
