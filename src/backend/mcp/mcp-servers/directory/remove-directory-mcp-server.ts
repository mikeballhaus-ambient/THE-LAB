import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import fs from 'fs/promises';

// Import schema from shared types
import { removeDirectorySchemaFields } from '../../../../shared/types';
import { fileHelpers } from '../../../utils/file-helpers';

// 1. Initialize the native Remove Directory Server
export const removeDirectoryMcpServer = new McpServer({
  name: 'system-remove-directory-server',
  version: '1.0.0',
});

// ==========================================
// TOOL: Remove Directory
// ==========================================
removeDirectoryMcpServer.registerTool(
  'remove_directory',
  {
    description: 'Removes a directory from the filesystem. Deletes the target path optionally with recursive content removal and/or forced deletion of non-empty directories.',
    inputSchema: removeDirectorySchemaFields,
  },
  async ({ path: dirPath, recursive = true, force = false }) => {

    try {
      const resolvedPath = fileHelpers.resolveWorkspacePath(dirPath);

      // Check if path exists
      await fs.access(resolvedPath);

      await fs.rm(resolvedPath, { recursive: recursive, force });

      return { content: [{ type: 'text', text: `Directory removed at ${resolvedPath}` }], isError: false };
    } catch (error) {
      let errorMsg = 'Unknown error';
      if (error instanceof Error) {
        errorMsg = error.message;
        // Extract ENOENT code from path for better error messages
        const errorCode = (error as NodeJS.ErrnoException).code;
        if (errorCode === 'ENOENT') {
          errorMsg = `Path does not exist: ${dirPath}`;
        } else if (errorCode === 'EACCES') {
          errorMsg = `Permission denied: ${dirPath}`;
        }
      }
      return { content: [{ type: 'text', text: errorMsg }], isError: true };
    }
  }
);

// ==========================================
// 2. Export Manifest Definitions For Registry Mapping
// ==========================================
export const removeDirectoryToolsManifest = [
  {
    id: 'remove_directory',
    name: 'Remove Directory',
    description: 'Removes a directory from the filesystem.',
    params: removeDirectorySchemaFields,
  },
];
