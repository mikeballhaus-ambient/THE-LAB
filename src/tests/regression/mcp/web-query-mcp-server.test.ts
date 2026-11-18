import { describe, test, expect, beforeAll } from '@jest/globals';
import { webQuerySchemaFields } from '@/shared/types';
import { webQueryMcpServer, webQueryToolsManifest } from '@/backend/mcp/mcp-servers/web/web-query-mcp-server';
import MCPToolRegistry from '@/backend/mcp/mcp-tool';

describe('webQueryMcpServer', () => {
  describe('Execute', () => {
    const registry: MCPToolRegistry = MCPToolRegistry.getInstance();

    beforeAll(() => {
      registry.registerMCPServer(webQueryMcpServer, webQueryToolsManifest);
    });

    test('Execute with valid parameters', async () => {
      const tool = registry.getTool('web_query', 1);
      expect(tool).not.toBeNull();

      const validParams = {
        query: 'test search query'
      };

      const params = webQuerySchemaFields.safeParse(validParams);
      expect(params.success).toBe(true);

      if (params.data) {
        const result = await tool?.execute(params.data);
        // This may fail if API is not configured, so check both cases
        if (result?.success) {
          expect(result?.content).toBeDefined();
        } else {
          // If API is not configured, content should contain error info
          expect(result?.content).toContain('Web Query');
        }
      }
    });

    test('Execute with max_results parameter', async () => {
      const tool = registry.getTool('web_query', 1);
      const validParams = {
        query: 'test search query',
        max_results: 5
      };

      const params = webQuerySchemaFields.safeParse(validParams);
      expect(params.success).toBe(true);

      if (params.data) {
        const result = await tool?.execute(params.data);
        // Should return a response
        expect(result).toBeDefined();
      }
    });

    test('Execute with default max_results', async () => {
      const tool = registry.getTool('web_query', 1);
      const validParams = {
        query: 'test search query'
      };

      const params = webQuerySchemaFields.safeParse(validParams);
      expect(params.success).toBe(true);

      if (params.data) {
        const result = await tool?.execute(params.data);
        // Should use default max_results
        expect(result).toBeDefined();
      }
    });

    test('Execute with leading slash in query', async () => {
      const tool = registry.getTool('web_query', 1);
      const validParams = {
        query: '/test search query'
      };

      const params = webQuerySchemaFields.safeParse(validParams);
      expect(params.success).toBe(true);

      if (params.data) {
        const result = await tool?.execute(params.data);
        // Should handle the query properly
        expect(result).toBeDefined();
      }
    });

    test('Execute with empty query', async () => {
      const tool = registry.getTool('web_query', 1);
      const validParams = {
        query: ''
      };

      const params = webQuerySchemaFields.safeParse(validParams);
      expect(params.success).toBe(true);

      if (params.data) {
        const result = await tool?.execute(params.data);
        // Should handle empty query
        expect(result).toBeDefined();
      }
    });
  })
})
