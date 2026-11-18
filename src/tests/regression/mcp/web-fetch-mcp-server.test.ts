import { describe, test, expect, beforeAll } from '@jest/globals';
import { webFetchSchemaFields } from '@/shared/types';
import { webFetchMcpServer, webFetchToolsManifest } from '@/backend/mcp/mcp-servers/web/web-fetch-mcp-server';
import MCPToolRegistry from '@/backend/mcp/mcp-tool';

describe('webFetchMcpServer', () => {
  describe('Execute', () => {
    const registry: MCPToolRegistry = MCPToolRegistry.getInstance();

    beforeAll(() => {
      registry.registerMCPServer(webFetchMcpServer, webFetchToolsManifest);
    });

    test('Execute with valid URL', async () => {
      const tool = registry.getTool('web_fetch', 1);
      expect(tool).not.toBeNull();

      const validParams = {
        url: 'https://httpbin.org/get'
      };

      const params = webFetchSchemaFields.safeParse(validParams);
      expect(params.success).toBe(true);

      if (params.data) {
        const result = await tool?.execute(params.data);
        // Should return content from the URL
        expect(result).toBeDefined();
      }
    });

    test('Execute with leading slash in URL', async () => {
      const tool = registry.getTool('web_fetch', 1);
      const validParams = {
        url: '/test-url'
      };

      const params = webFetchSchemaFields.safeParse(validParams);
      expect(params.success).toBe(true);

      if (params.data) {
        const result = await tool?.execute(params.data);
        // Should handle the URL properly
        expect(result).toBeDefined();
      }
    });

    test('Execute with empty string URL', async () => {
      const tool = registry.getTool('web_fetch', 1);
      const validParams = {
        url: ''
      };

      const params = webFetchSchemaFields.safeParse(validParams);
      expect(params.success).toBe(true);

      if (params.data) {
        const result = await tool?.execute(params.data);
        // Should handle empty URL
        expect(result).toBeDefined();
      }
    });

    test('Execute with invalid HTTP status returns error', async () => {
      const tool = registry.getTool('web_fetch', 1);
      
      // Use a URL that will return 404
      const validParams = {
        url: 'https://httpbin.org/status/404'
      };

      const params = webFetchSchemaFields.safeParse(validParams);
      expect(params.success).toBe(true);

      if (params.data) {
        const result = await tool?.execute(params.data);
        // Should return error for 404 status - check content contains "HTTP Error" or "404"
        expect(result?.content).toContain('404');
      }
    });
  })
})
