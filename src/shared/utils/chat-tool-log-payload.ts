import type { MCPToolCall, MCPToolResponse, UIChatMessage } from '@/shared/types';
import { isRecord } from '@/shared/utils/record-narrowing';

export function toolPayloadFromSystemLog(data: unknown): {
  toolCall?: MCPToolCall;
  toolResult?: MCPToolResponse;
} {
  if (!isRecord(data)) {
    return {};
  }
  const toolCall = (data.toolCall ?? data.toolcall) as MCPToolCall | undefined;
  const toolResult = (data.toolResult ?? data.toolresult) as MCPToolResponse | undefined;
  return { toolCall, toolResult };
}

function isMcpToolCall(value: unknown): value is MCPToolCall {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    value.type === 'function' &&
    isRecord(value.function) &&
    typeof value.function.name === 'string'
  );
}

export function resolveToolCallFromLogData(data: unknown): MCPToolCall | undefined {
  const wrapped = toolPayloadFromSystemLog(data);
  if (wrapped.toolCall) {
    return wrapped.toolCall;
  }
  if (isMcpToolCall(data)) {
    return data;
  }
  return undefined;
}

export function summarizeToolResultMessage(
  message: UIChatMessage,
  getMcpToolName: (toolCall: MCPToolCall) => string,
): string {
  const { toolCall } = toolPayloadFromSystemLog(message.systemLog?.data);
  const fromRegistry = toolCall ? getMcpToolName(toolCall) : '';
  const name =
    fromRegistry.trim() ||
    message.systemLog?.title ||
    toolCall?.function?.name ||
    'Tool';
  const ok =
    message.systemLog?.success || toolCall?.function?.name === 'run_terminal_command';
  return `${name} — ${ok ? 'Success' : 'Failed'}`;
}
