import { describe, expect, test } from '@jest/globals';
import {
  areToolCallArgumentsJsonComplete,
  coerceToolCallParamsForExecution,
  mergeToolCallArgumentsJson,
  parseToolCallArgumentsJson,
} from '@/shared/utils/chat-tool-calls';
import type { MCPToolCall } from '@/shared/types';

describe('parseToolCallArgumentsJson', () => {
  test('rejects empty arguments', () => {
    const result = parseToolCallArgumentsJson('');
    expect(result.success).toBe(false);
  });

  test('accepts valid JSON object', () => {
    const result = parseToolCallArgumentsJson('{"query":"SELECT 1"}');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.query).toBe('SELECT 1');
    }
  });

  test('areToolCallArgumentsJsonComplete requires parseable args', () => {
    const incomplete: MCPToolCall[] = [
      {
        id: '1',
        type: 'function',
        function: { name: 'read_query', arguments: '{"query":' },
      },
    ];
    expect(areToolCallArgumentsJsonComplete(incomplete)).toBe(false);

    const complete: MCPToolCall[] = [
      {
        id: '1',
        type: 'function',
        function: { name: 'read_query', arguments: '{"query":"SELECT 1"}' },
      },
    ];
    expect(areToolCallArgumentsJsonComplete(complete)).toBe(true);
  });

  test('coerceToolCallParamsForExecution maps sql alias to query', () => {
    const coerced = coerceToolCallParamsForExecution('read_query', { sql: 'SELECT 1' });
    expect(coerced.query).toBe('SELECT 1');
  });

  test('mergeToolCallArgumentsJson merges object fragments', () => {
    const merged = mergeToolCallArgumentsJson('', { query: 'SELECT 1' });
    expect(JSON.parse(merged)).toEqual({ query: 'SELECT 1' });
  });

  test('read_query rejects empty object until query is present', () => {
    const calls: MCPToolCall[] = [
      {
        id: '1',
        type: 'function',
        function: { name: 'read_query', arguments: '{}' },
      },
    ];
    expect(areToolCallArgumentsJsonComplete(calls)).toBe(false);
  });
});
