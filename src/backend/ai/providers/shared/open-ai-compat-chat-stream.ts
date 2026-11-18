import type { ChatMessage, ChatRole, DoneReason, MCPToolCall } from '@/shared/types';
import { chatUtils } from '@/backend/utils/chat/utils';
import {
  areToolCallArgumentsJsonComplete,
  mergeToolCallArgumentsJson,
} from '@/shared/utils/chat-tool-calls';

/** Shape of one OpenAI-compatible chat completion stream JSON object (SSE or SDK). */
export type OpenAiCompatStreamEvent = {
  usage?: { total_tokens?: number };
  choices?: Array<{
    delta?: {
      role?: string;
      content?: string | null;
      reasoning_content?: string;
      reasoning?: string;
      thinking?: string;
      tool_calls?: Array<{
        index?: number;
        id?: string;
        type?: string;
        function?: { name?: string; arguments?: string };
      }>;
    };
    finish_reason?: string | null;
  }>;
};

export type OpenAiCompatStreamOptions = {
  maxContext?: number;
  shouldStop?: () => boolean;
};

function defaultShouldStop(): boolean {
  return chatUtils.isPendingRequestStop();
}

function reasoningDeltaText(delta: NonNullable<OpenAiCompatStreamEvent['choices']>[0]['delta']): string {
  if (!delta) {
    return '';
  }
  if (typeof delta.reasoning_content === 'string' && delta.reasoning_content) {
    return delta.reasoning_content;
  }
  if (typeof delta.reasoning === 'string' && delta.reasoning) {
    return delta.reasoning;
  }
  if (typeof delta.thinking === 'string' && delta.thinking) {
    return delta.thinking;
  }
  return '';
}

function resolveDoneReason(finishReason: string | null | undefined, sawToolCall: boolean): DoneReason {
  if (finishReason === 'content_filter') {
    return 'content_filter';
  }
  if (finishReason === 'tool_calls' || sawToolCall) {
    return 'tool_calls';
  }
  return 'stop';
}

function yieldCompletion(
  state: {
    role: ChatRole;
    content: string;
    reasoning: string;
    contentStarted: boolean;
    sawToolCall: boolean;
    mcpToolCallsResolved: MCPToolCall[];
    contextUsed: number;
  },
  doneReason: DoneReason,
): ChatMessage {
  return {
    role: state.role,
    content: state.content,
    reasoning: state.reasoning,
    contentStarted: state.contentStarted,
    tool_calls: [...state.mcpToolCallsResolved],
    hasToolCalls: state.sawToolCall,
    doneReason,
    isComplete: true,
    toolCallsDone: true,
    contextUsed: state.contextUsed,
  } as ChatMessage;
}

/**
 * Maps OpenAI-compatible stream events to THE-LAB ChatMessage chunks for StreamChatManager.
 */
export async function* streamOpenAiCompatEventsToChatMessages(
  events: AsyncIterable<OpenAiCompatStreamEvent>,
  options: OpenAiCompatStreamOptions = {},
): AsyncGenerator<ChatMessage> {
  const maxContext = options.maxContext;
  const shouldStop = options.shouldStop ?? defaultShouldStop;

  let role: ChatRole = 'assistant';
  let content = '';
  let reasoning = '';
  let contentStarted = false;
  let sawToolCall = false;
  const mcpToolCallsResolved: MCPToolCall[] = [];
  let contextUsed = 0;
  let toolCallsTurnCompleted = false;

  for await (const event of events) {
    if (shouldStop()) {
      break;
    }

    const usage = event.usage;
    if (usage?.total_tokens && maxContext && maxContext > 0) {
      contextUsed = Number(((usage.total_tokens / maxContext) * 100).toFixed(4));
    }

    const choice = event.choices?.[0];
    if (!choice) {
      continue;
    }

    const delta = choice.delta;
    if (!delta) {
      if (choice.finish_reason) {
        if (sawToolCall && !areToolCallArgumentsJsonComplete(mcpToolCallsResolved)) {
          continue;
        }
        yield yieldCompletion(
          { role, content, reasoning, contentStarted, sawToolCall, mcpToolCallsResolved, contextUsed },
          resolveDoneReason(choice.finish_reason, sawToolCall),
        );
        toolCallsTurnCompleted = true;
      }
      continue;
    }

    if (delta.role) {
      role = delta.role as ChatRole;
    }

    const reasoningDelta = reasoningDeltaText(delta);
    if (reasoningDelta) {
      reasoning += reasoningDelta;
      yield {
        role,
        content: '',
        reasoning: reasoningDelta,
        contentStarted,
        tool_calls: [],
        doneReason: undefined,
        isComplete: false,
        contextUsed,
      } as ChatMessage;
    }

    if (delta.content) {
      content += delta.content;
      contentStarted = true;
      yield {
        role,
        content: delta.content,
        reasoning,
        contentStarted,
        tool_calls: [],
        doneReason: undefined,
        isComplete: false,
        contextUsed,
      } as ChatMessage;
    }

    if (delta.tool_calls?.length) {
      sawToolCall = true;
      for (const tc of delta.tool_calls) {
        const index = tc.index ?? 0;
        if (!mcpToolCallsResolved[index]) {
          mcpToolCallsResolved[index] = {
            id: tc.id ?? '',
            type: 'function',
            function: { name: '', arguments: '' },
          };
        }
        const existing = mcpToolCallsResolved[index];
        if (tc.id) {
          existing.id = tc.id;
        }
        if (tc.function) {
          if (tc.function.name) {
            existing.function.name = tc.function.name;
          }
          if (tc.function.arguments !== undefined && tc.function.arguments !== null) {
            existing.function.arguments = mergeToolCallArgumentsJson(
              existing.function.arguments ?? '',
              tc.function.arguments,
            );
          }
        }
        yield {
          role,
          content,
          reasoning,
          contentStarted,
          tool_calls: [...mcpToolCallsResolved],
          hasToolCalls: true,
          tool_call_current: existing,
          doneReason: undefined,
          toolCallsDone: false,
          isComplete: false,
          contextUsed,
        } as ChatMessage;
      }
    }

    if (choice.finish_reason) {
      if (sawToolCall && !areToolCallArgumentsJsonComplete(mcpToolCallsResolved)) {
        continue;
      }
      yield yieldCompletion(
        { role, content, reasoning, contentStarted, sawToolCall, mcpToolCallsResolved, contextUsed },
        resolveDoneReason(choice.finish_reason, sawToolCall),
      );
      toolCallsTurnCompleted = true;
    }
  }

  if (sawToolCall && mcpToolCallsResolved.length > 0 && !toolCallsTurnCompleted) {
    if (areToolCallArgumentsJsonComplete(mcpToolCallsResolved)) {
      yield yieldCompletion(
        { role, content, reasoning, contentStarted, sawToolCall, mcpToolCallsResolved, contextUsed },
        'tool_calls',
      );
    } else {
      yield yieldCompletion(
        {
          role,
          content,
          reasoning,
          contentStarted,
          sawToolCall: false,
          mcpToolCallsResolved: [],
          contextUsed,
        },
        'stop',
      );
    }
  }
}
