import { describe, expect, test } from '@jest/globals';
import {
  LAB_CHAT_EMPTY_SEND_CONTINUE,
  LAB_CHAT_EMPTY_SEND_FIRST_MESSAGE,
  resolveEmptyChatSendText,
} from '@/shared/utils/chat-empty-send-default';
import type { UIChatMessage } from '@/shared/types';

describe('resolveEmptyChatSendText', () => {
  test('first turn uses Hello', () => {
    expect(resolveEmptyChatSendText([])).toBe(LAB_CHAT_EMPTY_SEND_FIRST_MESSAGE);
    expect(
      resolveEmptyChatSendText([
        { role: 'assistant', content: 'Welcome' },
        { role: 'system', content: 'log', systemLog: { id: '1', data: {}, title: 't', content: '', isResult: false } },
      ]),
    ).toBe(LAB_CHAT_EMPTY_SEND_FIRST_MESSAGE);
  });

  test('after a user message uses Continue', () => {
    const messages: UIChatMessage[] = [{ role: 'user', content: 'Hi' }];
    expect(resolveEmptyChatSendText(messages)).toBe(LAB_CHAT_EMPTY_SEND_CONTINUE);
  });
});
