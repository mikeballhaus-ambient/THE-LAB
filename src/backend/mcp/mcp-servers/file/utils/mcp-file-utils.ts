import { diffSchemaFieldsSchema } from '../../../../../shared/types';
import { fileHelpers } from '../../../../utils/file-helpers';

// Simple basename implementation without path module dependency
const getBasename = (p: string) => p.split(/[\\/]/).pop() || '';

/**
 * Type for patch application result - shared between UpdateFileTool and DocumentorTool
 */
export type ApplyPatchResult =
  | { type: 'success'; newContent: string; additions: number; removals: number } // Success case
  | { type: 'newline_error'; message: string }
  | { type: 'mismatch'; expected: string; actual: string }
  | { type: 'invalid_index'; line: number; message: string }
  | { type: 'empty_update'; line: number; message: string };

/**
 * Generate detailed validation failure report
 */
export function generateValidationReport(
  filePath: string,
  patch: diffSchemaFieldsSchema,
  currentContent: string,
  toolName: 'update_file' | 'documentor' = 'update_file'
): string {
  const { start_line: patchStartLine, original } = patch;
  const expectedText = original || ''
  const lines = currentContent === '' ? [] : currentContent.split('\n');
  const insertIdx = patchStartLine - 1;

  // Get actual content at target location
  const slice = lines.slice(insertIdx, insertIdx + expectedText.split('\n').length);
  const contentAtStartLine = slice.join('\n');

  // Generate line-by-line comparison
  const expLines = expectedText.split('\n');
  const actLines = contentAtStartLine.split('\n');

  const comparisons: Array<{ line: number; exp: string; act: string; status: 'OK' | 'DIFFER' }> = [];
  const maxLen = Math.max(expLines.length, actLines.length);

  for (let i = 0; i < maxLen; i++) {
    const exp = expLines[i] ?? '(END OF EXPECTED)';
    const act = actLines[i] ?? '(END OF ACTUAL)';
    comparisons.push({
      line: i + 1,
      exp,
      act,
      status: exp === act ? 'OK' : 'DIFFER'
    });
  }

  return `
Validation failed at line ${patchStartLine}

--- MISMATCH DETAILS ---

Expected at start_line:
${expectedText.replace(/\n/g, '\\n')}

Actual content:
${contentAtStartLine.replace(/\n/g, '\\n')}

--- LINE-BY-LINE COMPARISON ---
${JSON.stringify(comparisons, null, 4)}

--- SUGGESTED FIXES ---

1. Use get_diff_template for automatic template generation:
Call get_diff_template with:
- path: ${filePath}
- start_line: ${patchStartLine}
- end_line: ${patchStartLine + 5}

2. Apply ${toolName == 'documentor' ? 'update_document' : 'update_file'} with the generated template

Ensure the 'original' field matches line-by-line including all whitespace`;
}

/**
 * Generate mismatch error report for content validation failures
 */
export function generateMismatchReport(
  filePath: string,
  patch: diffSchemaFieldsSchema,
  expected: string,
  actual: string,
  toolName: 'update_file' | 'documentor' = 'update_file'
): string {
  const { start_line: patchStartLine } = patch;

  // Generate line-by-line comparison
  const expLines = expected.split('\n');
  const actLines = actual.split('\n');

  const comparisons: Array<{ line: number; exp: string; act: string; status: 'OK' | 'DIFFER' }> = [];
  const maxLen = Math.max(expLines.length, actLines.length);

  for (let i = 0; i < maxLen; i++) {
    const exp = expLines[i] ?? '(END OF EXPECTED)';
    const act = actLines[i] ?? '(END OF ACTUAL)';
    comparisons.push({
      line: i + 1,
      exp,
      act,
      status: exp === act ? 'OK' : 'DIFFER'
    });
  }

  return `
Validation failed at line ${patchStartLine}

--- MISMATCH DETAILS ---

Expected content:
${expected.replace(/\n/g, '\\n')}

Actual content:
${actual.replace(/\n/g, '\\n')}

--- LINE-BY-LINE COMPARISON ---
${JSON.stringify(comparisons, null, 4)}

--- SUGGESTED FIXES ---
1. Use get_diff_template for automatic template generation:
Call get_diff_template with:
- path: ${filePath}
- start_line: ${patchStartLine}
- end_line: ${patchStartLine + 10}

2. Apply ${toolName == 'documentor' ? 'update_document' : 'update_file'} with the generated template

Ensure the 'original' field matches line-by-line including all whitespace`;
}

/**
 * Generate a diff template for a specific line range in a file content.
 * @param filePath - Path to the file (relative to project root)
 * @param startLine - Starting line number (1-based)
 * @param endLine - Ending line number (1-based)
 * @param toolName - Name of the tool that will use this template ('update_file' or 'documentor')
 * @param content - The file content to extract lines from
 * @returns Template string with instructions and JSON block for applying changes
 */
export function generateDiffTemplate(
  filePath: string,
  startLine: number,
  endLine: number,
  toolName: 'update_file' | 'documentor' = 'update_file',
  content: string
): string {
  const allLines = content.split('\n');
  const actualStartLine = Math.max(1, startLine);
  const actualEndLine = Math.min(endLine, allLines.length);

  const rangeLines = allLines.slice(actualStartLine - 1, actualEndLine);
  const originalContent = rangeLines.join('\n');

  const jsonSafePath = filePath.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

  const jsonSafeOriginal = originalContent
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n');

  return `File: ${getBasename(filePath)}

Lines ${actualStartLine}-${actualEndLine} of ${allLines.length} total lines.

Raw file content (lines ${actualStartLine}-${actualEndLine}):
${originalContent}

---
To modify this file, call update_document with a diffs array. Each patch object needs:
- start_line: Line number where change starts (1-based)
- original: Exact current text at that line (use \\n for newlines)
- updated: Your replacement text (use \\n for newlines)

Call ${toolName == 'documentor' ? 'update_document' : 'update_file'} with these parameters:
operation: ${toolName == 'documentor' ? 'update_document' : 'update_file'}
path: ${jsonSafePath}
diffs: [{ start_line: ${actualStartLine}, original: "${jsonSafeOriginal}", updated: "[YOUR ESCAPED CONTENT HERE]", is_additive: false }]

IMPORTANT:
- The "original" field must exactly match the file content at start_line (including whitespace)
- Escape all newlines in "updated" using \\n as two characters - do NOT use actual line breaks
- Use get_line_content to verify exact content if needed`;
}

/**
 * Get line content from a file with optional context window.
 * @param filePath - Path to the file (relative to project root)
 * @param lineNumber - Line number to get (1-based)
 * @param toolCallId - Tool call ID for response
 * @param functionName - Function name for response
 * @param includeContext - Whether to include context window (±2 lines)
 * @returns MCPToolResponse with line content
 */
export async function handleGetLineContent(
  filePath: string,
  lineNumber: number | undefined,
  toolCallId: string,
  functionName: string,
  includeContext: boolean = false
): Promise<{ type: 'tool_result'; tool_call_id: string; function: string; content: string; success: boolean }> {
  try {
    // Check if file exists using fileHelpers
    let existingFile: string;
    try {
      existingFile = await fileHelpers.readFile(filePath);
    } catch (err) {
      return {
        type: 'tool_result',
        tool_call_id: toolCallId,
        function: functionName,
        content: `Cannot read file: ${err instanceof Error ? err.message : 'Unknown error'}`,
        success: false
      };
    }

    // Validate lineNumber - must be a defined positive integer
    if (lineNumber === undefined || lineNumber === null) {
      return {
        type: 'tool_result',
        tool_call_id: toolCallId,
        function: functionName,
        content: `line number must be defined`,
        success: false
      };
    }

    // Strict type check: ensure lineNumber is actually a positive integer
    if (typeof lineNumber !== 'number' || !Number.isInteger(lineNumber) || lineNumber <= 0) {
      return {
        type: 'tool_result',
        tool_call_id: toolCallId,
        function: functionName,
        content: `Invalid line number: ${lineNumber}. Must be a positive integer.`,
        success: false
      };
    }

    // Normalize line endings - with null/empty check
    if (!existingFile || existingFile.length === 0) {
      return {
        type: 'tool_result',
        tool_call_id: toolCallId,
        function: functionName,
        content: `File is empty or null`,
        success: false
      };
    }

    const content = existingFile.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    const contextLines = content.split('\n');
    const targetLineIndex = lineNumber - 1; // Convert 1-based to 0-based

    if (includeContext) {
      // Get context window (±2 lines from target line)
      const contextStart = Math.max(0, targetLineIndex - 2);
      const contextEnd = Math.min(content.split('\n').length, targetLineIndex + 3);
      const preview = contextLines.slice(contextStart, contextEnd).join('\n');

      // Get exact line content
      const lineIndex = targetLineIndex >= contextLines.length
        ? contextLines.length - 1
        : targetLineIndex;
      const lineContent = lineIndex < 0 ? '' : contextLines[lineIndex];

      return {
        type: 'tool_result',
        tool_call_id: toolCallId,
        function: functionName,
        success: true,
        content: JSON.stringify({
          content: lineContent,
          line: lineNumber,
          context: {
            start_line: contextStart + 1, // 1-based
            end_line: contextEnd, // 1-based
            preview
          }
        })
      };
    } else {
      // Get exact line content only
      const lineIndex = targetLineIndex >= contextLines.length
        ? contextLines.length - 1
        : targetLineIndex;
      const lineContent = lineIndex < 0 ? '' : contextLines[lineIndex];

      return {
        type: 'tool_result',
        tool_call_id: toolCallId,
        function: functionName,
        success: true,
        content: lineContent
      };
    }
  } catch (error) {
    return {
      type: 'tool_result',
      tool_call_id: toolCallId,
      function: functionName,
      content: `Error in get_line_content: ${error instanceof Error ? error.message : 'Unknown error'}`,
      success: false
    };
  }
}
