import { MCPToolCall, MCPToolResponse } from '../../../../shared/types';

export function formatDocumentorToolResult(toolResultContainerClasses: string, toolCall: MCPToolCall, toolResult: MCPToolResponse): string {
  const content = toolResult.content || '{}';
  const toolParams = JSON.parse(toolCall.function.arguments || '{}');
  let htmlOutput = `<div class="${toolResultContainerClasses}"><div class="font-bold text-lab-general-text">Documentor Tool</div><div class="text-lab-general-text">`;

  if (!toolResult.success) {
    htmlOutput += `<div class="text-red-400">Error: ${content}</div>`;
    return htmlOutput + '</div></div>';
  }

  switch (toolCall.function.name) {
    case 'documentor_save_document': {
      const { path, overwrite } = toolParams;

      htmlOutput += `<div class="italic text-lab-general-text">Operation: documentor_save_document</div>`;
      htmlOutput += `<div>File Path: <code>${path || 'N/A'}</code></div>`;
      htmlOutput += `<div>Overwrite: ${overwrite ? 'true' : 'false'}</div>`;

      try {
        const data = JSON.parse(content);
        htmlOutput += `<div class="text-green-400 mt-2">Success!</div>`;
        htmlOutput += `<div>Lines Written: ${data.lineCount || 'N/A'}</div>`;
        htmlOutput += `<div>Bytes Written: ${data.bytesWritten || 'N/A'}</div>`;
      } catch {
        htmlOutput += `<div class="text-lab-general-text mt-2">${content}</div>`;
      }

      return htmlOutput + '</div></div>';
    }

    case 'documentor_get_line_content': {
      const { path, line } = toolParams;

      htmlOutput += `<div class="italic text-lab-general-text">Operation: documentor_get_line_content</div>`;
      htmlOutput += `<div>File Path: <code>${path || 'N/A'}</code></div>`;
      htmlOutput += `<div>Line Number: ${line || 'N/A'}</div>`;

      try {
        const data = JSON.parse(content);
        htmlOutput += `<div class="text-green-400 mt-2">Success!</div>`;
        htmlOutput += `<pre class="bg-lab-general-bg-muted p-2 rounded text-lab-general-text whitespace-pre-wrap max-h-[200px] overflow-auto">${data.content || data.text || content}</pre>`;
      } catch {
        htmlOutput += `<div class="text-lab-general-text mt-2">${content}</div>`;
      }

      return htmlOutput + '</div></div>';
    }

    case 'documentor_get_diff_template': {
      const { path, start_line, end_line } = toolParams;

      htmlOutput += `<div class="italic text-lab-general-text">Operation: documentor_get_diff_template</div>`;
      htmlOutput += `<div>File Path: <code>${path || 'N/A'}</code></div>`;
      htmlOutput += `<div>Start Line: ${start_line || 'N/A'}</div>`;
      htmlOutput += `<div>End Line: ${end_line || 'N/A'}</div>`;

      try {
        const data = JSON.parse(content);
        htmlOutput += `<div class="text-green-400 mt-2">Success!</div>`;
        htmlOutput += `<pre class="bg-lab-general-bg-muted p-2 rounded text-lab-general-text whitespace-pre-wrap max-h-[300px] overflow-auto">${data || content}</pre>`;
      } catch {
        htmlOutput += `<div class="text-lab-general-text mt-2">${content}</div>`;
      }

      return htmlOutput + '</div></div>';
    }

    case 'documentor_update_document': {
      const { path } = toolParams;

      htmlOutput += `<div class="italic text-lab-general-text">Operation: documentor_update_document</div>`;
      htmlOutput += `<div>File Path: <code>${path || 'N/A'}</code></div>`;

      try {
        const data = JSON.parse(content);
        htmlOutput += `<div class="text-green-400 mt-2">Success!</div>`;
        htmlOutput += `<div>Additions: ${data.totalAdditions || 0}</div>`;
        htmlOutput += `<div>Removals: ${data.totalRemovals || 0}</div>`;
        htmlOutput += `<div>Final Line Count: ${data.finalLineCount || 'N/A'}</div>`;
      } catch {
        htmlOutput += `<div class="text-lab-general-text mt-2">${content}</div>`;
      }

      return htmlOutput + '</div></div>';
    }

    default: {
      htmlOutput += `<div class="italic text-lab-general-text-muted max-h-[100px] overflow-auto">Unknown operation: ${toolCall.function.name}</div>`;
      return htmlOutput + '</div></div>';
    }
  }
}
