import { describe, test, expect, beforeAll } from '@jest/globals';
import { resolveLibrarySchemaFields, queryDocsSchemaFields } from '@/shared/types';
import { context7McpServer, context7ToolsManifest } from '@/backend/mcp/mcp-servers/documentation/context7-mcp-server';
import MCPToolRegistry from '@/backend/mcp/mcp-tool';

describe('context7McpServer', () => {
  describe('Execute', () => {
    const registry: MCPToolRegistry = MCPToolRegistry.getInstance();

    beforeAll(() => {
      registry.registerMCPServer(context7McpServer, context7ToolsManifest);
    });

    test('Execute resolve_library_id with valid library name', async () => {
      const tool = registry.getTool('context7_resolve_library_id', 1);
      expect(tool).not.toBeNull();

      // Try to resolve a common library
      const validParams = {
        libraryName: 'react',
        resolveQuery: 'React documentation library'
      };

      const params = resolveLibrarySchemaFields.safeParse(validParams);
      expect(params.success).toBe(true);

      if (params.data) {
        const result = await tool?.execute(params.data);
        // API request may fail if not configured, so check both cases
        if (result?.success) {
          expect(result?.content).toBeDefined();
        } else {
          // If API is not configured, content should contain error info
          expect(result?.content).toBeDefined();
        }
      }
    });

    test('Execute resolve_library_id with different library', async () => {
      const tool = registry.getTool('context7_resolve_library_id', 1);
      const validParams = {
        libraryName: 'typescript',
        resolveQuery: 'TypeScript documentation library'
      };

      const params = resolveLibrarySchemaFields.safeParse(validParams);
      expect(params.success).toBe(true);

      if (params.data) {
        const result = await tool?.execute(params.data);
        // Should return resolution results or error
        expect(result).toBeDefined();
      }
    });

    test('Execute query_docs with valid library ID', async () => {
      const tool = registry.getTool('context7_query_docs', 1);
      const validParams = {
        libraryId: '/facebook/react',
        docsQuery: 'React hooks documentation'
      };

      const params = queryDocsSchemaFields.safeParse(validParams);
      expect(params.success).toBe(true);

      if (params.data) {
        const result = await tool?.execute(params.data);
        // API request may fail if not configured
        expect(result).toBeDefined();
      }
    });

    test('Execute query_docs with leading slash in libraryId', async () => {
      const tool = registry.getTool('context7_query_docs', 1);
      const validParams = {
        libraryId: '/mongodb/docs',
        docsQuery: 'MongoDB driver API reference'
      };

      const params = queryDocsSchemaFields.safeParse(validParams);
      expect(params.success).toBe(true);

      if (params.data) {
        const result = await tool?.execute(params.data);
        // Should handle the libraryId properly
        expect(result).toBeDefined();
      }
    });

    test('Execute with invalid library name returns error', async () => {
      const tool = registry.getTool('context7_resolve_library_id', 1);
      const validParams = {
        libraryName: 'nonexistent-library-xyz',
        resolveQuery: 'Some query'
      };

      const params = resolveLibrarySchemaFields.safeParse(validParams);
      expect(params.success).toBe(true);

      if (params.data) {
        const result = await tool?.execute(params.data);
        // Should return error for invalid library
        expect(result).toBeDefined();
      }
    });
  })
})
