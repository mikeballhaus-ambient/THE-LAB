import { describe, expect, test } from '@jest/globals';
import { streamOpenAiCompatEventsToChatMessages } from '@/backend/ai/providers/shared/open-ai-compat-chat-stream';

async function collect<T>(gen: AsyncGenerator<T>): Promise<T[]> {
  const out: T[] = [];
  for await (const item of gen) {
    out.push(item);
  }
  return out;
}

describe('open-ai-compat-chat-stream', () => {
  test('streams text deltas then completion', async () => {
    async function* events() {
      yield {
        choices: [{ delta: { content: 'Hello' } }],
      };
      yield {
        choices: [{ delta: { content: ' world' } }],
      };
      yield {
        choices: [{ finish_reason: 'stop' }],
      };
    }

    const chunks = await collect(streamOpenAiCompatEventsToChatMessages(events(), {}));
    const deltas = chunks.filter((c) => !c.isComplete);
    expect(deltas.map((d) => d.content)).toEqual(['Hello', ' world']);
    expect(chunks.some((c) => c.isComplete && c.content === 'Hello world')).toBe(true);
  });
});
