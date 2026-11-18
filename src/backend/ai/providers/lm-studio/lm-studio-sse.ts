/**
 * OpenAI-compatible chat completion SSE (used by LM Studio v0 chat/completions with stream: true).
 */
export async function* readOpenAiCompatChatCompletionSse(
  body: ReadableStream<Uint8Array> | null,
): AsyncGenerator<Record<string, unknown>> {
  if (!body) {
    return;
  }

  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith(':')) {
          continue;
        }
        if (!trimmed.startsWith('data:')) {
          continue;
        }
        const data = trimmed.slice(5).trim();
        if (data === '[DONE]') {
          return;
        }
        try {
          yield JSON.parse(data) as Record<string, unknown>;
        } catch {
          // ignore malformed chunks
        }
      }
    }

    const tail = buffer.trim();
    if (tail.startsWith('data:')) {
      const data = tail.slice(5).trim();
      if (data && data !== '[DONE]') {
        try {
          yield JSON.parse(data) as Record<string, unknown>;
        } catch {
          // ignore
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
