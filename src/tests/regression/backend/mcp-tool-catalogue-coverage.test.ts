import { beforeAll, describe, expect, test } from '@jest/globals';
import MCPToolRegistry from '@/backend/mcp/mcp-tool';
import type { MCPToolInterface } from '@/shared/types';
import type { z } from 'zod';

/**
 * Every built-in MCP server must reach the registry. A server that is not registered cannot be
 * granted to any persona, so it fails silently: the UI simply never offers its tools.
 *
 * This is the assertion that would have caught Workflow Studio and Knowledge Base being callable by
 * an agent but absent from Settings → Personas → Tools.
 */
describe('MCP tool registry catalogue', () => {
  const REQUIRED_TOOL_IDS = [
    'lab_workflow_list_node_types',
    'lab_workflow_validate',
    'lab_workflow_create',
    'lab_workflow_run',
    'lab_kb_search',
    'lab_kb_get',
    'lab_kb_app_context',
  ];

  let registered: Array<MCPToolInterface<z.ZodObject<z.ZodRawShape>>> = [];

  // `loadDefaultServers` binds each McpServer to an in-memory transport and is not re-entrant, so the
  // registry is populated once for the whole suite — the same way the server does it at boot.
  beforeAll(async () => {
    await MCPToolRegistry.getInstance().loadDefaultServers();
    registered = MCPToolRegistry.getInstance().getRegisteredTools();
  });

  test('registers the Workflow Studio and Knowledge Base servers', () => {
    const ids = registered.map((tool) => tool.id);
    for (const id of REQUIRED_TOOL_IDS) {
      expect(ids).toContain(id);
    }
  });

  test('every registered tool exposes the metadata the catalogue table needs', () => {
    expect(registered.length).toBeGreaterThan(0);
    for (const tool of registered) {
      expect(tool.id).toBeTruthy();
      // id/name/description are NOT NULL in the `tools` table and are rendered in the persona list.
      expect(typeof tool.name).toBe('string');
      expect(typeof tool.description).toBe('string');
    }
  });

  test('tool ids are unique', () => {
    const ids = registered.map((tool) => tool.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
