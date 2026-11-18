import { z } from 'zod';
import { MCPToolResponse, addTodoItemSchemaFields, TodoItemCodeTaskSchemaItem } from '../../../../../shared/types';

export const getFormattedValidationErrors = (error: z.ZodError): MCPToolResponse => {
  const fieldErrors = error.issues.map((issue: z.ZodIssue) => {
    const path = issue.path.join('.');
    const message = issue.message;
    return `${path}: ${message}`;
  });

  const fullError = `Validation failed. The following parameter errors were detected:\n\n${fieldErrors.join('\n')}`.trim();

  return {
    type: 'tool_result',
    tool_call_id: 'persona_manager',
    function: 'execute',
    content: `${fullError}\n\nThe agent should review the schema requirements for the chosen operation and resubmit with valid parameters.`,
    success: false
  } as MCPToolResponse;
}

export const validateTodos = (todoListId?: string, todoListName?: string, todoItemId?: string, todoItem?: string, todoItemData?: string, todoItemTask?: TodoItemCodeTaskSchemaItem | null | undefined): { error: string | null, valid: boolean } => {
  if (!todoListId) {
    return { error: null, valid: true };
  } else {

        // Validate s
    if (!todoListName) {
      return {
        error: `Error: Todo item is missing required 'todoListName' field.`,
        valid: false
      };
    }

    // Validate itemId
    if (!todoItemId) {
      return {
        error: `Error: Todo item is missing required 'todoItemId' field.`,
        valid: false
      };
    }

    // Validate item
    if (!todoItem) {
      return {
        error: `Error: Todo item with itemId '${todoItemId}' is missing the required 'todoItem' field. The item field should contain a short human-readable task title. Please add a descriptive item title.`,
        valid: false
      };
    }

    // Validate itemData
    if (!todoItemData) {
      return {
        error: `Error: Todo item with itemId '${todoItemId}' is missing the required 'itemData' field. The itemData field should contain detailed task descriptions. Please add detailed item data.`,
        valid: false
      };
    }

    // Validate task if present
    if (todoItemTask) {
      const validatedTask = addTodoItemSchemaFields.safeParse(todoItemTask);
      if (!validatedTask.success) {
        const fields = validatedTask.error.issues.map((issue: z.ZodIssue) => {
          const path = issue.path.join('.');
          const fieldError = issue.message;
          return `${path}: ${fieldError}`.trim();
        }).join('\n');

        return {
          error: `Error: Todo task inside item '${todoItemId}' failed validation. Required fields must be provided:\n\n${fields}\n\nAll task fields should meet these requirements:\n- taskId: Valid UUID string\n- description: Human-readable string\n- type: One of the valid task types (create_file, edit_file, etc.)\n- filePath: Relative path if creating/editing files\n- codeContent: Code string to create or modify\n- operationRangeStartLine: Starting line number (1-indexed)\n- operationRangeEndLine: Ending line number (1-indexed)\n- operationAction: One of create, replace, insert, delete\n- priority: high, medium, or low\n- dependencies: Array of other todoItem.itemId values\n- persona: Chat, Orchestrator, Architect, Code, Debug, or QA\n\nThe agent should review all todo tasks and resubmit with properly formatted values.`,
          valid: false
        };
      }
    }
  }


  return { error: null, valid: true };
}

export const responseUserMessage = (todoListId: string | undefined, success: boolean | undefined, message: string | undefined): string => {
  return `
The agent has completed its task. ${todoListId ? `Todo list ${todoListId} has been completed. ` : ''}
OUTCOME: ${success ? 'SUCCESS' : 'PARTIALLY COMPLETED'}
SUMMARY:
${message ?? ''}
`;
}