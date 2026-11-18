import {
  resolveStreamingToolCallsForRunner,
  shouldRunStreamingToolRunner,
} from '@/shared/utils/resolve-streaming-tool-calls';
import type { MCPToolCall } from '@/shared/types';

const streamCall: MCPToolCall = {
  id: 'a',
  type: 'function',
  function: { name: 'native_tool', arguments: '{}' },
};

const parsedCall: MCPToolCall = {
  id: 'b',
  type: 'function',
  function: { name: 'leaked_tool', arguments: '{}' },
};

describe('resolveStreamingToolCallsForRunner', () => {
  test('prefers native stream tool calls', () => {
    expect(resolveStreamingToolCallsForRunner([streamCall], [parsedCall])).toEqual([streamCall]);
  });

  test('falls back to parsed tool calls when stream array is empty', () => {
    expect(resolveStreamingToolCallsForRunner([], [parsedCall])).toEqual([parsedCall]);
  });

  test('shouldRunStreamingToolRunner when parsed calls exist', () => {
    expect(shouldRunStreamingToolRunner([parsedCall])).toBe(true);
    expect(shouldRunStreamingToolRunner([])).toBe(false);
  });
});
