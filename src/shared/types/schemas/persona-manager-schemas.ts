import { z } from 'zod';

// ==========================================
// TOOL 1: Switch Persona Schema
// ==========================================
export const switchPersonaSchemaFields = z.object({
  sessionId: z.string().describe('REQUIRED Obtained from System Instructions {{sessionId}} context. The session ID to switch the persona for.'),
  targetPersona: z.string().describe('REQUIRED The persona to switch to. Valid values: Chat, Orchestrator, Architect, Code, Debug, QA, or any user created personas')
});

// ==========================================
// TOOL 2: Activate Persona Schema
// ==========================================
export const activatePersonaSchemaFields = z.object({
  userId: z.number().describe('REQUIRED for ALL operations. Obtained from System Instructions {{userId}} context. Agents must use the EXACT value provided in System Instructions.'),
  sessionId: z.string().describe('REQUIRED for ALL operations. Obtained from System Instructions {{sessionId}} context. The originating session ID.'),
  parentPersona: z.string().describe('REQUIRED The persona that is activating this new child session. Valid values: Chat, Orchestrator, Architect, Code, Debug, QA, or any user created personas'),
  targetPersona: z.string().describe('REQUIRED The persona to activate for the new session. Valid values: Chat, Orchestrator, Architect, Code, Debug, QA, or any user created personas'),
  message: z.string().describe('REQUIRED Instructions and context to provide to the newly activated persona. This becomes the system message for the child session.'),
  todoListId: z.string().optional().describe('UUID format required when activating persona with todos. Must be a valid UUID v4 string (36 chars: 8-4-4-4-4-12 hex format). Leave undefined when not delegating with a todo list.'),
  todoListName: z.string().optional().describe('String name for todo list when delegating with tasks. Provides human-readable identifier for the todo list.'),
  todos: z.array(z.object({
    todoItem: z.string().describe('Short human-readable task title'),
    todoItemData: z.string().optional().describe('Detailed description of the task'),
    todoItemCompleted: z.boolean().default(false).optional(),
    todoItemTask: z.any().nullable().optional().describe('A structured code task object for a code agent to execute.')
  })).optional().describe('Array of todo items to delegate to the activated persona. Each item contains exactly one task.'),
});

// ==========================================
// TOOL 3: Response Persona Schema
// ==========================================
export const responsePersonaSchemaFields = z.object({
  userId: z.number().describe('REQUIRED for ALL operations. Obtained from System Instructions {{userId}} context.'),
  sessionId: z.string().describe('REQUIRED for ALL operations. Obtained from System Instructions {{sessionId}} context.'),
  message: z.string().describe('REQUIRED Summary of completed work when child persona finishes tasks. This will be supplied to the originating agent.'),
  success: z.boolean().describe('REQUIRED Must be true (success) or false (failure). Indicates outcome of todo list completion.'),
  parentSessionId: z.string().describe('REQUIRED Must be the ORIGINAL sessionId from System Instructions (NOT the child session ID). Used to identify which parent session this response belongs to.'),
  parentPersona: z.string().describe('REQUIRED The persona that called activate-persona to spawn the child session. Used to return control to correct parent persona after task completion. Valid values: Chat, Orchestrator, Architect, Code, Debug, QA, or any user created personas'),
  chatId: z.string().describe('REQUIRED Must match the chatId created during activate-persona. Used to ensure UI can correctly display responses in the correct session.'),
});
