import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import fs from 'fs/promises';
import path from 'path';
import { createFileSchemaFields } from '../../../../shared/types';
import { fileHelpers } from '../../../utils/file-helpers';

// 1. Initialize the native Create File Server
export const createFileMcpServer = new McpServer({
  name: 'system-create-file-server',
  version: '1.0.0',
});

const CREATE_FILE_DESC = `Creates a new file with optional content, supporting overwrite and auto-directory creation. Parameters: path (required, absolute or relative filesystem path), content (optional text string without literal newlines, default ""), overwrite (boolean, default false; fails if exists when false), ensureDir (boolean, default false; creates parent dirs when true). Returns {type: 'tool_result', tool_call_id: 'create_file', success: boolean, content: error or confirmation message}.`;

createFileMcpServer.registerTool(
  'create_file',
  {
    description: CREATE_FILE_DESC,
    inputSchema: createFileSchemaFields,
  },
  async ({ path: filePath, content = '', overwrite = false, ensureDir = false }) => {
    try {
      const resolvedPath = fileHelpers.resolveWorkspacePath(filePath);

      // Create directory if it doesn't exist and ensureDir flag is true
      if (ensureDir) {
        const dir = path.dirname(resolvedPath);
        await fs.mkdir(dir, { recursive: true });
      }

      // If overwrite is false and file already exists, return an error
      if (!overwrite) {
        const exists = await fs.stat(resolvedPath).catch(() => false);
        if (exists) {
          return {
            content: [{ type: 'text', text: `File '${resolvedPath}' already exists and overwrite is false.` }],
            isError: true,
          };
        }
      }

      // Ensure directory exists (if not set in ensureDir, fail if parent directory doesn't exist)
      await fs.mkdir(path.dirname(resolvedPath), { recursive: true });

      // Create or overwrite the file
      await fs.writeFile(resolvedPath, content, 'utf-8');

      return {
        content: [{ type: 'text', text: `File created or overwritten at ${resolvedPath}` }],
        isError: false,
      };
    } catch (error) {
      return {
        content: [{ type: 'text', text: error instanceof Error ? error.message : 'Unknown error' }],
        isError: true,
      };
    }
  }
);

// ==========================================
// 3. Export Manifest Definitions For Registry Mapping
// ==========================================
export const createFileToolsManifest = [
  {
    id: 'create_file',
    name: 'Create File',
    description: CREATE_FILE_DESC,
    params: createFileSchemaFields,
  },
];
