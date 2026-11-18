import { webFetchSchemaFields, MCPToolCall, MCPToolResponse } from '../../../../shared/types';

export function formatWebFetchToolResult(toolResultContainerClasses: string, toolCall: MCPToolCall, toolResult: MCPToolResponse): string {
  const content = toolResult.content || '';
  const toolParams = JSON.parse(toolCall.function.arguments || '{}')
  // Tool returns raw text from URL (may be JSON or plain text). No JSON.parse needed.
  // Use Zod safeParse to validate and access params
  const paramsResult = webFetchSchemaFields.safeParse(toolParams);
  const url = paramsResult.data?.url;

  let htmlOutput = `<div class="${toolResultContainerClasses}"><div class="font-bold text-lab-general-text">Web Fetch Result</div>`;
  htmlOutput += `<div class="text-lab-general-text">URL: <code class="bg-lab-general-bg-muted px-1 py-0.5 rounded text-lab-general-text">${url || 'N/A'}</code></div>`;

  if (!toolResult.success) {
    htmlOutput += `<div class="text-red-400 mt-2">Error: ${content}</div>`;
    return htmlOutput + '</div></div>';
  }

  htmlOutput += `<pre class="mt-2 text-xs bg-lab-general-bg-muted p-2 rounded max-h-[100px] overflow-auto whitespace-pre-wrap">${content.substring(0, 500)}${content.length > 500 ? '. ..' : ''}</pre>`;

  return htmlOutput + '</div></div>';
}
