import type { MCPToolCall } from '@/shared/types';
import {
  areToolCallArgumentsJsonComplete,
  normalizeToolCallArgumentsString,
  parseToolCallArgumentsJson,
} from '@/shared/utils/chat-tool-calls';

export interface RejectedToolCall {
  toolName: string;
  error: string;
  argumentsPreview: string;
}

export interface ToolCallTurnValidation {
  executable: MCPToolCall[];
  rejected: RejectedToolCall[];
}

/** Drops tool calls whose arguments are not valid JSON (or required params missing). */
export function validateToolCallsForExecution(toolCalls: MCPToolCall[]): ToolCallTurnValidation {
  const executable: MCPToolCall[] = [];
  const rejected: RejectedToolCall[] = [];

  for (const tc of toolCalls) {
    const name = tc.function?.name?.trim() ?? '';
    const argsRaw = tc.function?.arguments;
    const preview = normalizeToolCallArgumentsString(argsRaw).slice(0, 800);

    if (!name) {
      rejected.push({
        toolName: '(unnamed)',
        error: 'Missing tool name on tool call.',
        argumentsPreview: preview,
      });
      continue;
    }

    if (!areToolCallArgumentsJsonComplete([tc])) {
      const parsed = parseToolCallArgumentsJson(argsRaw);
      rejected.push({
        toolName: name,
        error: parsed.success ? 'Required tool parameters are missing.' : parsed.error,
        argumentsPreview: preview,
      });
      continue;
    }

    const parsed = parseToolCallArgumentsJson(argsRaw);
    if (!parsed.success) {
      rejected.push({ toolName: name, error: parsed.error, argumentsPreview: preview });
      continue;
    }

    executable.push({
      ...tc,
      type: 'function',
      function: {
        name,
        arguments: JSON.stringify(parsed.value),
      },
    });
  }

  return { executable, rejected };
}

export function mergeToolCallValidationFailure(
  base: {
    invalidToolCallExtracted: boolean;
    invalidToolCallError: string;
    invalidToolCallOriginalJson: string;
  },
  rejected: RejectedToolCall[],
): {
  invalidToolCallExtracted: boolean;
  invalidToolCallError: string;
  invalidToolCallOriginalJson: string;
} {
  if (rejected.length === 0) {
    return base;
  }

  const rejectionLines = rejected
    .map((r) => `- **${r.toolName}**: ${r.error}`)
    .join('\n');
  const previews = rejected.map((r) => `### ${r.toolName}\n${r.argumentsPreview}`).join('\n\n');

  const errorParts = [
    base.invalidToolCallExtracted && base.invalidToolCallError ? base.invalidToolCallError : '',
    `The platform rejected ${rejected.length} tool call(s) before execution:\n${rejectionLines}`,
  ].filter(Boolean);

  const jsonParts = [
    base.invalidToolCallOriginalJson?.trim(),
    previews,
  ].filter(Boolean);

  return {
    invalidToolCallExtracted: true,
    invalidToolCallError: errorParts.join('\n\n'),
    invalidToolCallOriginalJson: jsonParts.join('\n\n---\n\n'),
  };
}
