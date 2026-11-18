import type { UIChatMessage } from '@/shared/types';

export const LAB_CHAT_EMPTY_SEND_CONTINUE = 'Continue';
export const LAB_CHAT_EMPTY_SEND_FIRST_MESSAGE = 'Hello';

/**
 * When the user sends with an empty composer, Laboratory and Sidecar substitute
 * default text. "Continue" only makes sense after at least one user turn.
 */
export function resolveEmptyChatSendText(messages: readonly UIChatMessage[]): string {
  const hasPriorUserMessage = messages.some((m) => m.role === 'user');
  return hasPriorUserMessage ? LAB_CHAT_EMPTY_SEND_CONTINUE : LAB_CHAT_EMPTY_SEND_FIRST_MESSAGE;
}
