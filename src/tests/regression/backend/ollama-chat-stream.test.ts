import { describe, expect, test } from '@jest/globals';
import { streamOllamaPartsToChatMessages } from '@/backend/ai/providers/ollama/ollama-chat-stream';
import { mergeOllamaStreamToolCalls, normalizeOllamaToolCalls } from '@/backend/ai/providers/ollama/ollama-tool-calls';

async function collect<T>(gen: AsyncGenerator<T>): Promise<T[]> {
  const out: T[] = [];
  for await (const item of gen) {
    out.push(item);
  }
  return out;
}

describe('ollama-tool-calls', () => {
  test('normalizeOllamaToolCalls maps function calls', () => {
    const calls = normalizeOllamaToolCalls([
      {
        id: 'call_1',
        function: { name: 'read_file', arguments: { filePath: 'a.txt' } },
      },
    ]);
    expect(calls).toHaveLength(1);
    expect(calls[0].function.name).toBe('read_file');
    expect(JSON.parse(calls[0].function.arguments as string)).toEqual({ filePath: 'a.txt' });
  });

  test('mergeOllamaStreamToolCalls accumulates argument fragments', () => {
    let merged: ReturnType<typeof mergeOllamaStreamToolCalls>['merged'] = [];
    ({ merged } = mergeOllamaStreamToolCalls(merged, [
      { function: { name: 'todo_list', arguments: '{"op"' } },
    ]));
    ({ merged } = mergeOllamaStreamToolCalls(merged, [
      { function: { name: 'todo_list', arguments: ':"create"}' } },
    ]));
    expect(merged[0].function.name).toBe('todo_list');
    expect(JSON.parse(merged[0].function.arguments as string)).toEqual({ op: 'create' });
  });
});

describe('ollama-chat-stream', () => {
  test('streams tool call completion on done chunk', async () => {
    async function* parts() {
      yield {
        message: {
          role: 'assistant',
          content: '',
          tool_calls: [
            {
              id: 'call_abc',
              function: {
                name: 'read_file',
                arguments: { filePath: 'src/main.ts' },
              },
            },
          ],
        },
        done: true,
        eval_count: 42,
      };
    }

    const chunks = await collect(streamOllamaPartsToChatMessages(parts(), {}));
    const final = chunks.find((c) => c.isComplete);
    expect(final?.doneReason).toBe('tool_calls');
    expect(final?.tool_calls).toHaveLength(1);
    expect(final?.tool_calls?.[0].function.name).toBe('read_file');
    expect(final?.content).toBe('');
  });

  test('streams text deltas then completion', async () => {
    async function* parts() {
      yield { message: { role: 'assistant', content: 'Hi' } };
      yield { message: { role: 'assistant', content: ' there' }, done: true };
    }

    const chunks = await collect(streamOllamaPartsToChatMessages(parts(), {}));
    const deltas = chunks.filter((c) => !c.isComplete);
    expect(deltas.map((d) => d.content)).toEqual(['Hi', ' there']);
    expect(chunks.some((c) => c.isComplete && c.content === 'Hi there')).toBe(true);
  });
});
