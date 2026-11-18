import type { ChatResponse } from 'ollama';
import type { ChatMessage, ChatRole, DoneReason, MCPToolCall } from '@/shared/types';
import { chatUtils } from '@/backend/utils/chat/utils';
import { areToolCallArgumentsJsonComplete } from '@/shared/utils/chat-tool-calls';
import { mergeOllamaStreamToolCalls, normalizeOllamaToolCalls } from './ollama-tool-calls';

export type OllamaStreamPart = {
  message?: ChatResponse['message'];
  done?: boolean;
  eval_count?: number;
  done_reason?: string;
};

export type OllamaChatStreamOptions = {
  shouldStop?: () => boolean;
};

function defaultShouldStop(): boolean {
  return chatUtils.isPendingRequestStop();
}

function yieldToolCompletion(
  role: ChatRole,
  reasoning: string,
  contentStarted: boolean,
  mcpToolCallsResolved: MCPToolCall[],
): ChatMessage {
  return {
    role,
    content: '',
    reasoning,
    contentStarted,
    tool_calls: [...mcpToolCallsResolved],
    hasToolCalls: true,
    doneReason: 'tool_calls' as DoneReason,
    isComplete: true,
    toolCallsDone: true,
  } as ChatMessage;
}

function yieldTextCompletion(
  role: ChatRole,
  content: string,
  reasoning: string,
  contentStarted: boolean,
): ChatMessage {
  return {
    role,
    content,
    reasoning,
    contentStarted,
    tool_calls: [],
    isComplete: true,
    doneReason: 'stop',
  } as ChatMessage;
}

/**
 * Maps Ollama NDJSON chat stream parts to THE-LAB ChatMessage chunks.
 */
export async function* streamOllamaPartsToChatMessages(
  parts: AsyncIterable<OllamaStreamPart>,
  options: OllamaChatStreamOptions = {},
): AsyncGenerator<ChatMessage> {
  const shouldStop = options.shouldStop ?? defaultShouldStop;
  let role: ChatRole = 'assistant';
  let content = '';
  let reasoning = '';
  let contentStarted = false;
  let mcpToolCallsResolved: MCPToolCall[] = [];
  let sawToolCall = false;
  let turnCompleted = false;

  for await (const part of parts) {
    if (shouldStop()) {
      break;
    }

    const msg = part.message;
    if (msg?.role) {
      role = msg.role as ChatRole;
    }

    const contentDelta = msg?.content ?? '';
    if (contentDelta) {
      content += contentDelta;
      contentStarted = true;
      yield {
        role,
        content: contentDelta,
        reasoning,
        contentStarted,
        tool_calls: [],
        isComplete: false,
      } as ChatMessage;
    }

    const thinkingDelta = msg?.thinking ?? '';
    if (thinkingDelta) {
      reasoning += thinkingDelta;
      yield {
        role,
        content: '',
        reasoning: thinkingDelta,
        contentStarted,
        tool_calls: [],
        isComplete: false,
      } as ChatMessage;
    }

    if (msg?.tool_calls?.length) {
      sawToolCall = true;
      const { merged, changedIndex } = mergeOllamaStreamToolCalls(mcpToolCallsResolved, msg.tool_calls);
      mcpToolCallsResolved = merged;
      const current =
        changedIndex !== null && mcpToolCallsResolved[changedIndex]
          ? mcpToolCallsResolved[changedIndex]
          : mcpToolCallsResolved[mcpToolCallsResolved.length - 1];

      if (current) {
        yield {
          role,
          content,
          reasoning,
          contentStarted,
          tool_calls: [...mcpToolCallsResolved],
          hasToolCalls: true,
          tool_call_current: current,
          toolCallsDone: false,
          isComplete: false,
        } as ChatMessage;
      }
    }

    if (part.done) {
      if (msg?.tool_calls?.length) {
        mcpToolCallsResolved = normalizeOllamaToolCalls(msg.tool_calls);
        sawToolCall = mcpToolCallsResolved.length > 0;
      }

      if (sawToolCall && mcpToolCallsResolved.length > 0) {
        if (!areToolCallArgumentsJsonComplete(mcpToolCallsResolved)) {
          continue;
        }
        yield yieldToolCompletion(role, reasoning, contentStarted, mcpToolCallsResolved);
        turnCompleted = true;
        return;
      }

      const thinking = (msg?.thinking ?? '').trim();
      if (!content.trim() && thinking) {
        content = thinking;
      }

      yield yieldTextCompletion(role, content, reasoning, contentStarted);
      turnCompleted = true;
    }
  }

  if (sawToolCall && mcpToolCallsResolved.length > 0 && !turnCompleted) {
    if (areToolCallArgumentsJsonComplete(mcpToolCallsResolved)) {
      yield yieldToolCompletion(role, reasoning, contentStarted, mcpToolCallsResolved);
    }
  }
}
