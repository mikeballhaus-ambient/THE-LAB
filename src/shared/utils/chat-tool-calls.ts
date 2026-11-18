import type { MCPToolCall, ChatMessage } from '@/shared/types';

export interface AgentToolCallSource {
  tool_calls?: MCPToolCall[];
  hasToolCall?: boolean;
}

/** Normalized access to model tool calls (rm-46 **2.17**). */
export function getMessageToolCalls(message: ChatMessage | undefined): MCPToolCall[] {
  if (!message?.tool_calls?.length) {
    return [];
  }
  return message.tool_calls;
}

export function hasToolCalls(calls: MCPToolCall[] | undefined): boolean {
  return Boolean(calls?.length);
}

export function getAgentToolCalls(agent: AgentToolCallSource): MCPToolCall[] {
  return agent.tool_calls ?? [];
}

export function agentHasToolCalls(agent: AgentToolCallSource): boolean {
  return hasToolCalls(agent.tool_calls) || Boolean(agent.hasToolCall);
}

export function parseToolCallArgumentsJson(
  raw: string | Record<string, unknown> | undefined,
): { success: true; value: Record<string, unknown> } | { success: false; error: string } {
  if (raw === undefined) {
    return {
      success: false,
      error: 'Tool arguments are empty (the model may not have finished the tool JSON yet).',
    };
  }
  if (typeof raw === 'object' && raw !== null && !Array.isArray(raw)) {
    return { success: true, value: { ...raw } };
  }
  if (typeof raw !== 'string' || raw.trim() === '') {
    return {
      success: false,
      error: 'Tool arguments are empty (the model may not have finished the tool JSON yet).',
    };
  }
  try {
    const value = JSON.parse(raw) as unknown;
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return { success: false, error: 'Tool arguments must be a JSON object.' };
    }
    return { success: true, value: value as Record<string, unknown> };
  } catch {
    return { success: false, error: 'Tool arguments are not valid JSON yet.' };
  }
}

/** Accumulate streamed tool argument fragments (string chunks or object snapshots). */
export function mergeToolCallArgumentsJson(existingRaw: string, fragment: unknown): string {
  if (fragment == null) {
    return existingRaw;
  }
  if (typeof fragment === 'string') {
    return existingRaw + fragment;
  }
  if (typeof fragment === 'object' && !Array.isArray(fragment)) {
    let base: Record<string, unknown> = {};
    if (existingRaw.trim()) {
      try {
        const parsed = JSON.parse(existingRaw) as unknown;
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          base = parsed as Record<string, unknown>;
        }
      } catch {
        return existingRaw + JSON.stringify(fragment);
      }
    }
    return JSON.stringify({ ...base, ...(fragment as Record<string, unknown>) });
  }
  return existingRaw + String(fragment);
}

export function normalizeToolCallArgumentsString(args: unknown): string {
  if (args == null) {
    return '';
  }
  if (typeof args === 'string') {
    return args;
  }
  if (typeof args === 'object' && !Array.isArray(args)) {
    return JSON.stringify(args);
  }
  return String(args);
}

const SQLITE_QUERY_ALIASES = ['sql', 'SQL', 'statement', 'select', 'q'] as const;

/** Map common model mistakes to the-lab-db MCP tool parameter names. */
export function coerceToolCallParamsForExecution(
  toolId: string,
  params: Record<string, unknown>,
): Record<string, unknown> {
  if (toolId === 'read_query' || toolId === 'write_query') {
    if (typeof params.query === 'string' && params.query.trim()) {
      return params;
    }
    for (const key of SQLITE_QUERY_ALIASES) {
      const candidate = params[key];
      if (typeof candidate === 'string' && candidate.trim()) {
        return { ...params, query: candidate };
      }
    }
    const stringValues = Object.entries(params).filter(
      ([, v]) => typeof v === 'string' && (v as string).trim(),
    );
    if (stringValues.length === 1) {
      return { ...params, query: stringValues[0][1] };
    }
  }
  return params;
}

function toolCallHasRequiredParams(toolName: string, params: Record<string, unknown>): boolean {
  const coerced = coerceToolCallParamsForExecution(toolName, params);
  if (toolName === 'read_query' || toolName === 'write_query') {
    return typeof coerced.query === 'string' && coerced.query.trim().length > 0;
  }
  return true;
}

/** True when every tool call has a name and parseable JSON arguments object. */
export function areToolCallArgumentsJsonComplete(toolCalls: MCPToolCall[] | undefined): boolean {
  if (!toolCalls?.length) {
    return true;
  }
  return toolCalls.every((tc) => {
    const name = tc.function?.name?.trim();
    if (!name) {
      return false;
    }
    const parsed = parseToolCallArgumentsJson(tc.function.arguments as string | Record<string, unknown> | undefined);
    if (!parsed.success) {
      return false;
    }
    return toolCallHasRequiredParams(name, parsed.value);
  });
}
