import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import fs from 'fs/promises';
import { TypeCheckVaildator } from '../../../utils/type-script-validator';
import { LintValidator } from '../../../utils/lint-file';
import { readFileSchemaFields as ReadFileParamsSchema } from '../../../../shared/types';
import { fileHelpers } from '../../../utils/file-helpers';

// 1. Initialize the native Read File Server
export const readFileMcpServer = new McpServer({
  name: 'system-read-file-server',
  version: '1.0.0',
});

const READ_FILE_DESC = `Reads text-based files from the filesystem with optional pagination and type/lint checking. Returns content with metadata prefix indicating line numbers (START, TOTAL, RETURNED).`;

// Schema for Read File Tool
export const readFileSchemaFields = ReadFileParamsSchema;

readFileMcpServer.registerTool(
  'read_file',
  {
    description: READ_FILE_DESC,
    inputSchema: readFileSchemaFields,
  },
  async ({ path: filePath, offset = 0, limit = 500, typecheck = false, lint = false }) => {
    try {
      const resolvedPath = fileHelpers.resolveWorkspacePath(filePath);

      // Check if file exists
      const exists = await fs.stat(resolvedPath).catch(() => false);
      if (!exists) {
        return {
          content: [{ type: 'text', text: `File '${resolvedPath}' does not exist.` }],
          isError: true,
        };
      }

      // Read file content - normalize line endings (handle both CRLF and LF)
      const content = await fs.readFile(resolvedPath, 'utf-8');

      // Normalize CRLF to LF for consistent line splitting
      const normalizedContent = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
      const lines = normalizedContent.split('\n');
      const totalLines = lines.length;

      // Convert offset from 1-based line number to 0-based index for array access
      // If offset is 0, treat it as 1 (start from first line)
      let offsetAsLineNumber: number;
      if (offset !== undefined && offset > 0) {
        offsetAsLineNumber = offset;
      } else {
        offsetAsLineNumber = 1;
      }

      // Convert to 0-based index for array slice operations
      // subtract 1 to convert 1-based line number to 0-based index
      const startLine: number = offsetAsLineNumber - 1;

      // Check if line number exceeds total lines
      if (startLine >= totalLines) {
        return {
          content: [{ type: 'text', text: `(START:${offsetAsLineNumber}, TOTAL:${totalLines}, RETURNED:0)\n` }],
          isError: false,
        };
      }

      // Get lines from offset to limit
      let returnedLines: string[];
      if (limit !== undefined && limit > 0) {
        returnedLines = lines.slice(startLine, startLine + limit);
      } else {
        // Return all lines from offset to end
        returnedLines = lines.slice(startLine);
      }

      const returnedCount = returnedLines.length;
      const contentText = returnedLines.join('\n');

      // Add metadata prefix indicating line numbers (1-based)
      const metadataPrefix = `(START:${offsetAsLineNumber}, TOTAL:${totalLines}, RETURNED:${returnedCount})`;

      // Initialize content with metadata + file content
      let fullContent = `${metadataPrefix}\n${contentText}`;

      // Run type checking if requested
      if (typecheck) {
        const lower = resolvedPath.toLowerCase();
        if (lower.endsWith('.ts') || lower.endsWith('.tsx') || lower.endsWith('.vue')) {
          const validateTS = await TypeCheckVaildator.run(resolvedPath);
          if (!validateTS.success) {
            fullContent = `${fullContent}\n\n## Type Checking Errors\n\n${validateTS.output}`;
          }
        }
      }

      // Run linting if requested
      if (lint) {
        const lower = resolvedPath.toLowerCase();
        if (
          lower.endsWith('.vue') ||
          lower.endsWith('.js') ||
          lower.endsWith('.jsx') ||
          lower.endsWith('.cjs') ||
          lower.endsWith('.mjs') ||
          lower.endsWith('.ts') ||
          lower.endsWith('.tsx')
        ) {
          const validateLint = await LintValidator.run(resolvedPath);
          if (!validateLint.success) {
            fullContent = `${fullContent}\n\n## Linting Errors\n\n${validateLint.output}`;
          }
        }
      }

      return {
        content: [{ type: 'text', text: fullContent }],
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
export const readFileToolsManifest = [
  {
    id: 'read_file',
    name: 'Read File',
    description: READ_FILE_DESC,
    params: readFileSchemaFields,
  },
];
