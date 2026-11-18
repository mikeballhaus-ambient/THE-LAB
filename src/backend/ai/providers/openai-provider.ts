import OpenAI from 'openai';
import { ModelsPage } from 'openai/resources/models.mjs'
import * as chatHelper from './open-ai/chat-helper'
import {
  ChatMessage,
  ChatRequestPayload,
  ChatRole,
  DoneReason,
  ExtendedFileResolved,
  LLMProvider,
  LLMProviderResponse,
  ResolvedChatRequestOptions,
  MCPToolCall,
  MCPToolInterface,
  ProviderConfigBase,
  ProviderUpdateResultData
} from '../../../shared/types';
import { z } from "zod";
import { VSCodeLogger } from '../../../backend/utils/logger';
import { resolveProviderCapabilities } from '../../../shared/config/lab-provider-capabilities';
import {
  streamOpenAiCompatEventsToChatMessages,
  type OpenAiCompatStreamEvent,
} from './shared/open-ai-compat-chat-stream';
import { mapChatRequestPayload } from './shared/chat-request-payload';
import {
  resolveChatRequestToolChoice,
  resolveChatRequestTools,
} from './shared/resolve-chat-request-tools';
import { normalizeOpenAiCompatibleBaseUrl } from '../../../shared/utils/openai-compatible-base-url';
import { ChatCompletion } from "openai/resources/chat/completions";
import { ChatCompletionCreateParamsNonStreaming } from 'openai/resources/index.js';

export class OpenAIAdapter implements LLMProvider {
  private client: OpenAI;
  llmProviderConfig!: ProviderConfigBase

  constructor(llmProviderConfig: ProviderConfigBase) {
    this.llmProviderConfig = llmProviderConfig;
    this.client = new OpenAI({
      apiKey: '',
      baseURL: 'https://api.openai.com/v1'
    })
  }

  resolveChatRequestOptions(config: ChatRequestPayload): ResolvedChatRequestOptions {
    return mapChatRequestPayload(config);
  }

  private syncClientFromConfig(): string {
    const apiKey = this.llmProviderConfig.apiKey;
    if (apiKey) {
      this.client.apiKey = apiKey;
    }
    const effectiveBase = normalizeOpenAiCompatibleBaseUrl(this.llmProviderConfig.baseUrl);
    this.client.baseURL = effectiveBase;
    return effectiveBase;
  }

  public getContextUsagePercentage(data: ChatMessage[], contextWindow: number | undefined): number {
    let total = 0;

    for (const m of data) {
      const text = m.content;
      const chars = text.length;

      const contentTokens = Math.ceil(chars / 4);
      const overhead = 6;

      total += contentTokens + overhead;
    }

    if (contextWindow === 0 || total === 0) {
      return 0;
    }

    const usagePercentage = contextWindow ? (total / contextWindow) * 100 : 0;

    return Number(usagePercentage.toFixed(4));
  }

  public async embed(text: string): Promise<number[]> {
    const apiKey = this.llmProviderConfig.apiKey || this.llmProviderConfig.apiKey
    const baseUrl = this.llmProviderConfig.baseUrl || this.llmProviderConfig.baseUrl
    const model = this.llmProviderConfig.model

    if (apiKey) this.client.apiKey = apiKey
    if (baseUrl) this.client.baseURL = baseUrl
    if (!model) throw new Error("No embedding model configured for OpenAI")

    const trimmed = text.trim()
    if (!trimmed) return []

    const res = await this.client.embeddings.create({
      model,
      input: trimmed,
      // LM Studio and other OpenAI-compatible servers return float arrays, not base64.
      // SDK v6+ defaults to base64 and mis-decodes them (e.g. 1024 → 256 garbage values).
      encoding_format: 'float',
    })

    return res.data[0].embedding
  }

  async makeChatRequest<S extends z.ZodObject<z.ZodRawShape>>(messages: ChatMessage[],
    files: ExtendedFileResolved[] | undefined,
    config: ChatRequestPayload,
    tools: MCPToolInterface<S>[],
    isStream: boolean): Promise<LLMProviderResponse | AsyncGenerator<ChatMessage>> {
    if (!isStream) {
      return this.chat(messages, files, config, tools)
    } else {
      return this.streamChat(messages, files, config, tools)
    }
  }

  async chat<S extends z.ZodObject<z.ZodRawShape>>(messages: ChatMessage[],
    files: ExtendedFileResolved[] | undefined,
    config: ChatRequestPayload,
    tools: MCPToolInterface<S>[]): Promise<LLMProviderResponse> {
    try {
      const mcpTools = resolveChatRequestTools(tools, config);
      const toolChoice = resolveChatRequestToolChoice(mcpTools, config);

      const logger = await VSCodeLogger.getInstance()
      logger.json('[OPENAI]: chat request sent', { messages: messages.length, model: this.llmProviderConfig.model })

      const apiKey = this.llmProviderConfig.apiKey;
      const baseUrl = this.llmProviderConfig.baseUrl;

      if (apiKey) this.client.apiKey = apiKey;
      if (baseUrl) this.client.baseURL = baseUrl;

      if (files && files.length > 0) messages.splice(1, 0, { role: 'user', content: chatHelper.resolveFiles(files) })

      const resolvedMessages = messages.map(message => chatHelper.toOpenAIMessage(message))
      const mapped = this.resolveChatRequestOptions(config);
      const request = {
        model: this.llmProviderConfig.model || 'gpt-4o',
        messages: resolvedMessages,
        ...(mcpTools.length > 0 ? { tools: mcpTools } : {}),
        temperature: mapped.temperature,
        stream: false,
        ...(toolChoice ? { tool_choice: toolChoice, parallel_tool_calls: true } : {}),
        ...mapped.openAiCompatExtras,
      } as ChatCompletionCreateParamsNonStreaming

      const response = await this.client.chat.completions.create(request) as ChatCompletion;

      const choice = response.choices?.[0] as ChatCompletion.Choice;
      if (!choice) {
        throw new Error("No choices returned from completion");
      }

      const msg = choice.message;

      const role: ChatRole = msg.role as ChatRole;
      let content = "";
      let reasoning = "";
      let sawRefusal = false;
      let sawToolCall = false;
      const mcpToolCallsResolved: MCPToolCall[] = [];

      // 1. Handle normal assistant text
      if (typeof msg.content === "string") {
        content = msg.content;
      }

      const reasoningContent = (msg as { reasoning_content?: string }).reasoning_content;
      if (typeof reasoningContent === 'string') {
        reasoning = reasoningContent;
      }

      // 2. Handle tool calls (Chat Completions format)
      if (msg.tool_calls && msg.tool_calls.length > 0) {
        sawToolCall = true;

        for (const tc of msg.tool_calls) {
          if (tc.type === "function") {
            mcpToolCallsResolved.push({
              type: "function",
              id: tc.id,
              function: {
                name: tc.function.name,
                arguments: tc.function.arguments
              }
            });
          }
        }

      }

      // 3. Handle refusal (Chat Completions embeds refusal in content)
      if (choice.finish_reason === "content_filter") {
        sawRefusal = true;
      }

      // Infer doneReason
      let doneReason: DoneReason = "stop";

      if (sawToolCall) {
        doneReason = "tool_calls";
      } else if (sawRefusal) {
        doneReason = "content_filter";
      }

      const chatMesssage = {
        role,
        content: typeof content === 'string' ? content.trim() : content,
        reasoning,
        tool_calls: mcpToolCallsResolved,
        doneReason,
        isComplete: true
      } as ChatMessage;

      logger.json('[OPENAI]: response received', { model: response.model, contentLength: JSON.stringify(chatMesssage).length })

      return {
        message: chatMesssage,
        sender: 'assistant',
        contextUsedPercentage: this.getContextUsagePercentage([...messages, chatMesssage], this.llmProviderConfig.maxContext ? parseInt(this.llmProviderConfig.maxContext) : undefined)
      } as LLMProviderResponse

    } catch (error) {
      return {
        sender: 'assistant', contextUsedPercentage: 0, message: {
          role: 'assistant',
          content: `Stream chat failed: ${error instanceof Error ? error.message : "Unknown error"}`,
          isError: true
        } as ChatMessage
      } as LLMProviderResponse
    }
  }

  async * streamChat<S extends z.ZodObject<z.ZodRawShape>>(messages: ChatMessage[],
    files: ExtendedFileResolved[] | undefined,
    config: ChatRequestPayload,
    tools: MCPToolInterface<S>[]): AsyncGenerator<ChatMessage> {
    try {
      const logger = await VSCodeLogger.getInstance()
      logger.json('[OPENAI]: streaming chat request sent', { messages: messages.length, model: this.llmProviderConfig.model })
      const mcpTools = resolveChatRequestTools(tools, config);
      const toolChoice = resolveChatRequestToolChoice(mcpTools, config);

      const apiKey = this.llmProviderConfig.apiKey;
      const baseUrl = this.llmProviderConfig.baseUrl;

      if (files && files.length > 0) {
        messages.splice(1, 0, { role: 'user', content: chatHelper.resolveFiles(files) })
      }
      if (apiKey) this.client.apiKey = apiKey;
      if (baseUrl) this.client.baseURL = baseUrl;

      const resolvedMessages = messages.map(message => chatHelper.toOpenAIMessage(message))

      const mapped = this.resolveChatRequestOptions(config);
      const stream = await this.client.chat.completions.stream({
        model: this.llmProviderConfig.model || 'gpt-4o',
        messages: resolvedMessages,
        temperature: mapped.temperature,
        ...mapped.openAiCompatExtras,
        ...(mcpTools.length > 0 ? { tools: mcpTools } : {}),
        stream: true,
        stream_options: {
          "include_usage": true
        },
        ...(toolChoice ? { tool_choice: toolChoice } : {}),
        parallel_tool_calls: true
      });

      const maxContext = this.llmProviderConfig.maxContext
        ? parseInt(this.llmProviderConfig.maxContext, 10)
        : undefined;

      async function* sdkEvents(): AsyncGenerator<OpenAiCompatStreamEvent> {
        for await (const event of stream) {
          yield {
            usage: event.usage
              ? { total_tokens: event.usage.total_tokens ?? undefined }
              : undefined,
            choices: event.choices?.map((choice) => ({
              delta: choice.delta
                ? {
                    role: choice.delta.role ?? undefined,
                    content: choice.delta.content,
                    reasoning_content: (choice.delta as { reasoning_content?: string }).reasoning_content,
                    tool_calls: choice.delta.tool_calls?.map((tc) => ({
                      index: tc.index,
                      id: tc.id,
                      type: tc.type,
                      function: tc.function
                        ? {
                            name: tc.function.name ?? undefined,
                            arguments: tc.function.arguments ?? undefined,
                          }
                        : undefined,
                    })),
                  }
                : undefined,
              finish_reason: choice.finish_reason,
            })),
          };
        }
      }

      yield* streamOpenAiCompatEventsToChatMessages(sdkEvents(), { maxContext });
    } catch (error) {
      yield {
        role: 'assistant',
        content: `Stream chat failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        isError: true,
        isComplete: true,
      } as ChatMessage;
    }
  }

  public async fetchModels(): Promise<string[]> {
    const logger = await VSCodeLogger.getInstance()

    try {
      this.syncClientFromConfig();

      const response = await this.client.models.list() as ModelsPage

      // Extract model IDs
      return response.data.map(m => m.id)
    } catch (error: unknown) {
      logger.error(`[OPENAI]: Failed to fetch models: ${error}`)
      return []
    }
  }

  public async testConnection(): Promise<ProviderUpdateResultData> {
    const logger = await VSCodeLogger.getInstance()
    const providerLabel = this.getName();

    try {
      const effectiveBase = this.syncClientFromConfig();
      const selectedModel = this.llmProviderConfig.model?.trim() ?? '';

      const response = await this.client.models.list();

      if (!selectedModel) {
        const count = response.data.length;
        return {
          success: true,
          message: `Connected to ${providerLabel} at ${effectiveBase}. ${count} model(s) available — use Fetch Models and pick one.`,
        } as ProviderUpdateResultData;
      }

      const exists = response.data.some(m => m.id === selectedModel);

      if (!exists) {
        return {
          success: false,
          message: `Connected to ${providerLabel}, but model "${selectedModel}" is not in the list at ${effectiveBase}. Use Fetch Models or check the id in LM Studio.`,
        } as ProviderUpdateResultData;
      }

      const profile = resolveProviderCapabilities(providerLabel, this.llmProviderConfig).profile;

      return {
        success: true,
        message: `Connected (${profile}) and model "${selectedModel}" is available at ${effectiveBase}.`,
      } as ProviderUpdateResultData;

    } catch (error: unknown) {
      logger.error(`[OPENAI]: Connection test failed: ${error}`)
      const effectiveBase = normalizeOpenAiCompatibleBaseUrl(this.llmProviderConfig.baseUrl);
      const message = error instanceof Error ? error.message : String(error);

      return {
        success: false,
        message: `Failed to connect to ${providerLabel} at ${effectiveBase}: ${message}`,
      } as ProviderUpdateResultData
    }
  }

  public async initializeModels(): Promise<void> {
    const logger = await VSCodeLogger.getInstance()
    logger.info('[OPENAI]: Model already warm (cloud service)')
  }

  public async summarizeContext(systemSummaryMsg: string, messages: ChatMessage[]): Promise<string> {
    const prompt = `
${systemSummaryMsg}:

${messages.map((m: ChatMessage) => `${(m?.role ? m.role.toUpperCase() : 'user')}: ${m.content}`).join('\n\n')}
`

    const apiKey = this.llmProviderConfig.apiKey;
    const baseUrl = this.llmProviderConfig.baseUrl;

    if (apiKey) this.client.apiKey = apiKey;
    if (baseUrl) this.client.baseURL = baseUrl;

    const summaryRequest: ChatCompletionCreateParamsNonStreaming = {
      model: this.llmProviderConfig.model || 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      stream: false,
      max_tokens: 1024,
    };
    const response = await this.client.chat.completions.create(summaryRequest);

    const content = response.choices?.[0]?.message?.content
    const reasoningContent = (response.choices?.[0]?.message as { reasoning_content?: string }).reasoning_content

    let finalContent = ''
    if (reasoningContent) finalContent += reasoningContent
    if (content) finalContent += `${(reasoningContent ? '\n\n' : '')} ${content}`

    return finalContent || ''
  }

  public getName(): string {
    return this.llmProviderConfig.provider?.trim() || 'OpenAI';
  }
}
