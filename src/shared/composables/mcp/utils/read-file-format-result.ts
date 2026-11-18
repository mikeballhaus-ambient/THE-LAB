import { MCPToolCall, MCPToolResponse } from '../../../../shared/types';

export function formatReadFileToolResult(toolResultContainerClasses: string, toolCall: MCPToolCall, toolResult: MCPToolResponse): string {
  const content = toolResult.content || '{}';
  
  let htmlOutput = `<div class="${toolResultContainerClasses}"><div class="font-bold text-lab-general-text">Read File</div><div class="text-lab-general-text">`;

  if (!toolResult.success) {
    htmlOutput += `<div class="text-red-400">Error: ${content}</div>`;
    return htmlOutput + '</div></div>';
  }

  // Parse the content to extract metadata and file content
  const lines = content.split('\n');
  
  // First line is metadata prefix (START, TOTAL, RETURNED)
  let metadataLine = '';
  let contentLines: string[] = [];
  
  if (lines.length > 0 && lines[0].startsWith('(')) {
    metadataLine = lines[0];
    contentLines = lines.slice(1);
  } else {
    contentLines = lines;
  }

  htmlOutput += `<div class="italic text-lab-general-text-muted mb-1">${metadataLine || 'No metadata available'}</div>`;

  // Display file content with line numbers
  if (contentLines.length > 0) {
    const displayLines = contentLines.slice(0, 50); // Limit to first 50 lines for display
    htmlOutput += `<div class="whitespace-pre-wrap max-h-[200px] overflow-auto">`;
    
    displayLines.forEach((line, index) => {
      const lineNum = index + 1;
      htmlOutput += `<div class="flex"><span class="w-8 text-right pr-2 text-lab-general-text-muted">${lineNum}</span><span>${line}</span></div>`;
    });

    if (contentLines.length > 50) {
      htmlOutput += `<div class="text-lab-general-text-muted mt-1">... and ${contentLines.length - 50} more lines</div>`;
    }
    
    htmlOutput += '</div>';
  }

  // Display type checking errors if present
  if (content.includes('## Type Checking Errors')) {
    const typeCheckMatch = content.match(/## Type Checking Errors\n([\s\S]*?)(?:##|$)/);
    if (typeCheckMatch) {
      htmlOutput += `<div class="mt-2"><div class="font-semibold text-yellow-400">Type Checking Errors</div><div class="whitespace-pre-wrap max-h-[150px] overflow-auto bg-black p-2 rounded">${typeCheckMatch[1]}</div></div>`;
    }
  }

  // Display linting errors if present
  if (content.includes('## Linting Errors')) {
    const lintMatch = content.match(/## Linting Errors\n([\s\S]*?)(?:##|$)/);
    if (lintMatch) {
      htmlOutput += `<div class="mt-2"><div class="font-semibold text-red-400">Linting Errors</div><div class="whitespace-pre-wrap max-h-[150px] overflow-auto bg-black p-2 rounded">${lintMatch[1]}</div></div>`;
    }
  }

  return htmlOutput + '</div></div>';
}
