/**
 * Session todo lists (Laboratory top overlay) vs neural-memory todos (`nmem_todo`).
 * Descriptions are shown to the LLM in tool schemas — keep explicit about UI vs memory.
 */

/** Platform MCP ids — every persona must expose these (not disableable via persona-tools-config). */
export const LAB_SESSION_TODO_TOOL_IDS = [
  'todo_list_create_list',
  'todo_list_add_todo_item',
  'todo_list_update_todo_item',
  'todo_list_mark_todo_item_completed',
  'todo_list_mark_todo_item_incomplete',
  'todo_list_complete_todo_list',
  'todo_list_get_todo_list_state',
  'todo_list_list_todo_lists',
  'todo_list_remove_todo_list',
  'todo_list_remove_todo_item',
] as const;

export type LabSessionTodoToolId = (typeof LAB_SESSION_TODO_TOOL_IDS)[number];

export function mergePersonaUniversalTools(toolIds: readonly string[]): string[] {
  return Array.from(new Set([...toolIds, ...LAB_SESSION_TODO_TOOL_IDS]));
}

export function isLabSessionTodoToolId(toolId: string): toolId is LabSessionTodoToolId {
  return (LAB_SESSION_TODO_TOOL_IDS as readonly string[]).includes(toolId);
}

export const LAB_SESSION_TODO_VS_NEURAL_MEMORY_HINT =
  'For user-visible in-chat todo lists (Laboratory top overlay), use todo_list_* tools with sessionId — not nmem_todo / neural-memory (cross-session agent memory only).';

export const TODO_LIST_CREATE_LIST_DESC = `Creates a session todo list the user sees in the Laboratory todo overlay (top of chat). ${LAB_SESSION_TODO_VS_NEURAL_MEMORY_HINT} List starts empty; follow with todo_list_add_todo_item.`;

export const TODO_LIST_ADD_TODO_ITEM_DESC = `Adds an item to a session todo list (Lab UI overlay). ${LAB_SESSION_TODO_VS_NEURAL_MEMORY_HINT} Optionally attach a code task (type, priority, dependencies).`;

export const TODO_LIST_UPDATE_TODO_ITEM_DESC = `Updates an item on a session todo list (Lab UI). ${LAB_SESSION_TODO_VS_NEURAL_MEMORY_HINT}`;

export const TODO_LIST_MARK_TODO_ITEM_COMPLETED_DESC = `Marks a session todo item complete (Lab UI). ${LAB_SESSION_TODO_VS_NEURAL_MEMORY_HINT}`;

export const TODO_LIST_MARK_TODO_ITEM_INCOMPLETE_DESC = `Marks a session todo item incomplete (Lab UI). ${LAB_SESSION_TODO_VS_NEURAL_MEMORY_HINT}`;

export const TODO_LIST_COMPLETE_TODO_LIST_DESC = `Marks a session todo list completed (Lab UI). ${LAB_SESSION_TODO_VS_NEURAL_MEMORY_HINT}`;

export const TODO_LIST_GET_TODO_LIST_STATE_DESC = `Returns full state of a session todo list for this chat (Lab UI). Use when the user asks to list or review todos — not nmem_context. ${LAB_SESSION_TODO_VS_NEURAL_MEMORY_HINT}`;

export const TODO_LIST_LIST_TODO_LISTS_DESC = `Lists session todo lists for the current chat (Lab UI overlay). Use when the user asks what todos exist in this conversation. ${LAB_SESSION_TODO_VS_NEURAL_MEMORY_HINT}`;

export const TODO_LIST_REMOVE_TODO_LIST_DESC = `Removes a session todo list from the Lab UI. ${LAB_SESSION_TODO_VS_NEURAL_MEMORY_HINT}`;

export const TODO_LIST_REMOVE_TODO_ITEM_DESC = `Removes one item from a session todo list (Lab UI). ${LAB_SESSION_TODO_VS_NEURAL_MEMORY_HINT}`;
