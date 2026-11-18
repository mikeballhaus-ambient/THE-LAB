import { resolveTodoListOperation, isTodoListToolName } from '@/shared/mcp/todo-list-operation';
import type { MCPToolCall, MCPToolResponse } from '@/shared/types';

describe('resolveTodoListOperation', () => {
  const toolCall = (name: string): MCPToolCall => ({
    id: 'tc-1',
    type: 'function',
    function: { name, arguments: '{}' },
  });

  test('maps todo_list_create_list to create_list', () => {
    expect(resolveTodoListOperation(toolCall('todo_list_create_list'))).toBe('create_list');
  });

  test('maps todo_list_add_todo_item to add_todo_item', () => {
    expect(resolveTodoListOperation(toolCall('todo_list_add_todo_item'))).toBe('add_todo_item');
  });

  test('honours legacy toolResult.function from persona seeds', () => {
    const result = {
      type: 'tool_result',
      tool_call_id: 'x',
      function: 'create_list',
      success: true,
      content: '{}',
    } as MCPToolResponse;
    expect(resolveTodoListOperation(toolCall('todo_list_create_list'), result)).toBe('create_list');
  });

  test('isTodoListToolName', () => {
    expect(isTodoListToolName('todo_list_create_list')).toBe(true);
    expect(isTodoListToolName('nmem_todo')).toBe(false);
  });
});
