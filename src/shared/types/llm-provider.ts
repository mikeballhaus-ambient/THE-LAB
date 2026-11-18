
import { ChatMessage, ChatPersona, ExtendedFileResolved } from './chat'
import { Persona } from './persona'
import type {
  PlatformLlmReasoningEffort,
  PlatformLlmSamplingOptions,
} from './platform-llm-completion'
import { ProviderConfigBase } from './ai-providers'
import { ProviderUpdateResultData } from './socket-events'
import { MCPToolInterface } from './mcp-tools'
import z from 'zod'

export interface LLMProviderResponse {
    message: ChatMessage
    sender?: 'assistant'
    contextUsedPercentage?: number
}

/**
 * Per-request options for {@link LLMProvider.makeChatRequest}.
 *
 * Lab Assistant sets only `sessionId`, `persona`, and `personaConfig`.
 * Platform jobs (`PlatformLlmCompletionService`) may also set `temperature`, `maxTokens`,
 * `reasoningEffort`, and `sampling`.
 *
 * Every adapter MUST implement {@link LLMProvider.resolveChatRequestOptions} using the
 * shared mapper in `src/backend/ai/providers/shared/chat-request-payload.ts` (omit unset fields).
 */
export interface ChatRequestPayload {
    sessionId: string
    persona: ChatPersona
    personaConfig?: Persona
    /** Platform LLM / agent turns — optional output cap */
    maxTokens?: number
    /** Overrides persona reasoning temperature when set (e.g. Time Wasters agent at 0). */
    temperature?: number
    /** Platform agent turns — maps to provider reasoning_effort / template kwargs when supported. */
    reasoningEffort?: PlatformLlmReasoningEffort
    sampling?: PlatformLlmSamplingOptions
    /**
     * Tool ids included on the request even when absent from persona allowlist
     * (platform agent / structural tools — not executed via MCP).
     */
    structuralToolIds?: string[]
    /** When set with a single structural tool, providers send tool_choice "required" (string, LM Studio–safe). */
    requiredStructuralToolId?: string
}

/** Vendor-neutral options derived from {@link ChatRequestPayload} (OpenAI-compat + Ollama). */
export interface OllamaResolvedChatOptions {
    temperature: number
    num_predict?: number
    top_p?: number
    frequency_penalty?: number
    presence_penalty?: number
    repeat_penalty?: number
}

export interface ResolvedChatRequestOptions {
    temperature: number
    openAiCompatExtras: Record<string, unknown>
    ollamaOptions: OllamaResolvedChatOptions
    /** When defined, set Ollama `think`; when undefined, omit. */
    ollamaThink: boolean | undefined
}

export interface LLMProvider {
    llmProviderConfig: ProviderConfigBase
    /**
     * Map Lab vs platform fields to HTTP-ready options. Implementations must delegate to
     * `mapChatRequestPayload()` in `providers/shared/chat-request-payload.ts`.
     */
    resolveChatRequestOptions(config: ChatRequestPayload): ResolvedChatRequestOptions
    makeChatRequest<S extends z.ZodObject<z.ZodRawShape>>(
        messages: ChatMessage[],
        files: ExtendedFileResolved[] | undefined,
        config: ChatRequestPayload,
        tools: MCPToolInterface<S>[],
        isStream: boolean
    ): Promise<LLMProviderResponse | AsyncGenerator<ChatMessage>>
    initializeModels(): Promise<void>
    summarizeContext(systemSummaryMsg: string, messages: ChatMessage[]): Promise<string>
    getName(): string
    fetchModels(): Promise<string[]>
    testConnection(): Promise<ProviderUpdateResultData>
    embed(text: string): Promise<number[]>
    getContextUsagePercentage(data: unknown, contextWindow: number | undefined): number
}
