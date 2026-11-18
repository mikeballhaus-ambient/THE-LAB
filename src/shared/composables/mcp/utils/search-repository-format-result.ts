import { searchRepositorySchemaFields, MCPToolCall, MCPToolResponse } from '../../../../shared/types';

export function formatSearchRepositoryToolResult(toolResultContainerClasses: string, toolCall: MCPToolCall, toolResult: MCPToolResponse): string {
  const content = toolResult.content || '{}';
  const toolParams = JSON.parse(toolCall.function.arguments || '{}')
  // Tool returns JSON array of search results
  // Parse parameters for metadata (path, regex, file_pattern)
  const paramsResult = searchRepositorySchemaFields.safeParse(toolParams);
  const path = paramsResult.data?.path;
  const regex = paramsResult.data?.regex;
  const filePattern = paramsResult.data?.file_pattern;

  let data: Record<string, unknown>[] = [];
  try {
    data = JSON.parse(content) as Record<string, unknown>[];
  } catch {
    // Fallback if content is not valid JSON
    data = [];
  }

  let htmlOutput = `<div class="${toolResultContainerClasses}"><div class="font-bold text-lab-general-text">Search Repository Result</div><div class="text-lab-general-text">`;
  htmlOutput += `<div class="text-xs">Scanned directory: <code class="bg-lab-general-bg-muted px-1 rounded text-lab-general-text">${path || 'N/A'}</code></div>`;
  if (regex) {
    htmlOutput += `<div class="text-xs">Regex pattern: <code class="bg-lab-general-bg-muted px-1 rounded text-lab-general-text">${regex}</code></div>`;
  }
  if (filePattern) {
    htmlOutput += `<div class="text-xs">File pattern: <code class="bg-lab-general-bg-muted px-1 rounded text-lab-general-text">${filePattern}</code></div>`;
  }

  if (!toolResult.success) {
    htmlOutput += `<div class="text-red-400 mt-2">Error: ${content}</div>`;
    return htmlOutput + '</div></div>';
  }

  htmlOutput += `<div class="mt-2 font-semibold text-lab-general-text">Found ${data.length} match${data.length > 1 ? 'es' : ''}:</div>`;
  htmlOutput += `<div class="mt-2 space-y-1 max-h-[100px] overflow-auto">`;

  if (data.length > 0) {
    data.forEach((result, index) => {
      const filePath = String(result.file ?? 'Unknown file');
      // Convert full path to relative path from repo root
      let relativePath: string = filePath;
      // Convert full path to relative path from repo root (remove /Users/mikeb/source/repos/LLM_Workspace/the-lab prefix)
      if (typeof filePath === 'string') {
        const normalizedPath = filePath.replace(/\\/g, '/');
        const repoRoot = '/the-lab/';
        const rootStartIndex = normalizedPath.indexOf(repoRoot);
        if (rootStartIndex !== -1) {
          relativePath = normalizedPath.slice(rootStartIndex + repoRoot.length);
        }
      }
      const lineNum = Number(result.line ?? 0);
      const matchedText = String(result.match ?? '');
      const context = String(result.context ?? '');

      htmlOutput += `<div class="border border-lab-general-border rounded p-1.5 text-xs">`;
      htmlOutput += `<div class="font-semibold text-lab-general-text">${index + 1}. <span class="text-blue-400">${relativePath}</span>:<span class="text-lab-general-text-muted"> line ${lineNum}</span></div>`;
      htmlOutput += `<div class="text-lab-general-text-muted text-xs mt-1 whitespace-pre-wrap"><span class="text-lab-general-text-muted bg-lab-general-bg-muted px-1 rounded font-mono text-[10px]">Matched:</span> ${matchedText}</div>`;
      if (context && context !== matchedText) {
        htmlOutput += `<div class="text-lab-general-text-muted text-xs mt-0.5 whitespace-pre-wrap text-[10px]">Context: ${context}</div>`;
      }
      htmlOutput += `</div>`;
    });
    htmlOutput += '</div>';
  } else {
    htmlOutput += `<div class="mt-2 text-lab-general-text-muted">No matches found.</div>`;
  }

  return htmlOutput + '</div></div>';
}
