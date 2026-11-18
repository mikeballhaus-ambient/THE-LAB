import type { UIChatMessage } from '@/shared/types';
import { stripLeakedNativeToolCallsFromText } from '@/shared/utils/strip-leaked-assistant-tool-calls';
import { buildChatDisplaySegments } from '@/shared/utils/build-chat-display-segments';

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

/** Text shown in Sidecar bubbles (content stream only — no tool/system logs). */
export function getLabSidecarMessageText(message: UIChatMessage): string {
  const raw = rawAssistantVisibleText(message);
  if (message.role !== 'assistant' || !raw) {
    return raw;
  }
  return stripLeakedNativeToolCallsFromText(raw);
}

export function labSidecarMessageHasVisibleText(message: UIChatMessage): boolean {
  return getLabSidecarMessageText(message).trim().length > 0;
}

/** User + assistant messages that have visible body text (hides tool logs and empty placeholders). */
export function getLabSidecarDisplayMessages(messages: UIChatMessage[]): UIChatMessage[] {
  return messages.filter((m) => {
    if (m.role === 'user') return true;
    if (m.role === 'assistant') return labSidecarMessageHasVisibleText(m);
    return false;
  });
}

export function sidecarShowsMessage(message: UIChatMessage): boolean {
  if (message.role === 'user') return true;
  if (message.role === 'assistant') return labSidecarMessageHasVisibleText(message);
  return false;
}

export type LabSidecarToolBatchItem = {
  kind: 'tool-batch';
  batchId: string;
  messages: UIChatMessage[];
};

export type LabSidecarMessageItem = {
  kind: 'message';
  message: UIChatMessage;
};

export type LabSidecarDisplayItem = LabSidecarMessageItem | LabSidecarToolBatchItem;

/** Sidecar transcript rows — optional grouped tool batches when `showToolResults`. */
export function buildLabSidecarDisplayItems(
  messages: UIChatMessage[],
  showToolResults: boolean,
): LabSidecarDisplayItem[] {
  if (!showToolResults) {
    return getLabSidecarDisplayMessages(messages).map((message) => ({ kind: 'message', message }));
  }

  const items: LabSidecarDisplayItem[] = [];
  for (const segment of buildChatDisplaySegments(messages)) {
    if (segment.kind === 'tool-batch') {
      items.push({
        kind: 'tool-batch',
        batchId: segment.batchId,
        messages: segment.messageIndices.map((i) => messages[i]),
      });
      continue;
    }
    const message = messages[segment.messageIndex];
    if (sidecarShowsMessage(message)) {
      items.push({ kind: 'message', message });
    }
  }
  return items;
}

export function shouldShowLabSidecarTypingIndicator(
  messages: UIChatMessage[],
  isAwaiting: boolean,
): boolean {
  if (!isAwaiting) return false;
  const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant');
  if (!lastAssistant) return true;
  return !labSidecarMessageHasVisibleText(lastAssistant);
}
