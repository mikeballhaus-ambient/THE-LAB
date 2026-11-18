import type { MCPToolCall } from '@/shared/types';

/** Prefer native stream tool calls; fall back to post-parse extraction (e.g. leaked JSON in content). */
export function resolveStreamingToolCallsForRunner(
  streamToolCalls: MCPToolCall[],
  parsedToolCalls: MCPToolCall[],
): MCPToolCall[] {
  if (streamToolCalls.length > 0) {
    return streamToolCalls;
  }
  return parsedToolCalls;
}

export function shouldRunStreamingToolRunner(resolvedToolCalls: MCPToolCall[]): boolean {
  return resolvedToolCalls.length > 0;
}
