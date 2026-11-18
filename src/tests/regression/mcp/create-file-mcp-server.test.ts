import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { createFileSchemaFields } from '@/shared/types';
import { createFileMcpServer, createFileToolsManifest } from '@/backend/mcp/mcp-servers/file/create-file-mcp-server';
import MCPToolRegistry from '@/backend/mcp/mcp-tool';
import fs from 'fs/promises';
import path from 'path';

describe('createFileMcpServer', () => {
  describe('Execute', () => {
    const registry: MCPToolRegistry = MCPToolRegistry.getInstance();
    let tempDir: string;

    beforeAll(async () => {
      registry.registerMCPServer(createFileMcpServer, createFileToolsManifest);
      const tempDirPath = path.join(process.cwd(), 'temp', 'test-create-file');
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
      const tool = registry.getTool('create_file', 1);
      expect(tool).not.toBeNull();

      const relativeFilePath = `${path.relative(process.cwd(), tempDir)}/test-create-file.txt`;

      const validParams = {
        path: relativeFilePath,
        content: 'Test content'
      };

      const params = createFileSchemaFields.safeParse(validParams);
      expect(params.success).toBe(true);

      if (params.data) {
        const result = await tool?.execute(params.data);
        expect(result?.success).toEqual(true);
      }
    });

    test('Execute with overwrite=true', async () => {
      const tool = registry.getTool('create_file', 1);
      
      const relativeFilePath = `${path.relative(process.cwd(), tempDir)}/test-create-file-overwrite.txt`;

      // Create file first
      await tool?.execute({
        path: relativeFilePath,
        content: 'Original content'
      });

      const validParams = {
        path: relativeFilePath,
        content: 'New content',
        overwrite: true
      };

      const params = createFileSchemaFields.safeParse(validParams);
      expect(params.success).toBe(true);

      if (params.data) {
        const result = await tool?.execute(params.data);
        expect(result?.success).toEqual(true);
      }
    });

    test('Execute with ensureDir=true', async () => {
      const tool = registry.getTool('create_file', 1);
      
      const relativeFilePath = `${path.relative(process.cwd(), tempDir)}/test-create-file-nested/deep/path/file.txt`;

      const validParams = {
        path: relativeFilePath,
        content: 'Test content',
        ensureDir: true
      };

      const params = createFileSchemaFields.safeParse(validParams);
      expect(params.success).toBe(true);

      if (params.data) {
        const result = await tool?.execute(params.data);
        expect(result?.success).toEqual(true);
      }
    });

    test('Execute returns error when file exists and overwrite=false', async () => {
      const tool = registry.getTool('create_file', 1);
      
      const relativeFilePath = `${path.relative(process.cwd(), tempDir)}/test-create-file-exists.txt`;

      // Create file first
      await tool?.execute({
        path: relativeFilePath,
        content: 'Original content'
      });

      const validParams = {
        path: relativeFilePath,
        content: 'New content',
        overwrite: false
      };

      const params = createFileSchemaFields.safeParse(validParams);
      expect(params.success).toBe(true);

      if (params.data) {
        const result = await tool?.execute(params.data);
        expect(result?.success).toEqual(false);
        expect(result?.content).toContain('already exists');
      }
    });

    test('Execute with empty content', async () => {
      const tool = registry.getTool('create_file', 1);
      
      const relativeFilePath = `${path.relative(process.cwd(), tempDir)}/test-create-file-empty.txt`;

      const validParams = {
        path: relativeFilePath,
        content: ''
      };

      const params = createFileSchemaFields.safeParse(validParams);
      expect(params.success).toBe(true);

      if (params.data) {
        const result = await tool?.execute(params.data);
        expect(result?.success).toEqual(true);
      }
    });
  })
})
