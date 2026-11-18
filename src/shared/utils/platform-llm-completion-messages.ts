import type { ChatMessage } from '@/shared/types/chat';
import type {
  PlatformLlmCompletionRequest,
  PlatformLlmToolFeedbackTurn,
} from '@/shared/types/platform-llm-completion';

const DEFAULT_RETRY_USER_NUDGE =
  'The server rejected your last tool call (see tool result above). Call the same tool again with a valid move for the board and rack in the first user message.';

/**
 * Builds OpenAI-compat chat messages for platform complete, including prior
 * assistant tool_calls + tool results within the same agent turn.
 */
export function buildPlatformCompletionMessages(body: PlatformLlmCompletionRequest): ChatMessage[] {
  const messages: ChatMessage[] = [
    { role: 'system', content: body.system },
    { role: 'user', content: body.user },
  ];

  appendToolFeedbackTurns(messages, body.toolFeedbackTurns);

  if (body.toolFeedbackTurns?.length) {
    messages.push({
      role: 'user',
      content: body.retryUserHint ?? DEFAULT_RETRY_USER_NUDGE,
    });
  } else if (body.retryUserHint) {
    messages.push({ role: 'user', content: body.retryUserHint });
  }

  return messages;
}

function appendToolFeedbackTurns(
  messages: ChatMessage[],
  turns: PlatformLlmToolFeedbackTurn[] | undefined,
): void {
  if (!turns?.length) {
    return;
  }
  for (const turn of turns) {
    messages.push({
      role: 'assistant',
      content: '',
      tool_calls: [
        {
          id: turn.toolCallId,
          type: 'function',
          function: {
            name: turn.toolName,
            arguments: turn.arguments,
          },
        },
      ],
    });
    messages.push({
      role: 'tool',
      tool_call_id: turn.toolCallId,
      content: turn.resultContent,
    });
  }
}
