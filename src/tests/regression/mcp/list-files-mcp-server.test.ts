import { describe, test, expect, beforeAll } from '@jest/globals';
import { ListFilesParamsSchema } from '@/shared/types';
import { listFilesMcpServer, listFilesToolsManifest } from '@/backend/mcp/mcp-servers/file/list-files-mcp-server';
import MCPToolRegistry from '@/backend/mcp/mcp-tool';

describe('listFilesMcpServer', () => {
  describe('Execute', () => {
    const registry: MCPToolRegistry = MCPToolRegistry.getInstance()

    beforeAll(() => {
      registry.registerMCPServer(listFilesMcpServer, listFilesToolsManifest)
    })

    test('Execute with default parameters', async () => {
      const tool = registry.getTool('list_files', 1)
      expect(tool).not.toBeNull()

      const validParams = {
        path: './src',
        recursive: true,
        limit: 25
      };

      const params = ListFilesParamsSchema.safeParse(validParams);
      expect(params.success).toBe(true);

      if (params.data) {
        const result = await tool?.execute(params.data)
        expect(result?.success).toEqual(true)
        if (result?.content) {
          const data = JSON.parse(result?.content)
          expect(data.length).toEqual(25)
        }
      }
    });
  })
})
