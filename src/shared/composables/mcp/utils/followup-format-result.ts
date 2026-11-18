// FollowupTool Format Result Helper
// Parses FollowupTool output and converts to structured format for UI rendering
// See: docs/followup-tool/documentation/detailed-implementation-plan-1.md Section 6

import { MCPToolCall, MCPToolResponse } from '../../../../shared/types';
import * as baseUtils from './base-utils';

/**
 * Format FollowupTool result for UI rendering
 *
 * This function parses the HTML output from FollowupTool and converts it to a structured format
 * that can be used by the FollowupOptions component for rendering.
 *
 * @param toolResultContainerClasses - CSS classes for the result container
 * @param toolCall - MCP tool call metadata
 * @param toolResult - Tool response containing HTML content
 * @returns Formatted HTML string ready for UI rendering
 */
export function formatFollowupToolResult(
  toolResultContainerClasses: string,
  toolCall: MCPToolCall,
  toolResult: MCPToolResponse
): string {
  const content = toolResult.content || '';

  const toolParams = JSON.parse(toolCall.function.arguments || '{}');

  let htmlOutput = `<div class="${toolResultContainerClasses}">`;

  const isSuccess = toolResult.success

  if (isSuccess) {
    // Add success indicator
    htmlOutput += `<div class="text-green-400 mb-2">Followup question generated</div>`;

    // Display the tool call arguments (the actual followup parameters)
    htmlOutput += `
    <div class="text-lab-general-text mb-2">
      <div class="font-semibold text-lab-general-text mb-1">Followup Parameters:</div>
      
      <div class="mb-1"><span class="font-semibold">Question:</span> ${baseUtils.escapeHtml(toolParams.question || 'N/A')}</div>
      <div class="mb-1"><span class="font-semibold">Type:</span> ${toolParams.type || 'N/A'}</div>
      <div class="mb-1"><span class="font-semibold">Persona:</span> ${baseUtils.escapeHtml(toolParams.persona || 'N/A')}</div>
      
      <div class="mt-2 mb-1"><span class="font-semibold">Options (${toolParams.options.length}):</span></div>
      <ul class="list-disc list-inside text-lab-general-text ml-2">`;

    // Display each option with its properties
    toolParams.options.forEach((option: Record<string, unknown>) => {
      const label = typeof option.label === 'string' ? option.label : 'N/A';
      const optionId = typeof option.id === 'string' ? option.id : undefined;
      const description = typeof option.description === 'string' ? option.description : undefined;
      htmlOutput += `
      <li class="mb-1">
        <span class="font-semibold">${baseUtils.escapeHtml(label)}</span>
        ${optionId ? `<code class="text-xs bg-lab-general-bg-muted px-1 rounded ml-2">${baseUtils.escapeHtml(optionId)}</code>` : ''}
        ${description ? `<br/><span class="text-xs text-lab-general-text-muted">(${baseUtils.escapeHtml(description)})</span>` : ''}
        ${option.userValueRequired === true ? '<span class="text-xs text-yellow-400 ml-2">(User input required)</span>' : ''}
        ${option.selected === true ? '<span class="text-xs text-green-400 ml-2">[selected]</span>' : ''}
      </li>`;
    });

    htmlOutput += `
      </ul>
      
      ${toolParams.defaultSelection ? `<div class="mt-1 text-xs text-blue-400">Default selection: <code>${baseUtils.escapeHtml(toolParams.defaultSelection)}</code></div>` : ''}
    </div>
  </div></div>`;

  } else {
    // Display failure content
    htmlOutput += `
    <div class="text-red-400 mb-2">
      <div class="font-semibold text-red-300 mb-1">Tool call failed</div>
      
      <div class="text-lab-general-text whitespace-pre-wrap">
        ${baseUtils.escapeHtml(content)}
      </div>
    </div>
  </div></div>`;
  }

  return htmlOutput;
}