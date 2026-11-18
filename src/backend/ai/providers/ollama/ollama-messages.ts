import type { Message } from 'ollama';
import type { ChatMessage } from '@/shared/types';
import { parseToolCallArgumentsJson } from '@/shared/utils/chat-tool-calls';

function toOllamaToolArguments(
  raw: string | Record<string, unknown> | undefined,
): Record<string, unknown> {
  const parsed = parseToolCallArgumentsJson(raw);
  if (parsed.success) {
    return parsed.value;
  }
  return {};
}

/**
 * Ollama native `/api/chat` expects `tool_calls[].function.arguments` as objects.
 * THE-LAB stores OpenAI-style stringified JSON in conversation history.
 */
export function normalizeMessagesForOllamaChat(messages: ChatMessage[]): Message[] {
  return messages.map((msg) => {
    if (msg.role === 'assistant' && msg.tool_calls?.length) {
      return {
        role: 'assistant',
        content: typeof msg.content === 'string' ? msg.content : '',
        tool_calls: msg.tool_calls.map((tc) => ({
          id: tc.id,
          type: tc.type ?? 'function',
          function: {
            name: tc.function.name,
            arguments: toOllamaToolArguments(
              tc.function.arguments as string | Record<string, unknown> | undefined,
            ),
          },
        })),
      } as Message;
    }

    if (msg.role === 'tool') {
      const content =
        typeof msg.content === 'string'
          ? msg.content
          : msg.content != null
            ? JSON.stringify(msg.content)
            : '';
      return {
        role: 'tool',
        content,
        ...(msg.tool_call_id ? { tool_call_id: msg.tool_call_id } : {}),
      } as Message;
    }

    const base: Message = {
      role: msg.role as Message['role'],
      content: typeof msg.content === 'string' ? msg.content : '',
    };

    if (msg.role === 'user' && Array.isArray((msg as ChatMessage & { images?: string[] }).images)) {
      (base as Message & { images?: string[] }).images = (
        msg as ChatMessage & { images?: string[] }
      ).images;
    }

    return base;
  });
}
