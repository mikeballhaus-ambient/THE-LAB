import type { MCPToolCall } from './mcp-tools';

/** HTTP timeout for app → platform agent-turn complete (ms). */
export const PLATFORM_AGENT_TURN_HTTP_TIMEOUT_MS = 90_000;

/**
 * Platform LLM completion API — for app servers and backend jobs, not the Lab Assistant chat UI.
 * Uses the acting user's Settings → AI Provider chat model (OpenAI, Ollama, LM Studio, etc.).
 *//** OpenAI-compatible reasoning control (LM Studio `/api/v0/chat/completions`, some cloud APIs). */
export type PlatformLlmReasoningEffort =
  | 'none'
  | 'minimal'
  | 'low'
  | 'medium'
  | 'high'
  | 'xhigh';

export interface PlatformLlmCompletionRequest {
  /** Audit / logging label, e.g. `word-tile.tile-word-grid.agent-turn` */
  purpose: string;
  system: string;
  user: string;
  temperature?: number;
  /** Cap completion length (passed to provider as max_tokens when supported). */
  maxTokens?: number;
  /**
   * Disable or limit model "thinking" / reasoning channel (Qwen3.x in LM Studio).
   * Mapped for OpenAI-compatible `POST /v1/chat/completions` (and LM Studio compat): `none` →
   * `reasoning_effort: "none"` + `chat_template_kwargs.enable_thinking: false`; any other value →
   * `enable_thinking: true` only (binary thinking on Qwen3 — not o-series effort tiers).
   */
  reasoningEffort?: PlatformLlmReasoningEffort;
  /** Provider sampling (LM Studio / Ollama where supported). */
  sampling?: PlatformLlmSamplingOptions;
  /**
   * Server-resolved structural tool (mock function the model must call).
   * App sends the id only — full JSON Schema is registered on the platform backend
   * via `registerPlatformStructuralTool()`. Any registered id is accepted; an
   * unregistered id is ignored (the turn falls back to prose parsing).
   */
  structuralTool?: string;
  /**
   * Within-turn history: prior assistant tool_calls + tool role results (validation errors).
   * Sent on retry so the model sees official tool feedback, not only prose in the user message.
   */
  toolFeedbackTurns?: PlatformLlmToolFeedbackTurn[];
  /** Final user nudge after `toolFeedbackTurns`, or standalone hint when the model omitted a tool call. */
  retryUserHint?: string;
}

/** One rejected structural tool call to replay in the next completion request. */
export interface PlatformLlmToolFeedbackTurn {
  toolCallId: string;
  toolName: string;
  arguments: string;
  /** Tool role message body (plain text or JSON — shown to the model). */
  resultContent: string;
}

/** OpenAI-compatible + common local-model fields for agent turns. */
export interface PlatformLlmSamplingOptions {
  top_p?: number;
  repeat_penalty?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
}

export interface PlatformLlmCompletionResult {
  content: string;
  model: string;
  provider: string;
  toolCalls?: MCPToolCall[];
}

export interface PlatformLlmCompletionError {
  success: false;
  error: string;
  code?: 'NO_PROVIDER' | 'PROVIDER_ERROR' | 'EMPTY_RESPONSE';
}

export interface PlatformLlmCompletionSuccess {
  success: true;
  data: PlatformLlmCompletionResult;
}

export type PlatformLlmCompletionResponse =
  | PlatformLlmCompletionSuccess
  | PlatformLlmCompletionError;

/** Streaming delta from platform LLM (SSE / agent thinking UI). */
export type PlatformLlmStreamDelta =
  | { kind: 'text'; text: string }
  | { kind: 'channels'; reasoning: string; content: string };

export type PlatformLlmStreamDeltaPayload = {
  text?: string;
  reasoning?: string;
  content?: string;
  /** App UI: rejected agent move attempt (e.g. invalid word) — not model token stream. */
  agentAttemptNote?: string;
};

export function platformLlmStreamDeltaToPayload(
  delta: PlatformLlmStreamDelta,
): PlatformLlmStreamDeltaPayload {
  if (delta.kind === 'channels') {
    return { reasoning: delta.reasoning, content: delta.content };
  }
  return { text: delta.text };
}

export function platformLlmStreamDeltaFromPayload(
  payload: PlatformLlmStreamDeltaPayload,
): PlatformLlmStreamDelta | null {
  if (payload.reasoning !== undefined || payload.content !== undefined) {
    return {
      kind: 'channels',
      reasoning: payload.reasoning ?? '',
      content: payload.content ?? '',
    };
  }
  if (payload.text) {
    return { kind: 'text', text: payload.text };
  }
  return null;
}
