import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import fs from 'fs/promises';
import { createDirectorySchemaFields } from '@/shared/types';
import { fileHelpers } from '@/backend/utils/file-helpers';

// 1. Initialize the native Create Directory Server
export const createDirectoryMcpServer = new McpServer({
  name: 'system-create-directory-server',
  version: '1.0.0',
});

// Tool description
const CREATE_DIR_DESC = 'Creates a new directory or full nested directory structure on the filesystem.';

// Helper to handle file system operations
async function createDirectory(dirPath: string, recursive: boolean): Promise<{ text: string; isError: boolean }> {
  try {
    const resolvedPath = fileHelpers.resolveWorkspacePath(dirPath);

    await fs.mkdir(resolvedPath, { recursive });

    return { text: `Directory created at ${resolvedPath}`, isError: false };
  } catch (error) {
    return {
      text: error instanceof Error ? error.message : 'Unknown error',
      isError: true,
    };
  }
}

// ==========================================
// TOOL: Create Directory
// ==========================================
createDirectoryMcpServer.registerTool(
  'create_directory',
  {
    description: CREATE_DIR_DESC,
    inputSchema: createDirectorySchemaFields,
  },
  async ({ path: dirPath, recursive = true }) => {
    const result = await createDirectory(dirPath, recursive);
    return { content: [{ type: 'text', text: result.text }], isError: result.isError };
  }
);

// ==========================================
// 3. Export Manifest Definitions For Registry Mapping
// ==========================================
export const createDirectoryToolsManifest = [
  {
    id: 'create_directory',
    name: 'Create Directory',
    description: CREATE_DIR_DESC,
    params: createDirectorySchemaFields,
  },
];
