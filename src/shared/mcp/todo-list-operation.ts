import type { MCPToolCall, MCPToolResponse } from '@/shared/types';

const TODO_LIST_TOOL_PREFIX = 'todo_list_';

/**
 * Resolves the todo-list handler operation id for UI + formatters.
 * Built-in tools use ids like `todo_list_create_list`; legacy persona seeds used `create_list` on toolResult.function.
 */
export function resolveTodoListOperation(
  toolCall: MCPToolCall,
  toolResult?: MCPToolResponse,
): string {
  const toolName = toolCall.function.name;
  if (toolName.startsWith(TODO_LIST_TOOL_PREFIX)) {
    return toolName.slice(TODO_LIST_TOOL_PREFIX.length);
  }
  const legacy = toolResult?.function;
  if (legacy && legacy !== 'execute') {
    return legacy;
  }
  return toolName;
}

export function isTodoListToolName(toolName: string): boolean {
  return toolName === 'todo_list' || toolName.startsWith(TODO_LIST_TOOL_PREFIX);
}
