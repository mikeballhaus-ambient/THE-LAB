import { describe, expect, test } from '@jest/globals';
import {
  LAB_SESSION_TODO_TOOL_IDS,
  mergePersonaUniversalTools,
} from '@/shared/constants/lab-session-todo-tools';
import { getPersonaTools } from '@/backend/db/Persona/persona-schema';

describe('lab session todo tools — universal persona allowlist', () => {
  test('mergePersonaUniversalTools adds all session todo MCP ids', () => {
    const merged = mergePersonaUniversalTools(['read_file']);
    for (const id of LAB_SESSION_TODO_TOOL_IDS) {
      expect(merged).toContain(id);
    }
    expect(merged).toContain('read_file');
  });

  test('Chat persona seed tools include todo_list_create_list', async () => {
    const tools = await getPersonaTools('Chat');
    expect(tools).toContain('todo_list_create_list');
    expect(tools).toContain('todo_list_add_todo_item');
  });
});
