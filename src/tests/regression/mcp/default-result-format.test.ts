import { describe, test, expect } from '@jest/globals';
import { formatDefaultResult } from '@/shared/composables/mcp/utils/default-result';
import type { MCPToolCall, MCPToolResponse } from '@/shared/types';

const containerClass = 'test-container';
const toolCall = {
  id: 'call-1',
  type: 'function',
  function: { name: 'unknown_tool', arguments: '{}' },
} as MCPToolCall;

describe('formatDefaultResult', () => {
  test('does not throw when failed tool content is plain MCP error text', () => {
    const toolResult: MCPToolResponse = {
      type: 'tool_result',
      tool_call_id: 'call-1',
      function: 'execute',
      success: false,
      content: 'MCP error -32602: Input validation error: Required',
    };

    expect(() => formatDefaultResult(containerClass, toolCall, toolResult)).not.toThrow();
    const html = formatDefaultResult(containerClass, toolCall, toolResult);
    expect(html).toContain('Error:');
    expect(html).toContain('MCP error -32602');
  });

  test('renders plain text success content without JSON.parse', () => {
    const toolResult: MCPToolResponse = {
      type: 'tool_result',
      tool_call_id: 'call-1',
      function: 'execute',
      success: true,
      content: 'Operation completed.',
    };

    const html = formatDefaultResult(containerClass, toolCall, toolResult);
    expect(html).toContain('Operation completed.');
  });
});
