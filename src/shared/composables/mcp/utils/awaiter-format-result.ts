import { awaiterSchemaFields, MCPToolCall, MCPToolResponse } from '../../../../shared/types';

export function formatAwaiterToolResult(toolResultContainerClasses: string, toolCall: MCPToolCall, toolResult: MCPToolResponse): string {
  const content = toolResult.content || '';
  const toolParams = JSON.parse(toolCall.function.arguments || '{}')
  // Tool returns raw text from URL (may be JSON or plain text). No JSON.parse needed.
  // Use Zod safeParse to validate and access params
  const paramsResult = awaiterSchemaFields.safeParse(toolParams);
  const displayParams = paramsResult.success ? paramsResult.data : toolParams;

  let htmlOutput = `<div class="${toolResultContainerClasses}"><div class="font-bold text-lab-general-text">Waited time: ${displayParams.waitForSeconds} seconds</div>`;

  if (!toolResult.success) {
    htmlOutput += `<div class="text-red-400 mt-2">Error: ${content}</div>`;
    return htmlOutput + '</div></div>';
  }

  htmlOutput += `<div class="mt-1 text-xs">Supplied context:</div><pre class="mt-1 text-xs bg-lab-general-bg-muted p-2 rounded max-h-[100px] overflow-auto whitespace-pre-wrap">${displayParams.context}</pre>`;

  return htmlOutput + '</div></div>';
}
