import { describe, test, expect, beforeAll } from '@jest/globals';
import { readFileSchemaFields as ReadFileParamsSchema } from '@/shared/types';
import { readFileMcpServer, readFileToolsManifest } from '@/backend/mcp/mcp-servers/file/read-file-mcp-server';
import MCPToolRegistry from '@/backend/mcp/mcp-tool';

describe('readFileMcpServer', () => {
  describe('Execute', () => {
    const registry: MCPToolRegistry = MCPToolRegistry.getInstance();

    beforeAll(() => {
      registry.registerMCPServer(readFileMcpServer, readFileToolsManifest);
    });

    test('Execute with valid parameters', async () => {
    	const tool = registry.getTool('read_file', 1);
    	expect(tool).not.toBeNull();
   
    	// Create a temp file first
    	const fs = await import('fs/promises');
    	const path = await import('path');
    	const tempFile = path.join(process.cwd(), 'test-read-file.txt');
    	await fs.writeFile(tempFile, 'Line 1\nLine 2\nLine 3\nLine 4\nLine 5');
   
    	try {
    		const validParams = {
    			path: tempFile
    		};
   
    		const params = ReadFileParamsSchema.safeParse(validParams);
    		expect(params.success).toBe(true);
   
    		if (params.data) {
    			const result = await tool?.execute(params.data);
    			expect(result?.success).toEqual(true);
    			
    			// Should return content with metadata prefix
    			expect(result?.content).toContain('(START:1, TOTAL:5, RETURNED:');
    		}
    	} finally {
    		await fs.rm(tempFile, { force: true });
    	}
    });

    test('Execute returns error for non-existent file', async () => {
      const tool = registry.getTool('read_file', 1);
      const validParams = {
        path: '/nonexistent/file.txt'
      };

      const params = ReadFileParamsSchema.safeParse(validParams);
      expect(params.success).toBe(true);

      if (params.data) {
        const result = await tool?.execute(params.data);
        expect(result?.success).toEqual(false);
        expect(result?.content).toContain('does not exist');
      }
    });

    test('Execute with offset parameter', async () => {
    	const tool = registry.getTool('read_file', 1);
    	
    	// Create a temp file first
    	const fs = await import('fs/promises');
    	const path = await import('path');
    	const tempFile = path.join(process.cwd(), 'test-read-file-offset.txt');
    	await fs.writeFile(tempFile, 'Line 1\nLine 2\nLine 3\nLine 4\nLine 5');
   
    	try {
    		const validParams = {
    			path: tempFile,
    			offset: 3
    		};
   
    		const params = ReadFileParamsSchema.safeParse(validParams);
    		expect(params.success).toBe(true);
   
    		if (params.data) {
    			const result = await tool?.execute(params.data);
    			expect(result?.success).toEqual(true);
    			
    			// Should return lines starting from line 3
    			expect(result?.content).toContain('Line 3');
    			expect(result?.content).toContain('Line 4');
    			expect(result?.content).toContain('Line 5');
    		}
    	} finally {
    		await fs.rm(tempFile, { force: true });
    	}
    });

    test('Execute with limit parameter', async () => {
    	const tool = registry.getTool('read_file', 1);
    	
    	// Create a temp file first
    	const fs = await import('fs/promises');
    	const path = await import('path');
    	const tempFile = path.join(process.cwd(), 'test-read-file-limit.txt');
    	await fs.writeFile(tempFile, 'Line 1\nLine 2\nLine 3\nLine 4\nLine 5');
   
    	try {
    		const validParams = {
    			path: tempFile,
    			offset: 1,
    			limit: 2
    		};
   
    		const params = ReadFileParamsSchema.safeParse(validParams);
    		expect(params.success).toBe(true);
   
    		if (params.data) {
    			const result = await tool?.execute(params.data);
    			expect(result?.success).toEqual(true);
    			
    			// Should return only 2 lines
    			expect(result?.content).toContain('Line 1');
    			expect(result?.content).toContain('Line 2');
    		}
    	} finally {
    		await fs.rm(tempFile, { force: true });
    	}
    });

    test('Execute with empty file', async () => {
    	const tool = registry.getTool('read_file', 1);
    	
    	// Create a temp file first
    	const fs = await import('fs/promises');
    	const path = await import('path');
    	const tempFile = path.join(process.cwd(), 'test-read-file-empty.txt');
    	await fs.writeFile(tempFile, '');
   
    	try {
    		const validParams = {
    			path: tempFile
    		};
   
    		const params = ReadFileParamsSchema.safeParse(validParams);
    		expect(params.success).toBe(true);
   
    		if (params.data) {
    			const result = await tool?.execute(params.data);
    			expect(result?.success).toEqual(true);
    			
    			// Should return content - check for empty file indicator
    			expect(result?.content).toMatch(/TOTAL|empty/i);
    		}
    	} finally {
    		await fs.rm(tempFile, { force: true });
    	}
    });
  })
})
