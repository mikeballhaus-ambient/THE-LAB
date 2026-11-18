import { MCPToolCall, MCPToolResponse } from '../../../../shared/types';
import { createFileSchemaFields } from '../../../../shared/types/schemas/create-file-schema';
import * as baseUtils from './base-utils';

export function formatCreateFileToolResult(toolResultContainerClasses: string, toolCall: MCPToolCall, toolResult: MCPToolResponse): string {
  void toolResult;
  // Parse the tool parameters to get path, overwrite, and ensureDir values
  const toolParams = JSON.parse(toolCall.function.arguments || '{}');
  const paramsResult = createFileSchemaFields.safeParse(toolParams);
  const overwrite = paramsResult.data?.overwrite;
  const ensureDir = paramsResult.data?.ensureDir;

  let htmlOutput = `<div class="${toolResultContainerClasses}"><div class="text-lab-general-text">`;

  // Handle based on the function name (create_file - single tool in this MCP server)
  if (toolCall.function.name === 'create_file') {
    const { html } = baseUtils.handleNewFileDiff(paramsResult, true);
    
    htmlOutput += html;

    if (overwrite) {
      htmlOutput += `<div class="text-xs text-yellow-400 mt-1">(Overwrote existing file)</div>`;
    }
    if (ensureDir) {
      htmlOutput += `<div class="text-xs text-blue-400 mt-1">(Created parent directories as needed)</div>`;
    }

    return htmlOutput + '</div></div>';
  }

  // Default fallback
  htmlOutput += `<div class="text-lab-general-text-muted">Unknown operation: ${toolCall.function.name}</div>`;
  return htmlOutput + '</div></div>';
}
