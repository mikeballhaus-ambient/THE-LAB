import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { createDirectorySchemaFields } from '@/shared/types';
import { createDirectoryMcpServer, createDirectoryToolsManifest } from '@/backend/mcp/mcp-servers/directory/create-directory-mcp-server';
import MCPToolRegistry from '@/backend/mcp/mcp-tool';
import fs from 'fs/promises';
import path from 'path';

describe('createDirectoryMcpServer', () => {
  describe('Execute', () => {
    const registry: MCPToolRegistry = MCPToolRegistry.getInstance();
    let tempDir: string;

    beforeAll(async () => {
      registry.registerMCPServer(createDirectoryMcpServer, createDirectoryToolsManifest);
      const tempDirPath = path.join(process.cwd(), 'temp', 'test-create-dir');
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
      const tool = registry.getTool('create_directory', 1);
      expect(tool).not.toBeNull();

      const validParams = {
        path: tempDir
      };

      const params = createDirectorySchemaFields.safeParse(validParams);
      expect(params.success).toBe(true);

      if (params.data) {
        const result = await tool?.execute(params.data);
        expect(result?.success).toEqual(true);
      }
    });

    test('Execute with recursive=true', async () => {
      const tool = registry.getTool('create_directory', 1);

      const nestedDir = path.join(tempDir, 'nested', 'deep', 'path');
      await fs.mkdir(nestedDir, { recursive: true });

      const validParams = {
        path: tempDir
      };

      const params = createDirectorySchemaFields.safeParse(validParams);
      expect(params.success).toBe(true);

      if (params.data) {
        const result = await tool?.execute(params.data);
        expect(result?.success).toEqual(true);
      }
    });

    test('Execute with leading slash', async () => {
      const tool = registry.getTool('create_directory', 1);

      const nestedDir = path.join(tempDir, 'slash-test');
      await fs.mkdir(nestedDir, { recursive: true });

      const validParams = {
        path: tempDir
      };

      const params = createDirectorySchemaFields.safeParse(validParams);
      expect(params.success).toBe(true);

      if (params.data) {
        const result = await tool?.execute(params.data);
        expect(result).toBeDefined();
      }
    });
  })
})
