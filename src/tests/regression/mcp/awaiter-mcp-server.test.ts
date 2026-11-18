import { describe, test, expect, beforeAll } from '@jest/globals';
import { awaiterSchemaFields } from '@/shared/types';
import { awaiterMcpServer, awaiterToolsManifest } from '@/backend/mcp/mcp-servers/awaiter/awaiter-mcp-server';
import MCPToolRegistry from '@/backend/mcp/mcp-tool';

describe('awaiterMcpServer', () => {
  describe('Execute', () => {
    const registry: MCPToolRegistry = MCPToolRegistry.getInstance();

    beforeAll(() => {
      registry.registerMCPServer(awaiterMcpServer, awaiterToolsManifest);
    });

    test('Execute with valid parameters', async () => {
      const tool = registry.getTool('awaiter', 1);
      expect(tool).not.toBeNull();

      const validParams = {
        userId: 1,
        sessionId: 'test-session',
        persona: 'Chat',
        waitForSeconds: 1,
        context: 'Test context'
      };

      const params = awaiterSchemaFields.safeParse(validParams);
      expect(params.success).toBe(true);

      if (params.data) {
        const result = await tool?.execute(params.data);
        // Should return await result
        expect(result).toBeDefined();
      }
    });

    test('Execute with different persona', async () => {
      const tool = registry.getTool('awaiter', 1);
      const validParams = {
        userId: 1,
        sessionId: 'test-session',
        persona: 'Architect',
        waitForSeconds: 1,
        context: 'Architecture context'
      };

      const params = awaiterSchemaFields.safeParse(validParams);
      expect(params.success).toBe(true);

      if (params.data) {
        const result = await tool?.execute(params.data);
        // Should return await result
        expect(result).toBeDefined();
      }
    });

    test('Execute with zero wait time', async () => {
      const tool = registry.getTool('awaiter', 1);
      const validParams = {
        userId: 1,
        sessionId: 'test-session',
        persona: 'Code',
        waitForSeconds: 0,
        context: 'Immediate context'
      };

      const params = awaiterSchemaFields.safeParse(validParams);
      expect(params.success).toBe(true);

      if (params.data) {
        const result = await tool?.execute(params.data);
        // Should return await result
        expect(result).toBeDefined();
      }
    });

    test('Execute with large wait time', async () => {
      const tool = registry.getTool('awaiter', 1);
      const validParams = {
        userId: 1,
        sessionId: 'test-session',
        persona: 'Debug',
        waitForSeconds: 2,
        context: 'Long wait context'
      };

      const params = awaiterSchemaFields.safeParse(validParams);
      expect(params.success).toBe(true);

      if (params.data) {
        const result = await tool?.execute(params.data);
        // Should return await result
        expect(result).toBeDefined();
      }
    });

    test('Execute with empty context', async () => {
      const tool = registry.getTool('awaiter', 1);
      const validParams = {
        userId: 1,
        sessionId: 'test-session',
        persona: 'QA',
        waitForSeconds: 2,
        context: ''
      };

      const params = awaiterSchemaFields.safeParse(validParams);
      expect(params.success).toBe(true);

      if (params.data) {
        const result = await tool?.execute(params.data);
        // Should return await result
        expect(result).toBeDefined();
      }
    });
  })
})
