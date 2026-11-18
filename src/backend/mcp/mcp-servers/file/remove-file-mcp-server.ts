import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { removeFileSchemaFields as RemoveFileParamsSchema } from '../../../../shared/types';
import { fileHelpers } from '../../../utils/file-helpers';

// 1. Initialize the native Remove File Server
export const removeFileMcpServer = new McpServer({
  name: 'system-remove-file-server',
  version: '1.0.0',
});

// ==========================================
// TOOL: Remove File
// ==========================================
export const removeFileSchemaFields = RemoveFileParamsSchema;

const REMOVE_FILE_DESC = 'Removes a file or directory from the filesystem. Accepts `path` (required, string) for the target location, `recursive` (optional, boolean, default: false) to remove directories with all contents, and `force` (optional, boolean, default: false) to delete non-empty directories without recursive mode.';

removeFileMcpServer.registerTool(
  'remove_file',
  {
    description: REMOVE_FILE_DESC,
    inputSchema: removeFileSchemaFields,
  },
  async ({ path, recursive = false, force = false }) => {
    const fs = await import('fs/promises');

    try {
      const resolvedPath = fileHelpers.resolveWorkspacePath(path);

      // Check if the path exists
      try {
        await fs.access(resolvedPath);
      } catch {
        return {
          content: [{ type: 'text', text: `Path does not exist: ${resolvedPath}` }],
          isError: true,
        };
      }

      // Check if the path is a directory
      const stats = await fs.stat(resolvedPath);

      if (stats.isDirectory()) {
        if (!force && !recursive) {
          return {
            content: [{ type: 'text', text: `Cannot remove a directory without \`recursive: true\` or \`force: true\`. Path: ${resolvedPath}` }],
            isError: true,
          };
        }

        // Recursive directory removal
        await fs.rm(resolvedPath, { recursive: true });
      } else {
        // Single file removal
        await fs.unlink(resolvedPath);
      }

      return {
        content: [{ type: 'text', text: `Removed ${stats.isDirectory() ? 'directory' : 'file'} at ${resolvedPath}` }],
        isError: false,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        content: [{ type: 'text', text: `Error removing file/directory: ${errorMessage}` }],
        isError: true,
      };
    }
  }
);

// ==========================================
// 2. Export Manifest Definitions For Registry Mapping
// ==========================================
export const removeFileToolsManifest = [
  {
    id: 'remove_file',
    name: 'Remove File',
    description: REMOVE_FILE_DESC,
    params: removeFileSchemaFields,
  },
];
