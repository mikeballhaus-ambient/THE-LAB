import { MCPToolCall, MCPToolResponse } from '../../../../shared/types';
import { resolveLibrarySchemaFields, queryDocsSchemaFields } from '../../../../shared/types/schemas/context7-schema';

export function formatContext7ToolResult(toolResultContainerClasses: string, toolCall: MCPToolCall, toolResult: MCPToolResponse): string {
  const content = toolResult.content || '{}';
  const toolParams = JSON.parse(toolCall.function.arguments || '{}')
  let htmlOutput = `<div class="${toolResultContainerClasses}"><div class="font-bold text-lab-general-text">context_7 Documentation</div><div class="text-lab-general-text">`;

  if (!toolResult.success) {
    htmlOutput += `<div class="text-red-400">Error: ${content}</div>`;
    return htmlOutput + '</div></div>';
  }

  if (toolCall.function.name === 'context7_resolve_library_id') {
    const {libraryName, resolveQuery } = resolveLibrarySchemaFields.parse(toolParams)

    htmlOutput += `<div class="italic text-lab-general-text">Operation: context7_resolve_library_id</div>`;
    htmlOutput += `<div>Library Name: ${libraryName || 'N/A'}</div>`;
    htmlOutput += `<div>Search Query: ${resolveQuery || 'N/A'}</div>`;

    if (content.includes('context7CompatibleLibraryID')) {
      const data = JSON.parse(content);
      const libId = data.context7CompatibleLibraryID || 'N/A';
      htmlOutput += `<div>Library ID: <code>${libId}</code></div>`;
    }
  }
  else if (toolCall.function.name === 'context7_query_docs') {
    const {libraryId, docsQuery } = queryDocsSchemaFields.parse(toolParams)

    htmlOutput += `<div class="italic text-lab-general-text">Operation: context7_query_docs</div>`;
    htmlOutput += `<div>Library ID: ${libraryId || 'N/A'}</div>`;
    htmlOutput += `<div>Documentation Query: ${docsQuery || 'N/A'}</div>`;

    if (content.includes('documentation')) {
      const data = JSON.parse(content);
      const documentation = data.documentation || data.content || content;
      htmlOutput += `<div class="mt-2 whitespace-pre-wrap max-h-[100px] overflow-auto">${documentation.length > 0 ? documentation : '[No documentation returned]'}</div>`;

      return htmlOutput + '</div></div>';
    }
  }
  else {
    htmlOutput += '<div class="italic text-lab-general-text-muted max-h-[100px] overflow-auto">Available fields in response:</div>';
    const data = JSON.parse(content);
    Object.keys(data).forEach(key => {
      const value = (data as Record<string, unknown>)[key];
      if (typeof value === 'string') {
        const formattedValue = value.replace(/\n/g, '<br/>');
        htmlOutput += `<div class="mt-1 text-lab-general-text">- <span class="font-semibold text-lab-general-text">${key}:</span> ${formattedValue.substring(0, 500)}${formattedValue.length > 500 ? ' ... (truncated)' : ''}</div>`;
      } else {
        htmlOutput += `<div class="mt-1 text-lab-general-text">- <span class="font-semibold text-lab-general-text">${key}:</span> <code>${JSON.stringify(value).substring(0, 500)}</code><span class="text-xs text-lab-general-text-muted">(${JSON.stringify(value).length > 500 ? 'truncated' : ''})</span></div>`;
      }
    });
  }

  return htmlOutput + '</div></div>';
}
