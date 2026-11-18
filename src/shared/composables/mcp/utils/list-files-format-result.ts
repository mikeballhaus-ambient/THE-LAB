import { ListFilesParamsSchema } from '../../../../shared/types/schemas/list-files-schema';
import { MCPToolCall, MCPToolResponse } from '../../../../shared/types';
export function formatListFilesToolResult(toolResultContainerClasses: string, toolCall: MCPToolCall, toolResult: MCPToolResponse): string {
  const content = toolResult.content || '{}';
  // Tool returns JSON: JSON.stringify(files, null, 2)
  let data: Record<string, unknown> = {};
  try {
    data = JSON.parse(content) as Record<string, unknown>;
  } catch {
    // Fallback if content is not valid JSON
    data = { files: [] };
  }

  const toolParams = JSON.parse(toolCall.function.arguments || '{}')
  // Use Zod safeParse to validate and access params
  const paramsResult = ListFilesParamsSchema.safeParse(toolParams);
  const path = paramsResult.data?.path;
  const recursive = paramsResult.data?.recursive;

  let htmlOutput = `<div class="${toolResultContainerClasses}"><div class="font-bold text-lab-general-text">List Files Result</div><div class="text-lab-general-text">`;
  htmlOutput += `<div class="italic text-xs">Path: <code class="bg-lab-general-bg-muted px-1 py-0.5 rounded text-lab-general-text">${path || '.'}</code></div>`;

  if (!toolResult.success) {
    htmlOutput += `<div class="text-red-400 mt-2">Error: ${content}</div>`;
    return htmlOutput + '</div></div>';
  }

  if (recursive) {
    htmlOutput += `<div class="text-xs text-lab-general-text-muted mt-1">(Recursive listing)</div>`;
  } else {
    htmlOutput += `<div class="text-xs text-lab-general-text-muted mt-1">(Non-recursive listing)</div>`;
  }

  const files = data.files || data;
  if (Array.isArray(files)) {
    if (files.length > 0) {
      htmlOutput += `<div class="mt-2 font-semibold text-lab-general-text max-h-[100px] overflow-auto">Paths:</div>`;
      files.forEach(file => {
        htmlOutput += `<div class="border border-lab-general-border rounded p-1 text-xs">  - ${file}</div>`;
      });
    } else {
      htmlOutput += `<div class="text-lab-general-text-muted">No files or directories found.</div>`;
    }
  } else {
    htmlOutput += `<div class="text-xs whitespace-pre-wrap max-h-[100px] overflow-auto">${JSON.stringify(files).substring(0, 500)}</div>`;
  }

  return htmlOutput + '</div></div>';
}
