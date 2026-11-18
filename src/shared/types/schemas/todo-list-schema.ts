import { z } from 'zod';
import { CodeOperationAction, CodeTaskType, TaskPriority } from '../todo-list';

// Shared parameters for all todo list operations
export const sharedParamsSchema = z.object({
  sessionId: z.string().describe('The chat session ID. Required for all operations to scope todo lists per session.'),
  parentSessionId: z.string().optional().describe('The parent chat session ID that initiated this todo list.')
});

// ==========================================
// TOOL 1: Create List
// ==========================================
export const createListSchemaFields = sharedParamsSchema.extend({
  name: z.string().describe('The name of the todo list. Required for create_list operation.'),
  todoListId: z.string().describe('The ID of the todo list (UUID v4). Required for create_list operation.'),
});

/**
 * TodoItemCodeTaskSchema: Zod schema for code task validation.
 * Validates all fields conform to expected types and constraints.
 */
export const TodoItemCodeTaskSchema = z.object({
  taskId: z.string().describe('Unique UUID for this code task'),
  description: z.string().min(1).max(5000).describe('Human-readable description'),
  type: z.enum(CodeTaskType).optional().describe('Type of code operation to perform'),
  filePath: z.string().optional().describe('Relative path in workspace'),
  codeContent: z.string().optional().describe('Full code to create or replace'),
  // FLATTENED OPERATION RANGE (replacing nested object):
  operationRangeStartLine: z.number().int().positive().min(1).optional(),
  operationRangeEndLine: z.number().int().positive().optional(),
  operationAction: z.enum(CodeOperationAction).optional().describe('Action type for content modification'),
  priority: z.enum(TaskPriority).default(TaskPriority.MEDIUM).optional().describe('Execution priority'),
  dependencies: z.array(z.string()).optional().describe('Array of other TodoItem.itemId values that must complete before this task runs'),
  persona: z.string().describe('Target persona for code execution. Valid values: Chat, Orchestrator, Architect, Code, Debug, QA (or any user-created persona)')
}).refine(
  (data) => {
    if (!data.operationRangeStartLine || !data.operationRangeEndLine) return true;
    return data.operationRangeEndLine >= data.operationRangeStartLine;
  },
  {
    message: "operationRangeEndLine must be >= operationRangeStartLine"
  }
);

export type TodoItemCodeTaskSchemaItem = z.infer<typeof TodoItemCodeTaskSchema>;

// ==========================================
// TOOL 2: Add Todo Item
// ==========================================
export const addTodoItemSchemaFields = sharedParamsSchema.extend({
  todoListId: z.string().describe('The ID of the todo list (UUID v4). Required for add_todo_item operation.'),
  itemId: z.string().describe('The ID of the todo item (UUID v4). Required for add_todo_item operation.'),
  item: z.string().describe('The text of the todo item. Required for add_todo_item operation.'),
  itemData: z.string().describe('The detailed descriptions of the todo item. Required for add_todo_item operation.'),
  limit: z.number().optional().describe('Maximum number of todo lists to return. Optional and only used with list_todo_lists.'),
  task: z.object(TodoItemCodeTaskSchema).optional().describe('An optional task assignment')
});

// ==========================================
// TOOL 3: Update Todo Item
// ==========================================
export const updateTodoItemSchemaFields = sharedParamsSchema.extend({
  todoListId: z.string().describe('The ID of the todo list (UUID v4). Required for update_todo_item operation.'),
  itemId: z.string().describe('The ID of the todo item (UUID v4). Required for update_todo_item operation.'),
  item: z.string().describe('The updated text of the todo item. Required for update_todo_item operation.'),
  itemData: z.string().describe('The updated detailed descriptions of the todo item. Required for update_todo_item operation.'),
  task: z.object(TodoItemCodeTaskSchema).optional().describe('An optional task assignment')
});

// ==========================================
// TOOL 4: Mark Todo Item Completed
// ==========================================
export const markTodoItemCompletedSchemaFields = sharedParamsSchema.extend({
  todoListId: z.string().describe('The ID of the todo list (UUID v4). Required for mark_todo_item_completed operation.'),
  itemId: z.string().describe('The ID of the todo item (UUID v4). Required for mark_todo_item_completed operation.'),
});

// ==========================================
// TOOL 5: Mark Todo Item Incomplete
// ==========================================
export const markTodoItemIncompleteSchemaFields = sharedParamsSchema.extend({
  todoListId: z.string().describe('The ID of the todo list (UUID v4). Required for mark_todo_item_incomplete operation.'),
  itemId: z.string().describe('The ID of the todo item (UUID v4). Required for mark_todo_item_incomplete operation.'),
});

// ==========================================
// TOOL 6: Complete Todo List
// ==========================================
export const completeTodoListSchemaFields = sharedParamsSchema.extend({
  todoListId: z.string().describe('The ID of the todo list (UUID v4). Required for complete_todo_list operation.'),
});

// ==========================================
// TOOL 7: Get Todo List State
// ==========================================
export const getTodoListStateSchemaFields = sharedParamsSchema.extend({
  todoListId: z.string().describe('The ID of the todo list (UUID v4). Required for get_todo_list_state operation.'),
});

// ==========================================
// TOOL 8: List Todo Lists
// ==========================================
export const listTodoListsSchemaFields = sharedParamsSchema.extend({
  limit: z.number().optional().describe('Maximum number of todo lists to return. Optional and only used with list_todo_lists.'),
});

// ==========================================
// TOOL 9: Remove Todo List
// ==========================================
export const removeTodoListSchemaFields = sharedParamsSchema.extend({
  todoListId: z.string().describe('The ID of the todo list (UUID v4). Required for remove_todo_list operation.'),
});

// ==========================================
// TOOL 10: Remove Todo Item
// ==========================================
export const removeTodoItemSchemaFields = sharedParamsSchema.extend({
  todoListId: z.string().describe('The ID of the todo list (UUID v4). Required for remove_todo_item operation.'),
  itemId: z.string().describe('The ID of the todo item (UUID v4). Required for remove_todo_item operation.'),
});
