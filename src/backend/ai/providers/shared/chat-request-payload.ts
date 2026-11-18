import type {
  ChatRequestPayload,
  OllamaResolvedChatOptions,
  ResolvedChatRequestOptions,
} from '@/shared/types/llm-provider';
import type { PersonaReasoning } from '@/shared/types';

/**
 * Canonical mapping from {@link ChatRequestPayload} → provider HTTP fields.
 *
 * **Contract (all LLM adapters MUST use this module):**
 * - Lab Assistant passes only `sessionId`, `persona`, `personaConfig` → extras stay empty;
 *   temperature comes from persona; Ollama `think` stays off (historical default).
 * - Platform LLM (`/api/platform/llm/*`) may set `temperature`, `maxTokens`, `sampling`,
 *   `reasoningEffort` → mapped per vendor below; unset fields are omitted (never guessed).
 *
 * Adapters expose this via {@link LLMProvider.resolveChatRequestOptions}; see `chat-request-payload.test.ts`.
 */

export type OpenAiCompatRequestExtras = Record<string, unknown>;

/** @deprecated Use {@link ResolvedChatRequestOptions} from `@/shared/types/llm-provider`. */
export type MappedChatRequestPayload = ResolvedChatRequestOptions;

export type OllamaMappedOptions = OllamaResolvedChatOptions;

/** Persona reasoning temperature, or platform override, or 0.7 default. */
export function resolveRequestTemperature(config: ChatRequestPayload): number {
  if (config.temperature != null) {
    return config.temperature;
  }
  if (config.personaConfig?.reasoning) {
    return Object.values(config.personaConfig.reasoning as PersonaReasoning)[0];
  }
  return 0.7;
}

/**
 * OpenAI-compatible APIs (OpenAI SDK, LM Studio `/v0/chat/completions`, etc.).
 * Unknown fields are omitted so Lab chat payloads are unchanged.
 */
export function buildOpenAiCompatRequestExtras(
  config: ChatRequestPayload,
): OpenAiCompatRequestExtras {
  const extras: OpenAiCompatRequestExtras = {};
  if (config.maxTokens != null) {
    extras.max_tokens = config.maxTokens;
  }
  if (config.reasoningEffort != null) {
    if (config.reasoningEffort === 'none') {
      extras.reasoning_effort = 'none';
      extras.chat_template_kwargs = { enable_thinking: false };
    } else {
      // OpenAI-compatible servers (LM Studio /v1, local Qwen3): thinking is on/off via template kwargs,
      // not OpenAI o-series granular reasoning_effort levels — omit effort string when enabling.
      extras.chat_template_kwargs = { enable_thinking: true };
    }
  }
  if (config.sampling) {
    const s = config.sampling;
    if (s.top_p != null) {
      extras.top_p = s.top_p;
    }
    if (s.repeat_penalty != null) {
      extras.repeat_penalty = s.repeat_penalty;
    }
    if (s.frequency_penalty != null) {
      extras.frequency_penalty = s.frequency_penalty;
    }
    if (s.presence_penalty != null) {
      extras.presence_penalty = s.presence_penalty;
    }
  }
  return extras;
}

/**
 * Ollama `think` flag. Lab chat (no `reasoningEffort`) → `false` (existing behavior).
 * Platform `none` → `false`; any other effort → `true` (best-effort for thinking models).
 */
export function resolveOllamaThink(config: ChatRequestPayload): boolean {
  if (config.reasoningEffort == null) {
    return false;
  }
  if (config.reasoningEffort === 'none') {
    return false;
  }
  return true;
}

export function buildOllamaOptionsFromPayload(config: ChatRequestPayload): OllamaMappedOptions {
  const options: OllamaMappedOptions = {
    temperature: resolveRequestTemperature(config),
  };
  if (config.maxTokens != null) {
    options.num_predict = config.maxTokens;
  }
  if (config.sampling) {
    const s = config.sampling;
    if (s.top_p != null) {
      options.top_p = s.top_p;
    }
    if (s.repeat_penalty != null) {
      options.repeat_penalty = s.repeat_penalty;
    }
    if (s.frequency_penalty != null) {
      options.frequency_penalty = s.frequency_penalty;
    }
    if (s.presence_penalty != null) {
      options.presence_penalty = s.presence_penalty;
    }
  }
  return options;
}

/** Single entry point for all adapters. */
export function mapChatRequestPayload(config: ChatRequestPayload): ResolvedChatRequestOptions {
  return {
    temperature: resolveRequestTemperature(config),
    openAiCompatExtras: buildOpenAiCompatRequestExtras(config),
    ollamaOptions: buildOllamaOptionsFromPayload(config),
    ollamaThink: resolveOllamaThink(config),
  };
}
