import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { fileHelpers } from '../../../utils/file-helpers';
import { generateValidationReport, generateMismatchReport, generateDiffTemplate, handleGetLineContent, type ApplyPatchResult } from './utils/mcp-file-utils';
import {
  getLineContentSchemaFields,
  getDiffTemplateSchemaFields,
  updateFileSchemaFields,
} from '../../../../shared/types';

// 1. Initialize the native Update File Server
export const updateFileMcpServer = new McpServer({
  name: 'system-update-file-server',
  version: '1.0.0',
});

// Descriptions for each tool
const GET_LINE_CONTENT_DESC = `Retrieves exact line content from a file with optional context window (±2 lines). Returns the precise text at the specified line number.`;
const GET_DIFF_TEMPLATE_DESC = `Generates a pre-validated diff template for a specified line range in a file. Use this to create accurate patch templates before applying changes with update_file.`;
const UPDATE_FILE_DESC = `Applies structured diff patches to an existing file. Each patch specifies line changes with original and updated content. Supports additions, replacements, and deletions.`;

updateFileMcpServer.registerTool(
  'update_file_get_line_content',
  {
    description: GET_LINE_CONTENT_DESC,
    inputSchema: getLineContentSchemaFields,
  },
  async ({ path: filePath, line }) => {
    const result = await handleGetLineContent(
      filePath,
      line,
      'update_file',
      'get_line_content',
      true // include context
    );

    return {
      content: [{ type: 'text', text: result.content }],
      isError: !result.success,
    };
  }
);

updateFileMcpServer.registerTool(
  'update_file_get_diff_template',
  {
    description: GET_DIFF_TEMPLATE_DESC,
    inputSchema: getDiffTemplateSchemaFields,
  },
  async ({ path: filePath, start_line, end_line }) => {
    try {
      // Check if file exists using fileHelpers
      let existingFile: string;
      try {
        existingFile = await fileHelpers.readFile(filePath);
      } catch (err) {
        return {
          content: [{ type: 'text', text: `Cannot read file: ${err instanceof Error ? err.message : 'Unknown error'}` }],
          isError: true,
        };
      }

      if (!start_line || !end_line) {
        return {
          content: [{ type: 'text', text: `start_line and end_line must be defined` }],
          isError: true,
        };
      }

      // Normalize line endings
      const content = existingFile.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

      const template = generateDiffTemplate(filePath, start_line, end_line, 'update_file', content);

      return {
        content: [{ type: 'text', text: template }],
        isError: false,
      };

    } catch (error) {
      const errObject = error as { code?: string; message?: string };
      return {
        content: [{ type: 'text', text: `Error in get_diff_template: ${errObject?.message || errObject?.code || error}` }],
        isError: true,
      };
    }
  }
);

updateFileMcpServer.registerTool(
  'update_file_update_file',
  {
    description: UPDATE_FILE_DESC,
    inputSchema: updateFileSchemaFields,
  },
  async ({ path: filePath, diffs }) => {
    try {
      // Check that the file exists in the actual file system
      let existingFile: string = '';

      try {
        existingFile = await fileHelpers.readFile(filePath);
      } catch (err) {
        const errObject = err as { code?: string; message?: string };
        if (errObject.code === 'ENOENT') {
          return {
            content: [{ type: 'text', text: `Error: File "${filePath}" does not exist on disk. Use create_file to create the file first.` }],
            isError: true,
          };
        }
        return {
          content: [{ type: 'text', text: `Error: ${errObject?.message || errObject?.code || err}` }],
          isError: true,
        };
      }

      // Apply diffs sequentially - handle undefined diffs array
      let currentContent = existingFile;
      let totalAdditions = 0;
      let totalRemovals = 0;

      const diffsArray = diffs || [];

      for (const diff of diffsArray) {
        const diffResult: ApplyPatchResult = applyStringPatch(currentContent, diff);

        // Type guard for mismatch errors
        if (diffResult.type === 'mismatch') {
          return {
            content: [{ type: 'text', text: generateMismatchReport(filePath, diff, diffResult.expected, diffResult.actual) }],
            isError: true,
          };
        }

        // Type guard for invalid_index errors
        if (diffResult.type === 'invalid_index') {
          return {
            content: [{ type: 'text', text: generateValidationReport(filePath, diff, currentContent) }],
            isError: true,
          };
        }

        // Type guard for empty_update errors
        if (diffResult.type === 'empty_update') {
          return {
            content: [{ type: 'text', text: generateValidationReport(filePath, diff, currentContent) }],
            isError: true,
          };
        }

        if (diffResult.type === 'success') {
          currentContent = diffResult.newContent;
          totalAdditions += diffResult.additions;
          totalRemovals += diffResult.removals;
        }
      }

      // Write changes back to actual file system
      try {
        await fileHelpers.writeFile(filePath, currentContent);
      } catch (err) {
        const errObject = err as { code?: string; message?: string };
        return {
          content: [{ type: 'text', text: `Error: Failed to write file "${filePath}": ${errObject?.message || errObject?.code || err}` }],
          isError: true,
        };
      }

      return {
        content: [{ type: 'text', text: JSON.stringify({
          path: filePath,
          totalAdditions,
          totalRemovals,
          finalLineCount: currentContent.split('\n').length
        }) }],
        isError: false,
      };

    } catch (error) {
      const errObject = error as { code?: string; message?: string };
      return {
        content: [{ type: 'text', text: `Error in update_file: ${errObject?.message || errObject?.code || error}` }],
        isError: true,
      };
    }
  }
);

// ==========================================
// Helper Function: Apply String Patch
// ==========================================
function applyStringPatch(content: string, patch: { start_line: number; original?: string; updated: string; is_additive?: boolean }): ApplyPatchResult {
  const { start_line: patchStartLine, original, updated, is_additive } = patch;

  // Split original and updated using the converted (escaped) strings
  const originalParts = (original || '').split('\n');
  const updateParts = updated.split('\n');

  // For additive patches (insertions):
  if (is_additive && original) {
    return {
      type: 'invalid_index',
      line: patchStartLine,
      message: 'Additive patches cannot have original content specified'
    };
  }

  const lines = content === '' ? [] : content.split('\n');
  const insertIdx = patchStartLine - 1;

  // Ensure insert index is valid
  if (insertIdx < 0 || insertIdx > lines.length) {
    return {
      type: 'invalid_index',
      line: patchStartLine,
      message: `Line number ${patchStartLine} is out of valid range (1 to ${lines.length + 1})`
    };
  }

  // For replacement patches: verify content matches
  if (!is_additive) {
    // Empty update = deletion of original content
    if (updateParts.length === 0 && original) {
      // This is a deletion - remove the original content
      return {
        type: 'success',
        newContent: lines.slice(0, insertIdx).concat(lines.slice(insertIdx + originalParts.length)).join('\n'),
        additions: 0,
        removals: originalParts.length
      };
    }

    // Non-empty update - validate and apply normally
    if (updateParts.length === 0) {
      return {
        type: 'empty_update',
        line: patchStartLine,
        message: 'Deletion requires the "original" field to be specified. The "original" field indicates what content will be removed.'
      };
    }

    // Build the expected text from original parts
    const expectedText = originalParts.join('\n');

    // Verify content at insertIdx matches expected text
    const slice = lines.slice(insertIdx, insertIdx + originalParts.length);
    const contentAtStartLine = slice.join('\n');

    if (contentAtStartLine !== expectedText) {
      return { type: 'mismatch', expected: expectedText, actual: contentAtStartLine };
    }

    // Perform replacement
    return { type: 'success', newContent: lines.slice(0, insertIdx).concat(updateParts, lines.slice(insertIdx + originalParts.length)).join('\n'), additions: updateParts.length, removals: originalParts.length };
  } else {
    // Handle additive patches (insertions)
    lines.splice(insertIdx, 0, ...updateParts);
    return { type: 'success', newContent: lines.join('\n'), additions: updateParts.length, removals: 0 };
  }
}

// ==========================================
// 3. Export Manifest Definitions For Registry Mapping
// ==========================================
export const updateFileToolsManifest = [
  {
    id: 'update_file_get_line_content',
    name: 'Update File - Get Line Content',
    description: GET_LINE_CONTENT_DESC,
    params: getLineContentSchemaFields,
  },
  {
    id: 'update_file_get_diff_template',
    name: 'Update File - Get Diff Template',
    description: GET_DIFF_TEMPLATE_DESC,
    params: getDiffTemplateSchemaFields,
  },
  {
    id: 'update_file_update_file',
    name: 'Update File - Update File',
    description: UPDATE_FILE_DESC,
    params: updateFileSchemaFields,
  },
];
