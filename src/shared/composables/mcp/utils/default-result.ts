import { MCPToolCall, MCPToolResponse } from '../../../../shared/types';
import { escapeHtml } from './base-utils';

function formatMcpResultContent(content: string): string {
  try {
    const parsed: unknown = JSON.parse(content);
    if (Array.isArray(parsed) && parsed.length > 0) {
      let contentFormatted = '';
      parsed.forEach((item) => {
        if (item && typeof item === 'object' && 'text' in item && typeof item.text === 'string') {
          try {
            contentFormatted += JSON.stringify(JSON.parse(item.text), null, 2);
          } catch {
            contentFormatted += item.text;
          }
        }
      });
      if (contentFormatted) {
        return contentFormatted;
      }
    }
  } catch {
    // Plain text or non-JSON MCP payload
  }
  return content;
}

export function formatDefaultResult(
  toolResultContainerClasses: string,
  _toolCall: MCPToolCall,
  toolResult: MCPToolResponse,
): string {
  const content = toolResult.content || '';
  let htmlOutput = `<div class="${toolResultContainerClasses}"><div class="font-bold text-lab-general-text"></div>`;

  if (!toolResult.success) {
    htmlOutput += `<div class="text-red-400 mt-2">Error: ${escapeHtml(content)}</div>`;
    return htmlOutput + '</div></div>';
  }

  const contentFormatted = escapeHtml(formatMcpResultContent(content));
  htmlOutput += `<div class="mt-1 text-xs">Supplied context:</div><pre class="mt-1 text-xs bg-lab-general-bg-muted p-2 rounded max-h-[100px] overflow-auto whitespace-pre-wrap">${contentFormatted}</pre>`;

  return htmlOutput + '</div></div>';
}
