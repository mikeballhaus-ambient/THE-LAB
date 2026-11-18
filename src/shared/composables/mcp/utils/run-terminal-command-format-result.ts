import { runTerminalCommandSchemaFields, MCPToolCall, MCPToolResponse } from '../../../../shared/types';

export function formatRunTerminalCommandToolResult(toolResultContainerClasses: string, toolCall: MCPToolCall, toolResult: MCPToolResponse): string {
  const content = toolResult.content || '{}';

  // Use Zod safeParse to validate and access params
  const toolParams = JSON.parse(toolCall.function.arguments || '{}')
  const paramsResult = runTerminalCommandSchemaFields.safeParse(toolParams);
  const command = paramsResult.data?.command;

  let htmlOutput = `<div class="${toolResultContainerClasses}"><div class="font-bold text-lab-general-text">Run Terminal Command Result</div><div class="text-lab-general-text">`;
  htmlOutput += `<div>Command: <code class="bg-lab-general-bg-muted px-1 py-0.5 rounded text-lab-general-text">${command || 'N/A'}</code></div>`;

  if (!toolResult.success) {
    htmlOutput += `<div class="text-red-400 mt-2">Error: ${content}</div>`;
    return htmlOutput + '</div></div>';
  }

  return htmlOutput + '</div></div>';
}
