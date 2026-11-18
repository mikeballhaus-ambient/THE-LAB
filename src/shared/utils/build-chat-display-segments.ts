import type { UIChatMessage } from '@/shared/types';
import { isToolResultSystemMessage } from '@/shared/utils/merge-persisted-tool-result-messages';

export type ChatToolResultBatchSegment = {
  kind: 'tool-batch';
  /** Stable toggle id — first tool log id in the run, or index fallback */
  batchId: string;
  messageIndices: number[];
};

export type ChatMessageSegment = {
  kind: 'message';
  messageIndex: number;
};

export type ChatDisplaySegment = ChatMessageSegment | ChatToolResultBatchSegment;

function toolBatchId(messages: readonly UIChatMessage[], firstIndex: number): string {
  const id = messages[firstIndex]?.systemLog?.id;
  return typeof id === 'string' && id.length > 0 ? id : `batch-${firstIndex}`;
}

/**
 * Laboratory transcript display: contiguous tool-result system rows become one batch;
 * any other message ends the current batch (match transcript order).
 */
export function buildChatDisplaySegments(messages: readonly UIChatMessage[]): ChatDisplaySegment[] {
  const segments: ChatDisplaySegment[] = [];
  let batch: number[] = [];

  const flushBatch = () => {
    if (batch.length === 0) {
      return;
    }
    segments.push({
      kind: 'tool-batch',
      batchId: toolBatchId(messages, batch[0]),
      messageIndices: [...batch],
    });
    batch = [];
  };

  for (let i = 0; i < messages.length; i++) {
    if (isToolResultSystemMessage(messages[i])) {
      batch.push(i);
    } else {
      flushBatch();
      segments.push({ kind: 'message', messageIndex: i });
    }
  }

  flushBatch();
  return segments;
}
