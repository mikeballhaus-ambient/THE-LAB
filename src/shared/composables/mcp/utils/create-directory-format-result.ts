import { MCPToolCall, MCPToolResponse } from '../../../../shared/types';

export function formatCreateDirectoryToolResult(toolResultContainerClasses: string, toolCall: MCPToolCall, toolResult: MCPToolResponse): string {
  const content = toolResult.content || '{}';
  let htmlOutput = `<div class="${toolResultContainerClasses}"><div class="font-bold text-lab-general-text">Create Directory</div><div class="text-lab-general-text">`;

  if (!toolResult.success) {
    htmlOutput += `<div class="text-red-400">Error: ${content}</div>`;
    return htmlOutput + '</div></div>';
  }

  const toolParams = JSON.parse(toolCall.function.arguments || '{}');
  const { path, recursive } = toolParams;

  htmlOutput += `<div class="italic text-lab-general-text">Operation: create-directory</div>`;
  htmlOutput += `<div>Path: <code>${path || 'N/A'}</code></div>`;
  if (recursive !== undefined) {
    htmlOutput += `<div>Recursive: ${recursive ? 'true' : 'false'}</div>`;
  }

  htmlOutput += `<div class="text-green-400 mt-2">✓ ${content}</div>`;

  return htmlOutput + '</div></div>';
}
