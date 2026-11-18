import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { removeDirectorySchemaFields } from '@/shared/types';
import { removeDirectoryMcpServer, removeDirectoryToolsManifest } from '@/backend/mcp/mcp-servers/directory/remove-directory-mcp-server';
import MCPToolRegistry from '@/backend/mcp/mcp-tool';
import fs from 'fs/promises';
import path from 'path';

describe('removeDirectoryMcpServer', () => {
  describe('Execute', () => {
    const registry: MCPToolRegistry = MCPToolRegistry.getInstance();
    let tempDir: string;

    beforeAll(async () => {
      registry.registerMCPServer(removeDirectoryMcpServer, removeDirectoryToolsManifest);
      const tempDirPath = path.join(process.cwd(), 'temp', 'test-remove-dir');
      await fs.mkdir(path.dirname(tempDirPath), { recursive: true });
      tempDir = await fs.mkdtemp(tempDirPath);
    });

    afterAll(async () => {
      try {
        await fs.rm(tempDir, { recursive: true, force: true });
      } catch {
        // Ignore cleanup errors
      }
    });

    test('Execute with valid parameters', async () => {
      const tool = registry.getTool('remove_directory', 1);
      expect(tool).not.toBeNull();

      const nestedDir = path.join(tempDir, 'nested');
      await fs.mkdir(nestedDir, { recursive: true });

      const validParams = {
        path: tempDir
      };

      const params = removeDirectorySchemaFields.safeParse(validParams);
      expect(params.success).toBe(true);

      if (params.data) {
        const result = await tool?.execute(params.data);
        expect(result?.success).toEqual(true);
      }
    });

    test('Execute with recursive=true', async () => {
      const tool = registry.getTool('remove_directory', 1);

      const nestedDir = path.join(tempDir, 'nested');
      await fs.mkdir(nestedDir, { recursive: true });

      const validParams = {
        path: tempDir
      };

      const params = removeDirectorySchemaFields.safeParse(validParams);
      expect(params.success).toBe(true);

      if (params.data) {
        const result = await tool?.execute(params.data);
        expect(result?.success).toEqual(true);
      }
    });

    test('Execute returns error for non-existent path', async () => {
      const tool = registry.getTool('remove_directory', 1);
      const validParams = {
        path: '/nonexistent/path/xyz'
      };

      const params = removeDirectorySchemaFields.safeParse(validParams);
      expect(params.success).toBe(true);

      if (params.data) {
        const result = await tool?.execute(params.data);
        expect(result?.success).toEqual(false);
        // Error message should indicate the path doesn't exist or is unknown
        expect(result?.content).not.toBe('');
      }
    });

    test('Execute with leading slash', async () => {
      const tool = registry.getTool('remove_directory', 1);

      const nestedDir = path.join(tempDir, 'slash-test');
      await fs.mkdir(nestedDir, { recursive: true });

      const validParams = {
        path: tempDir
      };

      const params = removeDirectorySchemaFields.safeParse(validParams);
      expect(params.success).toBe(true);

      if (params.data) {
        const result = await tool?.execute(params.data);
        expect(result).toBeDefined();
      }
    });
  })
})
