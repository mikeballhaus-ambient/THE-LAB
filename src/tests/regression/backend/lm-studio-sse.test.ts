import { describe, expect, test } from '@jest/globals';
import { readOpenAiCompatChatCompletionSse } from '@/backend/ai/providers/lm-studio/lm-studio-sse';

async function collectSseEvents(sse: string): Promise<Record<string, unknown>[]> {
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(sse));
      controller.close();
    },
  });
  const events: Record<string, unknown>[] = [];
  for await (const event of readOpenAiCompatChatCompletionSse(stream)) {
    events.push(event);
  }
  return events;
}

describe('readOpenAiCompatChatCompletionSse', () => {
  test('parses data lines and stops on [DONE]', async () => {
    const events = await collectSseEvents(
      'data: {"choices":[{"delta":{"content":"Hi"}}]}\n\n' +
        'data: {"choices":[{"delta":{"content":" there"}}]}\n\n' +
        'data: [DONE]\n\n',
    );
    expect(events).toHaveLength(2);
    expect(events[0]).toEqual({ choices: [{ delta: { content: 'Hi' } }] });
  });

  test('ignores comment and blank lines', async () => {
    const events = await collectSseEvents(': ping\n\ndata: {"id":"1"}\n\n');
    expect(events).toHaveLength(1);
    expect(events[0]).toEqual({ id: '1' });
  });
});
