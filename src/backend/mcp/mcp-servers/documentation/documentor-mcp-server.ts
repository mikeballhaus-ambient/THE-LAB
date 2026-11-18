import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as fs from 'fs';
import z from 'zod';
import { fileHelpers } from '../../../utils/file-helpers';
import { generateValidationReport, generateMismatchReport, generateDiffTemplate, handleGetLineContent, type ApplyPatchResult } from '../file/utils/mcp-file-utils';
import {
  saveDocumentSchemaFields,
  getLineContentSchemaFields,
  getDiffTemplateSchemaFields,
  updateFileSchemaFields,
} from '../../../../shared/types';
// 1. Initialize the native Documentor Server
export const documentorMcpServer = new McpServer({
  name: 'system-documentor-server',
  version: '1.0.0',
});

const SAVE_DOCUMENT_DESC = 'Writes complete markdown content to a file. Validates .md extension and handles overwrites based on the overwrite parameter.';

documentorMcpServer.registerTool(
  'documentor_save_document',
  {
    description: SAVE_DOCUMENT_DESC,
    inputSchema: saveDocumentSchemaFields,
  },
  async ({ path, content, overwrite }: z.infer<typeof saveDocumentSchemaFields>) => {
    // Validate .md extension
    const pathLower = path.toLowerCase();
    if (!pathLower.endsWith('.md')) {
      return {
        content: [{ type: 'text', text: `Error: Only .md files are supported. The file path "${path}" must end with .md` }],
        isError: true,
      };
    }

    // Validate content is provided
    if (!content || content.trim() === '') {
      return {
        content: [{ type: 'text', text: `Error: content is required for save_document operation. Provide the markdown content to save.` }],
        isError: true,
      };
    }

    // Check if file exists and handle overwrite
    let fileExists = false;
    try {
      await fileHelpers.readFile(path);
      fileExists = true;
    } catch {
      // File doesn't exist, which is fine for new files
    }

    if (fileExists && !overwrite) {
      return {
        content: [{ type: 'text', text: `Error: File "${path}" already exists. Set overwrite=true to overwrite existing file.` }],
        isError: true,
      };
    }

    // Write content to file
    try {
      await fs.promises.writeFile(path, content);

      const lineCount = content.split('\n').length;

      return {
        content: [{ type: 'text', text: JSON.stringify({ path, lineCount, bytesWritten: Buffer.byteLength(content) }) }],
        isError: false,
      };
    } catch (err) {
      const errObject = err as { code?: string; message?: string };
      return {
        content: [{ type: 'text', text: `Error: Failed to write file "${path}": ${errObject?.message || errObject?.code || err}` }],
        isError: true,
      };
    }
  }
);

const GET_LINE_CONTENT_DESC = 'Retrieves exact line content from a markdown file with +/- 2 lines context.';

documentorMcpServer.registerTool(
  'documentor_get_line_content',
  {
    description: GET_LINE_CONTENT_DESC,
    inputSchema: getLineContentSchemaFields,
  },
  async ({ path, line }) => {
    const result = await handleGetLineContent(path, line, 'documentor', 'get_line_content');

    return {
      content: [{ type: 'text', text: result.content }],
      isError: !result.success,
    };
  }
);

const GET_DIFF_TEMPLATE_DESC = 'Generates a pre-validated diff template for a specified line range in a markdown file.';

documentorMcpServer.registerTool(
  'documentor_get_diff_template',
  {
    description: GET_DIFF_TEMPLATE_DESC,
    inputSchema: getDiffTemplateSchemaFields,
  },
  async ({ path: filePath, start_line, end_line }) => {
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

    const template = generateDiffTemplate(filePath, start_line, end_line, 'documentor', content);

    return {
      content: [{ type: 'text', text: template }],
      isError: false,
    };
  }
);

const UPDATE_DOCUMENT_DESC = 'Applies structured diff patches to modify documentation content in a markdown file.';

documentorMcpServer.registerTool(
  'documentor_update_document',
  {
    description: UPDATE_DOCUMENT_DESC,
    inputSchema: updateFileSchemaFields,
  },
  async ({ path, diffs }) => {
    // Validate that path ends with .md
    const pathLower = path.toLowerCase();
    if (!pathLower.endsWith('.md')) {
      return {
        content: [{ type: 'text', text: `Error: Only .md files are supported. The file path "${path}" must end with .md` }],
        isError: true,
      };
    }

    // Check that the file exists in the actual file system
    let existingFile: string = '';

    try {
      existingFile = await fileHelpers.readFile(path);
    } catch (err) {
      const errObject = err as { code?: string; message?: string };
      if (errObject.code === 'ENOENT') {
        return {
          content: [{ type: 'text', text: `Error: File "${path}" does not exist on disk. Use create_file to create the file first.` }],
          isError: true,
        };
      }
      return {
        content: [{ type: 'text', text: `Error: ${errObject?.message || errObject?.code || err}` }],
        isError: true,
      };
    }

    // Apply diffs sequentially
    let currentContent = existingFile;
    let totalAdditions = 0;
    let totalRemovals = 0;

    for (const diff of diffs) {
      const diffResult: ApplyPatchResult = applyPatch(currentContent, diff);

      // Type guard for mismatch errors
      if (diffResult.type === 'mismatch') {
        return {
          content: [{ type: 'text', text: generateMismatchReport(path, diff, diffResult.expected as string, diffResult.actual as string, 'documentor') }],
          isError: true,
        };
      }

      // Type guard for invalid_index errors
      if (diffResult.type === 'invalid_index') {
        return {
          content: [{ type: 'text', text: generateValidationReport(path, diff, currentContent, 'documentor') }],
          isError: true,
        };
      }

      // Type guard for empty_update errors
      if (diffResult.type === 'empty_update') {
        return {
          content: [{ type: 'text', text: generateValidationReport(path, diff, currentContent, 'documentor') }],
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
      await fs.promises.writeFile(path, currentContent);
    } catch (err) {
      const errObject = err as { code?: string; message?: string };
      return {
        content: [{ type: 'text', text: `Error: Failed to write file "${path}": ${errObject?.message || errObject?.code || err}` }],
        isError: true,
      };
    }

    return {
      content: [{ type: 'text', text: JSON.stringify({ path, totalAdditions, totalRemovals, finalLineCount: currentContent.split('\n').length }) }],
      isError: false,
    };
  }
);

// Helper function to apply patch (extracted from legacy tool)
function applyPatch(content: string, patch: import('../../../../shared/types/schemas/update-file-schemas').DiffPatch): ApplyPatchResult {
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
      const newContent = lines.slice(0, insertIdx).concat(lines.slice(insertIdx + originalParts.length)).join('\n');
      return { type: 'success', newContent, additions: 0, removals: originalParts.length };
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
      return {
        type: 'mismatch',
        expected: expectedText,
        actual: contentAtStartLine
      };
    }

    // Perform replacement
    const newContent = lines.slice(0, insertIdx).concat(updateParts, lines.slice(insertIdx + originalParts.length)).join('\n');
    return { type: 'success', newContent, additions: updateParts.length, removals: originalParts.length };
  } else {
    // Handle additive patches (insertions)
    lines.splice(insertIdx, 0, ...updateParts);
    const modifiedContent = lines.join('\n');
    return { type: 'success', newContent: modifiedContent, additions: updateParts.length, removals: 0 };
  }
}

// ==========================================
// 3. Export Manifest Definitions For Registry Mapping
// ==========================================
export const documentorToolsManifest = [
  {
    id: 'documentor_save_document',
    name: 'Documentor - Save Document',
    description: SAVE_DOCUMENT_DESC,
    params: saveDocumentSchemaFields,
  },
  {
    id: 'documentor_get_line_content',
    name: 'Documentor - Get Line Content',
    description: GET_LINE_CONTENT_DESC,
    params: getLineContentSchemaFields,
  },
  {
    id: 'documentor_get_diff_template',
    name: 'Documentor - Get Diff Template',
    description: GET_DIFF_TEMPLATE_DESC,
    params: getDiffTemplateSchemaFields,
  },
  {
    id: 'documentor_update_document',
    name: 'Documentor - Update Document',
    description: UPDATE_DOCUMENT_DESC,
    params: updateFileSchemaFields,
  },
];
