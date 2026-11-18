import { removeDirectorySchemaFields, MCPToolCall, MCPToolResponse } from '../../../../shared/types';

export function formatRemoveDirectoryToolResult(toolResultContainerClasses: string, toolCall: MCPToolCall, toolResult: MCPToolResponse): string {
  const content = toolResult.content || '';
  const toolParams = JSON.parse(toolCall.function.arguments || '{}')
  // Use Zod safeParse to validate and access params
  const paramsResult = removeDirectorySchemaFields.safeParse(toolParams);
  const path = paramsResult.data?.path;
  const recursive = paramsResult.data?.recursive;
  const force = paramsResult.data?.force;

  let htmlOutput = `<div class="${toolResultContainerClasses}"><div class="font-bold text-lab-general-text">Remove Directory Result</div><div class="text-lab-general-text">`;
  htmlOutput += `<div>Path: <code class="bg-lab-general-bg-muted px-1 py-0.5 rounded text-lab-general-text">${path || 'N/A'}</code></div>`;

  if (recursive !== undefined) {
    htmlOutput += `<div class="text-xs text-lab-general-text-muted mt-1">Recursive: <code>${recursive.toString()}</code></div>`;
  }
  if (force !== undefined) {
    htmlOutput += `<div class="text-xs text-lab-general-text-muted mt-1">Force: <code>${force.toString()}</code></div>`;
  }

  if (!toolResult.success) {
    htmlOutput += `<div class="text-red-400 mt-2">Error: ${content}</div>`;
    return htmlOutput + '</div></div>';
  }

  return htmlOutput + '</div></div>';
}
