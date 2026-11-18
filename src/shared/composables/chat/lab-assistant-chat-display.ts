import type { UIChatMessage } from '@/shared/types';
import { stripLeakedNativeToolCallsFromText } from '@/shared/utils/strip-leaked-assistant-tool-calls';

function rawAssistantVisibleText(message: UIChatMessage): string {
  const fromBuffer = message.contentBuffer;
  if (typeof fromBuffer === 'string' && fromBuffer.length > 0) {
    return fromBuffer;
  }
  if (typeof message.content === 'string') {
    return message.content;
  }
  return '';
}

/** Visible assistant text in Laboratory / MessagesView (strips leaked tool-call JSON). */
export function getLabAssistantMessageText(message: UIChatMessage): string {
  const raw = rawAssistantVisibleText(message);
  if (message.role !== 'assistant' || !raw) {
    return raw;
  }
  return stripLeakedNativeToolCallsFromText(raw);
}
