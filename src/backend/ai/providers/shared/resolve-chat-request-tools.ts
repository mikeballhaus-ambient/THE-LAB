import type { z } from 'zod';
import * as chatHelper from '../open-ai/chat-helper';
import type { ChatRequestPayload } from '@/shared/types/llm-provider';
import type { MCPToolInterface, MCPToolSchema } from '@/shared/types/mcp-tools';
import { mergePersonaUniversalTools } from '@/shared/constants/lab-session-todo-tools';

export function resolveChatRequestTools<S extends z.ZodTypeAny>(
  tools: MCPToolInterface<S>[],
  config: ChatRequestPayload,
): MCPToolSchema[] {
  const personaAllowed = new Set(mergePersonaUniversalTools(config.personaConfig?.tools ?? []));
  const structural = new Set(config.structuralToolIds ?? []);
  const out: MCPToolSchema[] = [];
  for (const tool of tools) {
    if (personaAllowed.has(tool.id) || structural.has(tool.id)) {
      out.push(chatHelper.toOpenAIToolDefinition(tool));
    }
  }
  return out;
}

/** LM Studio and many local OpenAI-compat servers accept only string tool_choice values. */
export type OpenAiCompatToolChoice = 'auto' | 'none' | 'required';

export function resolveChatRequestToolChoice(
  mcpTools: MCPToolSchema[],
  config: ChatRequestPayload,
): OpenAiCompatToolChoice | undefined {
  if (mcpTools.length === 0) {
    return undefined;
  }
  if (config.requiredStructuralToolId) {
    // Single structural tool in the list — "required" forces a tool call without the
    // `{ type: "function", function: { name } }` object (rejected by LM Studio with 400).
    return 'required';
  }
  return 'auto';
}
