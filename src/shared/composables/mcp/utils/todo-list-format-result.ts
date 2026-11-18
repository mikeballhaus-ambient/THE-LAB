import {
  createListSchemaFields,
  addTodoItemSchemaFields,
  updateTodoItemSchemaFields,
  markTodoItemCompletedSchemaFields,
  markTodoItemIncompleteSchemaFields,
  completeTodoListSchemaFields,
  getTodoListStateSchemaFields,
  listTodoListsSchemaFields,
  removeTodoListSchemaFields,
  removeTodoItemSchemaFields,
} from '../../../../shared/types/schemas/todo-list-schema';
import type { ZodSafeParseResult } from 'zod';
import { MCPToolCall, MCPToolResponse } from '../../../../shared/types';
import { resolveTodoListOperation } from '@/shared/mcp/todo-list-operation';

export function formatToDoListToolResult(
  toolResultContainerClasses: string,
  toolCall: MCPToolCall,
  toolResult: MCPToolResponse
): string {
  let todoListResult: Record<string, unknown> | undefined;

  try {
    todoListResult = JSON.parse(toolResult.content) as Record<string, unknown>;
  } catch {
    todoListResult = undefined;
  }

  const toolParams = JSON.parse(toolCall.function.arguments || '{}');
  const operation = resolveTodoListOperation(toolCall, toolResult);

  let htmlOutput = `<div class="${toolResultContainerClasses}"><div class="font-bold text-lab-general-text">Todo List Result</div><div class="text-lab-general-text">`;

  // Determine which schema to use based on the operation
  let paramsResult: ZodSafeParseResult<Record<string, unknown>>;
  switch (operation) {
    case 'create_list':
      paramsResult = createListSchemaFields.safeParse(toolParams);
      break;
    case 'add_todo_item':
      paramsResult = addTodoItemSchemaFields.safeParse(toolParams);
      break;
    case 'update_todo_item':
      paramsResult = updateTodoItemSchemaFields.safeParse(toolParams);
      break;
    case 'mark_todo_item_completed':
      paramsResult = markTodoItemCompletedSchemaFields.safeParse(toolParams);
      break;
    case 'mark_todo_item_incomplete':
      paramsResult = markTodoItemIncompleteSchemaFields.safeParse(toolParams);
      break;
    case 'complete_todo_list':
      paramsResult = completeTodoListSchemaFields.safeParse(toolParams);
      break;
    case 'get_todo_list_state':
      paramsResult = getTodoListStateSchemaFields.safeParse(toolParams);
      break;
    case 'list_todo_lists':
      paramsResult = listTodoListsSchemaFields.safeParse(toolParams);
      break;
    case 'remove_todo_list':
      paramsResult = removeTodoListSchemaFields.safeParse(toolParams);
      break;
    case 'remove_todo_item':
      paramsResult = removeTodoItemSchemaFields.safeParse(toolParams);
      break;
    default:
      htmlOutput += `<div class="text-red-400 mt-2">Unknown operation: ${operation}</div>`;
      return htmlOutput + '</div></div>';
  }

  if (!paramsResult.success) {
    htmlOutput += `<div class="text-red-400 mt-2">Parameter validation error: ${paramsResult.error.issues[0]?.message || 'Unknown error'}</div>`;
    return htmlOutput + '</div></div>';
  }

  const data = paramsResult.data;

  // Display session ID and operation info
  htmlOutput += `<div>Session ID: <code class="bg-lab-general-bg-muted px-1 py-0.5 rounded text-lab-general-text">${data.sessionId || 'N/A'}</code></div>`;
  htmlOutput += `<div>Operation: <strong>${operation}</strong></div>`;

  if (!toolResult.success) {
    htmlOutput += `<div class="text-red-400 mt-2">Error: ${toolResult.content}</div>`;
    return htmlOutput + '</div></div>';
  }

  // Display operation-specific result
  switch (operation) {
    case 'create_list':
      if (todoListResult) {
        htmlOutput += `<div class="text-green-400 mt-2">✓ List created: "${data.name}" (ID: ${data.todoListId})</div>`;
      } else {
        htmlOutput += `<div class="text-yellow-400 mt-2">✓ List creation initiated</div>`;
      }
      break;

    case 'add_todo_item':
      if (todoListResult) {
        const itemText = todoListResult.item || data.item || 'New item';
        htmlOutput += `<div class="text-green-400 mt-2">✓ Item added: "${itemText}" (ID: ${data.itemId})</div>`;
      } else {
        htmlOutput += `<div class="text-yellow-400 mt-2">✓ Item addition initiated</div>`;
      }
      break;

    case 'update_todo_item':
      if (todoListResult) {
        const itemText = todoListResult.item || data.item || 'Updated item';
        htmlOutput += `<div class="text-green-400 mt-2">✓ Item updated: "${itemText}" (ID: ${data.itemId})</div>`;
      } else {
        htmlOutput += `<div class="text-yellow-400 mt-2">✓ Item update initiated</div>`;
      }
      break;

    case 'mark_todo_item_completed':
      if (todoListResult) {
        htmlOutput += `<div class="text-green-400 mt-2">✓ Item marked as completed (ID: ${data.itemId})</div>`;
      } else {
        htmlOutput += `<div class="text-yellow-400 mt-2">✓ Mark complete initiated</div>`;
      }
      break;

    case 'mark_todo_item_incomplete':
      if (todoListResult) {
        htmlOutput += `<div class="text-green-400 mt-2">✓ Item marked as incomplete (ID: ${data.itemId})</div>`;
      } else {
        htmlOutput += `<div class="text-yellow-400 mt-2">✓ Mark incomplete initiated</div>`;
      }
      break;

    case 'complete_todo_list':
      if (todoListResult) {
        htmlOutput += `<div class="text-green-400 mt-2">✓ Todo list completed (ID: ${data.todoListId})</div>`;
      } else {
        htmlOutput += `<div class="text-yellow-400 mt-2">✓ Complete list initiated</div>`;
      }
      break;

    case 'get_todo_list_state':
      if (todoListResult) {
        const items = todoListResult.items;
        const itemCount = Array.isArray(items) ? items.length : 0;
        htmlOutput += `<div class="text-green-400 mt-2">✓ List state retrieved: ${itemCount} items (ID: ${data.todoListId})</div>`;
      } else {
        htmlOutput += `<div class="text-yellow-400 mt-2">✓ State retrieval initiated</div>`;
      }
      break;

    case 'list_todo_lists':
      if (todoListResult && Array.isArray(todoListResult.lists)) {
        htmlOutput += `<div><strong>Todo Lists (${todoListResult.lists.length}):</strong></div>`;
        (todoListResult.lists as Record<string, unknown>[]).forEach((list, index) => {
          const items = Array.isArray(list.items) ? list.items as Record<string, unknown>[] : [];
          const itemCount = items.length;
          const completedCount = items.filter((i) => i.completed).length;
          htmlOutput += `<div class="mt-2"><strong>${index + 1}. ${list.name}</strong> - ${itemCount} items (${completedCount} completed)</div>`;
        });
      } else {
        htmlOutput += `<div class="text-yellow-400 mt-2">✓ List retrieval initiated</div>`;
      }
      break;

    case 'remove_todo_list':
      if (todoListResult) {
        htmlOutput += `<div class="text-green-400 mt-2">✓ Todo list removed (ID: ${data.todoListId})</div>`;
      } else {
        htmlOutput += `<div class="text-yellow-400 mt-2">✓ Remove list initiated</div>`;
      }
      break;

    case 'remove_todo_item':
      if (todoListResult) {
        htmlOutput += `<div class="text-green-400 mt-2">✓ Todo item removed (ID: ${data.itemId})</div>`;
      } else {
        htmlOutput += `<div class="text-yellow-400 mt-2">✓ Remove item initiated</div>`;
      }
      break;

    default:
      htmlOutput += `<div class="text-yellow-400 mt-2">Operation completed: ${operation}</div>`;
  }

  return htmlOutput + '</div></div>';
}
