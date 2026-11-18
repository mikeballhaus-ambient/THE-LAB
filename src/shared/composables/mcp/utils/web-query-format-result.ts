import { MCPToolCall, MCPToolResponse, webQuerySchemaFields } from '@/shared/types';

export function formatWebQueryToolResult(toolResultContainerClasses: string, toolCall: MCPToolCall, toolResult: MCPToolResponse): string {
  const content = toolResult.content || '';
  // Tool returns JSON: JSON.stringify(response.data.results, null, 2) - JSON.parse is correct here
  let data: Record<string, unknown> = {};
  try {
    data = JSON.parse(content) as Record<string, unknown>;
  } catch {
    // Fallback if content is not valid JSON
    data = { results: [] };
  }

  const toolParams = JSON.parse(toolCall.function.arguments || '{}')
  // Use Zod safeParse to validate and access params
  const paramsResult = webQuerySchemaFields.safeParse(toolParams);
  const query = paramsResult.data?.query;
  const maxResults = paramsResult.data?.max_results;

  let htmlOutput = `<div class="${toolResultContainerClasses}"><div class="font-bold text-lab-general-text">Web Query Result</div>`;
  htmlOutput += `<div class="text-lab-general-text">Query: <code class="bg-lab-general-bg-muted px-1 py-0.5 rounded text-lab-general-text">${query || 'N/A'}</code></div>`;

  if (!toolResult.success) {
    htmlOutput += `<div class="text-red-400 mt-2">Error: ${content}</div>`;
    return htmlOutput + '</div></div>';
  }

  if (maxResults !== undefined) {
    htmlOutput += `<div class="text-xs text-lab-general-text-muted mt-1">Max Results: ${maxResults}</div>`;
  }

  if (data.results && Array.isArray(data.results)) {
    const resultCount = data.results.length;
    htmlOutput += `<div class="mt-2 font-semibold text-lab-general-text">Found ${resultCount} result(s):</div>`;
    htmlOutput += `<ul class="space-y-1 max-h-[100px] overflow-auto">`;
    (data.results as Record<string, unknown>[]).forEach((result, index) => {
      const title = String(result.title ?? 'Untitled');
      const url = String(result.url ?? 'No URL');
      const description = String(result.description ?? result.text ?? result.snippet ?? 'No description');
      htmlOutput += `<li class="border border-lab-general-border rounded p-1 text-xs">
                        <div class="font-semibold text-lab-general-text">${index + 1}. <a href="${url}" class="text-blue-400 hover:text-blue-300 break-all">${title}</a></div>
                        <div class="text-lab-general-text-muted mt-1">${description}</div>
                    </li>`;
    });
    htmlOutput += '</ul>';
  } else {
    htmlOutput += `<div class="mt-2 text-xs max-h-[100px] overflow-auto">Results: ${JSON.stringify(data.results || data).substring(0, 500)}${JSON.stringify(data.results || data).length > 500 ? '. ..' : ''}</div>`;
  }

  return htmlOutput + '</div></div>';
}
