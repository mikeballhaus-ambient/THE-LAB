import type { UIChatMessage } from '@/shared/types';

export function isToolResultSystemMessage(message: UIChatMessage): boolean {
  return message.role === 'system' && Boolean(message.systemLog?.isResult);
}

function toolResultLogId(message: UIChatMessage): string | undefined {
  const id = message.systemLog?.id;
  return typeof id === 'string' && id.length > 0 ? id : undefined;
}

/**
 * Re-attach tool-result system rows from persistence when an in-memory save races
 * ahead of TOOL_CALL_AFTER (e.g. tool-call-agent-message then updateMessages).
 */
export function mergePersistedToolResultMessages(
  persisted: readonly UIChatMessage[],
  next: readonly UIChatMessage[],
): UIChatMessage[] {
  const nextIds = new Set(
    next
      .filter(isToolResultSystemMessage)
      .map((m) => toolResultLogId(m))
      .filter((id): id is string => Boolean(id)),
  );

  const missing = persisted.filter((m) => {
    const id = toolResultLogId(m);
    return id != null && !nextIds.has(id);
  });

  if (missing.length === 0) {
    return [...next];
  }

  const merged = [...next];

  for (const toolMessage of missing) {
    const persistedIndex = persisted.indexOf(toolMessage);
    let insertAt = merged.length;

    if (persistedIndex >= 0) {
      const anchorAfter = persisted[persistedIndex + 1];
      if (anchorAfter?.chatId) {
        const anchorIdx = merged.findIndex((m) => m.chatId === anchorAfter.chatId);
        if (anchorIdx >= 0) {
          insertAt = anchorIdx;
        }
      } else if (persistedIndex > 0) {
        const anchorBefore = persisted[persistedIndex - 1];
        if (anchorBefore?.chatId) {
          const anchorIdx = merged.findIndex((m) => m.chatId === anchorBefore.chatId);
          if (anchorIdx >= 0) {
            insertAt = anchorIdx + 1;
          }
        }
      }
    }

    merged.splice(insertAt, 0, toolMessage);
  }

  return merged;
}
