import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as _path from 'path';
import fs from 'fs/promises';
import { isExcludedDir } from '../../../../shared/types';
import { ListFilesParamsSchema } from '../../../../shared/types';
import { fileHelpers } from '../../../utils/file-helpers';

export const listFilesMcpServer = new McpServer({
  name: 'system-file-explorer-server',
  version: '1.0.0',
});

const LIST_FILES_DESC = `Lists files and directories within a specified filesystem path. Supports recursive or non-recursive traversal with configurable result limits.

PARAMETERS:
- path (optional, default: "."): Target filesystem path (absolute or relative). Defaults to current working directory.
- recursive (optional, default: true): When true, traverses nested directories. When false, lists only top-level entries.
- limit (optional, default: 25): Maximum entries to return (1-50 range). Prevents excessive payloads.

BEHAVIOR:
- Returns array of full filesystem paths as JSON string.
- Filters out excluded directories (.git, node_modules, etc.).
- Returns error if path does not exist.

RETURN VALUE:
string[] - Array of complete file/directory paths as JSON string in content field.`;

listFilesMcpServer.registerTool(
  'list_files',
  {
    description: LIST_FILES_DESC,
    inputSchema: ListFilesParamsSchema,
  },
  async ({ path, recursive, limit }) => {
    try {
      let files: string[];
      const resolvedPath = fileHelpers.resolveWorkspacePath(path);

      if (recursive) {
        files = await fs.readdir(resolvedPath, { recursive: true });
      } else {
        files = await fs.readdir(resolvedPath);
      }

      files = files.filter(name => !isExcludedDir(name));
      files = files.map(file => _path.join(resolvedPath, file));
      files = files.slice(0, limit);

      return {
        content: [{ type: 'text', text: JSON.stringify(files, null, 2) }],
        isError: false,
      };
    } catch (error) {
      return {
        content: [{ type: 'text', text: error instanceof Error ? error.message : 'Unknown exception occurred' }],
        isError: true,
      };
    }
  }
);

export const listFilesToolsManifest = [
  {
    id: 'list_files',
    name: 'List Files',
    description: LIST_FILES_DESC,
    params: ListFilesParamsSchema,
  },
];
