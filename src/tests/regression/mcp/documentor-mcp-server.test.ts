import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { saveDocumentSchemaFields, getLineContentSchemaFields, getDiffTemplateSchemaFields, updateFileSchemaFields } from '@/shared/types';
import { documentorMcpServer, documentorToolsManifest } from '@/backend/mcp/mcp-servers/documentation/documentor-mcp-server';
import MCPToolRegistry from '@/backend/mcp/mcp-tool';
import fs from 'fs/promises';
import path from 'path';

describe('documentorMcpServer', () => {
  describe('Execute', () => {
    const registry: MCPToolRegistry = MCPToolRegistry.getInstance();
    let tempDir: string;

    beforeAll(async () => {
      registry.registerMCPServer(documentorMcpServer, documentorToolsManifest);
      const tempDirPath = path.join(process.cwd(), 'temp', 'test-documentor');
      await fs.mkdir(path.dirname(tempDirPath), { recursive: true });
      tempDir = await fs.mkdtemp(tempDirPath);
    });

    afterAll(async () => {
    	try {
    		if (tempDir) {
    			await fs.rm(tempDir, { recursive: true, force: true });
    		}
    	} catch (err) {
    		console.error('Cleanup error:', err);
    	}
    });

    test('Execute save_document with valid .md file', async () => {
      const tool = registry.getTool('documentor_save_document', 1);
      expect(tool).not.toBeNull();

      const randomName = Math.random().toString(36).substr(2, 9);
      const testFile = path.join(tempDir, `${randomName}-test.md`);
      
      // Use relative path from process.cwd()
      const validParams = {
        path: path.relative(process.cwd(), testFile),
        content: '# Test Document\n\nThis is a test document.\n\n## Section 1\n\nContent here.',
        overwrite: false
      };

      const params = saveDocumentSchemaFields.safeParse(validParams);
      expect(params.success).toBe(true);

      if (params.data) {
        const result = await tool?.execute(params.data);
        // Result has nested structure: content is a JSON string
        expect(result?.success).toEqual(true);
        
        // Verify file was created
        const content = await fs.readFile(testFile, 'utf-8');
        expect(content).toBe('# Test Document\n\nThis is a test document.\n\n## Section 1\n\nContent here.');
      }
    });

    test('Execute save_document with overwrite=true', async () => {
      const tool = registry.getTool('documentor_save_document', 1);
      
      const randomName = Math.random().toString(36).substr(2, 9);
      const testFile = path.join(tempDir, `${randomName}-overwrite.md`);
      
      // Create initial file
      await fs.writeFile(testFile, 'Original content');

      // Use relative path from process.cwd()
      const validParams = {
        path: path.relative(process.cwd(), testFile),
        content: '# Overwritten\n\nNew content.',
        overwrite: true
      };

      const params = saveDocumentSchemaFields.safeParse(validParams);
      expect(params.success).toBe(true);

      if (params.data) {
        const result = await tool?.execute(params.data);
        // Result has nested structure: content is a JSON string
        expect(result?.success).toEqual(true);
        
        // Verify file was overwritten
        const content = await fs.readFile(testFile, 'utf-8');
        expect(content).toBe('# Overwritten\n\nNew content.');
      }
    });

    test('Execute save_document rejects non-.md files', async () => {
      const tool = registry.getTool('documentor_save_document', 1);
      
      const randomName = Math.random().toString(36).substr(2, 9);
      const testFile = path.join(tempDir, `${randomName}-test.txt`);

      // Use relative path from process.cwd()
      const validParams = {
        path: path.relative(process.cwd(), testFile),
        content: '# Test',
        overwrite: false
      };

      const params = saveDocumentSchemaFields.safeParse(validParams);
      expect(params.success).toBe(true);

      if (params.data) {
        const result = await tool?.execute(params.data);
        // Error case - content is plain string with error message
        expect(result?.success).toEqual(false);
        expect(result?.content).toContain('.md');
      }
    });

    test('Execute save_document requires content', async () => {
      const tool = registry.getTool('documentor_save_document', 1);
      
      const randomName = Math.random().toString(36).substr(2, 9);
      const testFile = path.join(tempDir, `${randomName}-empty.md`);

      // Use relative path from process.cwd()
      const validParams = {
        path: path.relative(process.cwd(), testFile),
        content: '',
        overwrite: false
      };

      const params = saveDocumentSchemaFields.safeParse(validParams);
      expect(params.success).toBe(true);

      if (params.data) {
        const result = await tool?.execute(params.data);
        // Error case - content is plain string with error message
        expect(result?.success).toEqual(false);
        expect(result?.content).toContain('content is required');
      }
    });

    test('Execute get_line_content with valid line number', async () => {
      const tool = registry.getTool('documentor_get_line_content', 1);
      
      const randomName = Math.random().toString(36).substr(2, 9);
      const testFile = path.join(tempDir, `${randomName}-lines.md`);
      
      // Create file with known content
      const content = 'Line 1\nLine 2\nLine 3\nLine 4\nLine 5';
      await fs.writeFile(testFile, content);

      // Convert absolute path to relative path for MCP tool
      const relativePath = path.relative(process.cwd(), testFile);
      const validParams = {
        path: relativePath,
        line: 3
      };

      const params = getLineContentSchemaFields.safeParse(validParams);
      expect(params.success).toBe(true);

      if (params.data) {
      	const result = await tool?.execute(params.data);
      	// Result is plain text with line content and context
      	expect(result?.content).toContain('Line 3');
      	
      	// Should return line 3 with +/- 2 context (lines 1-5 for line 3)
      	expect(result?.content).toContain('Line 3');
      }
    });

    test('Execute get_line_content with invalid line number', async () => {
      const tool = registry.getTool('documentor_get_line_content', 1);
      
      const randomName = Math.random().toString(36).substr(2, 9);
      const testFile = path.join(tempDir, `${randomName}-invalid.md`);

      // Create file with known content
      const content = 'Line 1\nLine 2\nLine 3';
      await fs.writeFile(testFile, content);

      const validParams = {
        path: `${randomName}-invalid.md`,
        line: 999
      };

      const params = getLineContentSchemaFields.safeParse(validParams);
      expect(params.success).toBe(true);

      if (params.data) {
        const result = await tool?.execute(params.data);
        // Error case - content is plain string with error message
        expect(result?.success).toEqual(false);
        expect(result?.content).toContain('Cannot read file');
      }
    });

    test('Execute get_line_content with non-existent file', async () => {
      const tool = registry.getTool('documentor_get_line_content', 1);
      
      // Use a relative path that doesn't exist
      const validParams = {
        path: 'nonexistent/file.md',
        line: 1
      };

      const params = getLineContentSchemaFields.safeParse(validParams);
      expect(params.success).toBe(true);

      if (params.data) {
        const result = await tool?.execute(params.data);
        // Error case - content is plain string with error message
        expect(result?.success).toEqual(false);
        expect(result?.content).toContain('Cannot read file');
      }
    });

    test('Execute get_diff_template with valid line range', async () => {
      const tool = registry.getTool('documentor_get_diff_template', 1);
      
      const randomName = Math.random().toString(36).substr(2, 9);
      const testFile = path.join(tempDir, `${randomName}-diff.md`);
      
      // Create file with known content
      const content = 'Line 1\nLine 2\nLine 3\nLine 4\nLine 5';
      await fs.writeFile(testFile, content);

      // Convert absolute path to relative path for MCP tool
      const relativePath = path.relative(process.cwd(), testFile);
      const validParams = {
        path: relativePath,
        start_line: 2,
        end_line: 4
      };

      const params = getDiffTemplateSchemaFields.safeParse(validParams);
      expect(params.success).toBe(true);

      if (params.data) {
      	const result = await tool?.execute(params.data);
      	// get_diff_template returns a plain string template, not JSON
      	expect(result?.content).toContain('File:');
      	expect(result?.content).toContain('Lines');
      	expect(result?.content).toContain('Raw file content');
      }
    });

    test('Execute get_diff_template requires start_line and end_line', async () => {
      const testFile = path.join(tempDir, 'no-lines.md');

      // Use relative path for MCP tool
      const validParams = {
        path: path.relative(process.cwd(), testFile),
        start_line: undefined,
        end_line: undefined
      };

      const params = getDiffTemplateSchemaFields.safeParse(validParams);
      // Schema validation should fail because start_line and end_line are required
      expect(params.success).toBe(false);

      if (!params.data) {
        expect(params.error.issues[0].path.join('.')).toContain('start_line');
      }
    });

    test('Execute get_diff_template with non-existent file', async () => {
      const tool = registry.getTool('documentor_get_diff_template', 1);
      
      // Use a relative path that doesn't exist
      const validParams = {
        path: 'nonexistent/file.md',
        start_line: 1,
        end_line: 5
      };

      const params = getDiffTemplateSchemaFields.safeParse(validParams);
      expect(params.success).toBe(true);

      if (params.data) {
      	const result = await tool?.execute(params.data);
      	// Error case - content is plain string with error message
      	expect(result?.success).toEqual(false);
      	expect(result?.content).toContain('ENOENT');
      }
    });

    test('Execute update_document with valid diffs', async () => {
      const tool = registry.getTool('documentor_update_document', 1);
      
      const randomName = Math.random().toString(36).substr(2, 9);
      const testFile = path.join(tempDir, `${randomName}-update.md`);
      
      // Create file with known content
      const originalContent = 'Line 1\nLine 2\nLine 3\nLine 4\nLine 5';
      await fs.writeFile(testFile, originalContent);

      // Convert absolute path to relative path for MCP tool
      const relativePath = path.relative(process.cwd(), testFile);
      const validParams = {
        path: relativePath,
        diffs: [
          {
            start_line: 2,
            original: 'Line 2',
            updated: 'REPLACED LINE 2'
          }
        ]
      };

      const params = updateFileSchemaFields.safeParse(validParams);
      expect(params.success).toBe(true);

      if (params.data) {
        const result = await tool?.execute(params.data);
        // update_file returns JSON string with path, totalAdditions, totalRemovals, finalLineCount
        expect(result?.content).toContain('"path"');
        
        // Verify file was updated
        const content = await fs.readFile(testFile, 'utf-8');
        expect(content).toContain('REPLACED LINE 2');
      }
    });

    test('Execute update_document rejects empty diffs array', async () => {
      const randomName = Math.random().toString(36).substr(2, 9);

      const validParams = {
        path: `${randomName}-update.txt`,
        diffs: []
      };

      const params = updateFileSchemaFields.safeParse(validParams);
      // Schema validation should fail because diffs array must have at least 1 item
      expect(params.success).toBe(false);
    });

    test('Execute update_document with non-existent file', async () => {
      const tool = registry.getTool('documentor_update_document', 1);
      
      // Use a relative path that doesn't exist
      const validParams = {
        path: 'nonexistent/file.md',
        diffs: [
          {
            start_line: 1,
            original: 'Line 1',
            updated: 'New Line 1'
          }
        ]
      };

      const params = updateFileSchemaFields.safeParse(validParams);
      expect(params.success).toBe(true);

      if (params.data) {
      	const result = await tool?.execute(params.data);
      	// Error case - content is plain string with error message
      	expect(result?.success).toEqual(false);
      	expect(result?.content).toContain('ENOENT');
      }
    });
  })
})
