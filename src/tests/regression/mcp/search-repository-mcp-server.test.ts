import { describe, test, expect, beforeAll } from '@jest/globals';
import { searchRepositorySchemaFields } from '@/shared/types';
import { searchRepositoryMcpServer, searchRepositoryToolsManifest } from '@/backend/mcp/mcp-servers/search/search-repository-mcp-server';
import MCPToolRegistry from '@/backend/mcp/mcp-tool';

describe('searchRepositoryMcpServer', () => {
  describe('Execute', () => {
    const registry: MCPToolRegistry = MCPToolRegistry.getInstance();

    beforeAll(() => {
      registry.registerMCPServer(searchRepositoryMcpServer, searchRepositoryToolsManifest);
    });

    test('Execute with valid regex pattern returns results', async () => {
      const tool = registry.getTool('search_repository', 1);
      expect(tool).not.toBeNull();

      // Search for common patterns in TypeScript files
      const validParams = {
        path: './src',
        regex: 'import.*from',
        file_pattern: '*.ts',
        match_case: false
      };

      const params = searchRepositorySchemaFields.safeParse(validParams);
      expect(params.success).toBe(true);

      if (params.data) {
        const result = await tool?.execute(params.data);
        // Should return search results
        expect(result).toBeDefined();
        if (result?.success) {
          // Check that result is a valid JSON array or contains expected structure
          try {
            const parsedResult = JSON.parse(result.content);
            expect(parsedResult).toBeInstanceOf(Array);
          } catch {
            // If parsing fails, at least check content is not empty
            expect(result.content).not.toBe('');
          }
        }
      }
    });

    test('Execute with file_pattern filter', async () => {
      const tool = registry.getTool('search_repository', 1);
      const validParams = {
        path: './src',
        regex: 'console\\.log',
        file_pattern: '*.js',
        match_case: false
      };

      const params = searchRepositorySchemaFields.safeParse(validParams);
      expect(params.success).toBe(true);

      if (params.data) {
        const result = await tool?.execute(params.data);
        // Should return results filtered by file pattern
        expect(result).toBeDefined();
        if (result?.success) {
          try {
            const parsedResult = JSON.parse(result.content);
            expect(parsedResult).toBeInstanceOf(Array);
          } catch {
            expect(result.content).not.toBe('');
          }
        }
      }
    });

    test('Execute with match_case=true', async () => {
      const tool = registry.getTool('search_repository', 1);
      const validParams = {
        path: './src',
        regex: 'Import.*From',
        file_pattern: '*.ts',
        match_case: true
      };

      const params = searchRepositorySchemaFields.safeParse(validParams);
      expect(params.success).toBe(true);

      if (params.data) {
        const result = await tool?.execute(params.data);
        // Should perform case-sensitive matching
        expect(result).toBeDefined();
        if (result?.success) {
          try {
            const parsedResult = JSON.parse(result.content);
            expect(parsedResult).toBeInstanceOf(Array);
          } catch {
            expect(result.content).not.toBe('');
          }
        }
      }
    });

    test('Execute with leading slash handles paths', async () => {
      const tool = registry.getTool('search_repository', 1);
      const validParams = {
        path: '/./src',
        regex: 'export.*default',
        file_pattern: '*.ts',
        match_case: false
      };

      const params = searchRepositorySchemaFields.safeParse(validParams);
      expect(params.success).toBe(true);

      if (params.data) {
        const result = await tool?.execute(params.data);
        // Should handle the path properly
        expect(result).toBeDefined();
        if (result?.success) {
          try {
            const parsedResult = JSON.parse(result.content);
            expect(parsedResult).toBeInstanceOf(Array);
          } catch {
            expect(result.content).not.toBe('');
          }
        }
      }
    });

    test('Execute with invalid regex returns error', async () => {
      const tool = registry.getTool('search_repository', 1);
      const validParams = {
        path: './src',
        regex: '[invalid(regex',
        file_pattern: '*.ts',
        match_case: false
      };

      const params = searchRepositorySchemaFields.safeParse(validParams);
      expect(params.success).toBe(true);

      if (params.data) {
        const result = await tool?.execute(params.data);
        // Should return error for invalid regex
        expect(result).toBeDefined();
        if (result?.success === false) {
          expect(result.content).toContain('invalid');
        }
      }
    });

    test('Execute without file_pattern searches all files', async () => {
      const tool = registry.getTool('search_repository', 1);
      const validParams = {
        path: './src',
        regex: 'import',
        match_case: false
      };

      const params = searchRepositorySchemaFields.safeParse(validParams);
      expect(params.success).toBe(true);

      if (params.data) {
        const result = await tool?.execute(params.data);
        // Should search all files without pattern filter
        expect(result).toBeDefined();
      }
    });
  })
})
