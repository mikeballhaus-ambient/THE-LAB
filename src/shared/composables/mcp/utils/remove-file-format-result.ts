import { MCPToolCall, MCPToolResponse, FileChanges, removeFileSchemaFields as RemoveFileParamsSchema } from '../../../../shared/types';
import * as baseUtils from './base-utils'

export function formatRemoveFileToolResult(toolResultContainerClasses: string, toolCall: MCPToolCall, toolResult: MCPToolResponse): string {
    const content = toolResult.content || '';
    const toolParams = JSON.parse(toolCall.function.arguments || '{}')
    // Use Zod safeParse to validate and access params
    const paramsResult = RemoveFileParamsSchema.safeParse(toolParams);

    const { html } = baseUtils.handleRemoveFile(toolResultContainerClasses, paramsResult, true) as FileChanges;

    const recursive = paramsResult.data?.recursive;
    const force = paramsResult.data?.force;

    let htmlOutput = html;

    if (!toolResult.success) {
      htmlOutput += `<div class="text-red-400 mt-2">Error: ${content}</div>`;
      return htmlOutput + '</div></div>';
    }

    if (recursive) {
      htmlOutput += `<div class="text-xs text-lab-general-text-muted mt-1">(Recursive removal)</div>`;
    }
    if (force) {
      htmlOutput += `<div class="text-xs text-lab-general-text-muted mt-1">(Forced removal)</div>`;
    }

    return htmlOutput + '</div></div>';
}
