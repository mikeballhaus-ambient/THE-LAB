import { MCPToolCall, MCPToolResponse, getLineContentSchemaFields, getDiffTemplateSchemaFields, updateFileSchemaFields } from '../../../../shared/types';
import { escapeHtml } from './base-utils';

export function formatUpdateFileToolResult(toolResultContainerClasses: string, toolCall: MCPToolCall, toolResult: MCPToolResponse): string {
  const content = toolResult.content || '{}';
  const toolParams = JSON.parse(toolCall.function.arguments || '{}');
  let htmlOutput = `<div class="${toolResultContainerClasses}"><div class="font-bold text-lab-general-text">Update File Operations</div><div class="text-lab-general-text">`;

  if (!toolResult.success) {
    htmlOutput += `<div class="text-red-400">Error: ${content}</div>`;
    return htmlOutput + '</div></div>';
  }

  switch (toolCall.function.name) {
    case 'update_file_get_line_content': {
      const lineContentSchema = getLineContentSchemaFields;
      try {
        const params = lineContentSchema.parse(toolParams);
        htmlOutput += `<div class="italic text-lab-general-text">Operation: get_line_content</div>`;
        htmlOutput += `<div>File Path: ${params.path || 'N/A'}</div>`;
        htmlOutput += `<div>Line Number: ${params.line || 'N/A'}</div>`;

        if (content.includes('content')) {
          const data = JSON.parse(content);
          const lineContent = data.content || data || content;
          htmlOutput += `<div class="mt-2 whitespace-pre-wrap max-h-[100px] overflow-auto bg-lab-general-bg-muted p-2 rounded">${escapeHtml(lineContent)}</div>`;
        } else {
          htmlOutput += `<div class="mt-2 whitespace-pre-wrap max-h-[100px] overflow-auto bg-lab-general-bg-muted p-2 rounded">${escapeHtml(content)}</div>`;
        }

        return htmlOutput + '</div></div>';
      } catch {
        htmlOutput += `<div class="text-yellow-400">Could not parse parameters: ${content}</div>`;
        htmlOutput += `<div class="mt-2 whitespace-pre-wrap max-h-[100px] overflow-auto bg-lab-general-bg-muted p-2 rounded">${escapeHtml(content)}</div>`;
        return htmlOutput + '</div></div>';
      }
    }

    case 'update_file_get_diff_template': {
      const diffTemplateSchema = getDiffTemplateSchemaFields;
      try {
        const params = diffTemplateSchema.parse(toolParams);
        htmlOutput += `<div class="italic text-lab-general-text">Operation: update_file_get_diff_template</div>`;
        htmlOutput += `<div>File Path: ${params.path || 'N/A'}</div>`;
        htmlOutput += `<div>Line Range: ${params.start_line || 'N/A'} - ${params.end_line || 'N/A'}</div>`;

        if (content.includes('File:') || content.includes('Lines')) {
          htmlOutput += `<div class="mt-2 whitespace-pre-wrap max-h-[300px] overflow-auto bg-lab-general-bg-muted p-2 rounded text-xs">${escapeHtml(content)}</div>`;
        } else {
          htmlOutput += `<div class="mt-2 whitespace-pre-wrap max-h-[100px] overflow-auto bg-lab-general-bg-muted p-2 rounded">${escapeHtml(content)}</div>`;
        }

        return htmlOutput + '</div></div>';
      } catch {
        htmlOutput += `<div class="text-yellow-400">Could not parse parameters: ${content}</div>`;
        htmlOutput += `<div class="mt-2 whitespace-pre-wrap max-h-[100px] overflow-auto bg-lab-general-bg-muted p-2 rounded">${escapeHtml(content)}</div>`;
        return htmlOutput + '</div></div>';
      }
    }

    case 'update_file_update_file': {
      const updateFileSchema = updateFileSchemaFields;
      try {
        const params = updateFileSchema.parse(toolParams);
        htmlOutput += `<div class="italic text-lab-general-text">Operation: update_file_update_file</div>`;
        htmlOutput += `<div>File Path: ${params.path || 'N/A'}</div>`;
        htmlOutput += `<div>Patch Count: ${params.diffs?.length || 0}</div>`;

        if (content.includes('path') && content.includes('totalAdditions')) {
          const data = JSON.parse(content);
          htmlOutput += `<div class="mt-2">`;
          htmlOutput += `<div>File: <code class="bg-lab-general-bg-muted px-1 rounded">${escapeHtml(data.path || 'N/A')}</code></div>`;
          htmlOutput += `<div>Additions: <span class="text-green-400">${data.totalAdditions || 0}</span></div>`;
          htmlOutput += `<div>Removals: <span class="text-red-400">${data.totalRemovals || 0}</span></div>`;
          htmlOutput += `<div>Final Line Count: <code>${data.finalLineCount || 'N/A'}</code></div>`;
          htmlOutput += `</div>`;
        } else {
          htmlOutput += `<div class="mt-2 whitespace-pre-wrap max-h-[100px] overflow-auto bg-lab-general-bg-muted p-2 rounded">${escapeHtml(content)}</div>`;
        }

        return htmlOutput + '</div></div>';
      } catch {
        htmlOutput += `<div class="text-yellow-400">Could not parse parameters: ${content}</div>`;
        htmlOutput += `<div class="mt-2 whitespace-pre-wrap max-h-[100px] overflow-auto bg-lab-general-bg-muted p-2 rounded">${escapeHtml(content)}</div>`;
        return htmlOutput + '</div></div>';
      }
    }

    default: {
      htmlOutput += `<div class="text-yellow-400">Unknown operation: ${toolCall.function.name}</div>`;
      htmlOutput += `<div class="mt-2 whitespace-pre-wrap max-h-[100px] overflow-auto bg-lab-general-bg-muted p-2 rounded">${escapeHtml(content)}</div>`;
      return htmlOutput + '</div></div>';
    }
  }
}
