import { Ollama, ChatRequest, ChatResponse } from 'ollama'
import { VSCodeLogger } from '../../utils/logger'
import { streamOllamaPartsToChatMessages } from './ollama/ollama-chat-stream'
import { normalizeOllamaToolCalls } from './ollama/ollama-tool-calls'
import { normalizeMessagesForOllamaChat } from './ollama/ollama-messages'
import {
  ChatMessage,
  LLMProvider,
  LLMProviderResponse,
  ChatRequestPayload,
  OllamaResolvedChatOptions,
  ResolvedChatRequestOptions,
  ProviderConfigBase,
  ProviderUpdateResultData,
  ExtendedFileResolved,
  MCPToolInterface,
} from '../../../shared/types'
import type { z } from 'zod';
import { mapChatRequestPayload } from './shared/chat-request-payload';
import {
  resolveChatRequestToolChoice,
  resolveChatRequestTools,
} from './shared/resolve-chat-request-tools';
/**
 * OllamaAdapter — batch + stream chat with native MCP tools (same as other providers).
 */

export class OllamaAdapter implements LLMProvider {

  private client: Ollama
  llmProviderConfig!: ProviderConfigBase

  constructor(llmProviderConfig: ProviderConfigBase) {
    this.llmProviderConfig = llmProviderConfig;
    this.client = new Ollama({
      host: llmProviderConfig.baseUrl || `${process.env.VITE_API_BASE_URL}:11434`
    })
  }

  resolveChatRequestOptions(config: ChatRequestPayload): ResolvedChatRequestOptions {
    return mapChatRequestPayload(config);
  }

  public async embed(text: string): Promise<number[]> {
    const model = this.llmProviderConfig.model
    if (!model) throw new Error("No embedding model configured for Ollama")

    const trimmed = text.trim()
    if (!trimmed) return []

    const res = await this.client.embed({
      model: this.llmProviderConfig.model,
      input: trimmed,
    })

    return res.embeddings[0];
  }


  public async fetchModels(): Promise<string[]> {
    try {
      const available = await this.client.list()
      return available.models.map(m => m.name)
    } catch (error) {
      const logger = await VSCodeLogger.getInstance()
      logger.error(`[OLLAMA]: Failed to fetch models: ${error}`)
      return []
    }
  }

  public async testConnection(): Promise<ProviderUpdateResultData> {
    const logger = await VSCodeLogger.getInstance()

    try {
      // 1. Ping the server
      const available = await this.client.list()

      // 2. Verify the selected model exists
      const selectedModel = this.llmProviderConfig.model
      const exists = available.models.some(m => m.name === selectedModel)

      if (!exists) {
        return {
          success: false,
          message: `Connected to Ollama, but model "${selectedModel}" is not installed on ${this.llmProviderConfig.baseUrl}.`
        } as ProviderUpdateResultData
      }

      return {
        success: true,
        message: `Connected to Ollama and model "${selectedModel}" is available.`
      } as ProviderUpdateResultData

    } catch (error: unknown) {
      logger.error(`[OLLAMA]: Connection test failed: ${error}`)

      return {
        success: false,
        message: `Failed to connect to Ollama at ${this.llmProviderConfig.baseUrl}: ${error instanceof Error ? error.message : String(error)}`
      } as ProviderUpdateResultData
    }
  }

  /** Settings → API Management maxContext mapped to Ollama `num_ctx`. */
  private resolveNumCtx(): number | undefined {
    const raw = this.llmProviderConfig.maxContext;
    if (raw === undefined || raw === null || raw === '') {
      return undefined;
    }
    const n = parseInt(String(raw), 10);
    if (Number.isNaN(n) || n <= 0) {
      return undefined;
    }
    return n;
  }

  private buildChatOptions(mappedOptions: OllamaResolvedChatOptions): {
    temperature: number;
    num_ctx?: number;
    num_predict?: number;
    top_p?: number;
    frequency_penalty?: number;
    presence_penalty?: number;
    repeat_penalty?: number;
  } {
    const options: ReturnType<OllamaAdapter['buildChatOptions']> = { ...mappedOptions };
    const numCtx = this.resolveNumCtx();
    if (numCtx !== undefined) {
      options.num_ctx = numCtx;
    }
    return options;
  }

  private resolveFiles(files: ExtendedFileResolved[] | undefined): string[] {
    const userContent: string[] = [];

    if (files) {

      files.forEach((item) => {
        if (item.base64) {
          userContent.push(item.base64.replace(/^data:.*;base64,/, ''));
        }
      });
    }
    return userContent
  }

  private async buildChatPayload<S extends z.ZodObject<z.ZodRawShape>>(
    messages: ChatMessage[],
    files: ExtendedFileResolved[] | undefined,
    config: ChatRequestPayload,
    tools: MCPToolInterface<S>[],
    stream: boolean,
  ): Promise<{
    payload: ChatRequest & {
      stream: boolean;
    };
    chatOptions: ReturnType<OllamaAdapter['buildChatOptions']>;
    toolCount: number;
  }> {
    if (files && files.length > 0) {
      messages.splice(1, 0, { role: 'user', content: 'Context images', images: this.resolveFiles(files) });
    }

    const ollamaTools = resolveChatRequestTools(tools, config);
    const toolChoice = resolveChatRequestToolChoice(ollamaTools, config);

    const mapped = this.resolveChatRequestOptions(config);
    const chatOptions = this.buildChatOptions(mapped.ollamaOptions);

    const payload: ChatRequest & {
      stream: boolean;
    } = {
      model: this.llmProviderConfig.model,
      messages: normalizeMessagesForOllamaChat(messages),
      stream,
      think: mapped.ollamaThink,
      options: chatOptions,
    };
    if (ollamaTools.length > 0) {
      payload.tools = ollamaTools as ChatRequest['tools'];
      if (toolChoice && toolChoice !== 'none') {
        (payload as unknown as Record<string, unknown>).tool_choice = toolChoice;
      }
    }

    return { payload, chatOptions, toolCount: ollamaTools.length };
  }

  private async *streamChat<S extends z.ZodObject<z.ZodRawShape>>(
    messages: ChatMessage[],
    files: ExtendedFileResolved[] | undefined,
    config: ChatRequestPayload,
    tools: MCPToolInterface<S>[],
  ): AsyncGenerator<ChatMessage> {
    const logger = await VSCodeLogger.getInstance();
    try {
      const workingMessages = messages.slice();
      const { payload, chatOptions, toolCount } = await this.buildChatPayload(
        workingMessages,
        files,
        config,
        tools,
        true,
      );

      if (payload.stream !== true) {
        throw new Error('[OLLAMA]: Internal error — expected streaming payload');
      }

      const streamPayload = payload as ChatRequest & { stream: true };

      logger.json('[OLLAMA]: streaming request sent', {
        messages: workingMessages.length,
        tools: toolCount,
        num_ctx: chatOptions.num_ctx,
        temperature: chatOptions.temperature,
      });

      const stream = await this.client.chat(streamPayload);
      yield* streamOllamaPartsToChatMessages(stream);
    } catch (error) {
      logger.error(`[OLLAMA]: Stream chat failed: ${error}`);
      yield {
        role: 'assistant',
        content: `Ollama stream chat failed: ${error instanceof Error ? error.message : String(error)}`,
        isError: true,
        isComplete: true,
      } as ChatMessage;
    }
  }

  public async makeChatRequest<S extends z.ZodObject<z.ZodRawShape>>(
    messages: ChatMessage[],
    files: ExtendedFileResolved[] | undefined,
    config: ChatRequestPayload,
    tools: MCPToolInterface<S>[],
    isStream: boolean,
  ): Promise<LLMProviderResponse | AsyncGenerator<ChatMessage>> {
    if (isStream) {
      return this.streamChat(messages, files, config, tools);
    }

    const logger = await VSCodeLogger.getInstance();

    const { payload, chatOptions, toolCount } = await this.buildChatPayload(
      messages,
      files,
      config,
      tools,
      false,
    );

    if (payload.stream !== false) {
      throw new Error('[OLLAMA]: Internal error — expected batch payload');
    }

    const batchPayload = payload as ChatRequest & { stream: false };

    logger.json('[OLLAMA]: request sent', {
      messages: messages.length,
      tools: toolCount,
      num_ctx: chatOptions.num_ctx,
      temperature: chatOptions.temperature,
    });

    const result = await this.client.chat(batchPayload);

    const toolCalls = normalizeOllamaToolCalls(result.message.tool_calls);
    let content = (result.message.content ?? '').trim();
    const thinking = (result.message.thinking ?? '').trim();
    if (!content && thinking) {
      content = thinking;
    }

    if (toolCalls.length > 0) {
      content = '';
    }

    logger.json('[OLLAMA]: response received', { ...result.message, content: content.slice(0, 200) });

    return {
      message: {
        role: result.message.role,
        content,
        reasoning: result.message.thinking,
        hasToolCalls: toolCalls.length > 0,
        tool_calls: toolCalls,
        isComplete: true,
      } as ChatMessage,
      sender: result.message.role,
      contextUsedPercentage: this.getContextUsagePercentage(
        result,
        this.llmProviderConfig.maxContext ? parseInt(this.llmProviderConfig.maxContext, 10) : undefined,
      ),
    } as LLMProviderResponse;
  }

  /**
   * Initialize/warm up the Ollama model
   */
  public async initializeModels(): Promise<void> {
    const logger = await VSCodeLogger.getInstance()

    try {
      const available = await this.client.list()
      const exists = available.models.some((m) => m.name === this.llmProviderConfig.model)

      if (!exists) {
        throw new Error(`Model "${this.llmProviderConfig.model}" is not installed on this Ollama server.`)
      }

      const numCtx = this.resolveNumCtx();
      await this.client.generate({
        model: this.llmProviderConfig.model,
        prompt: 'warmup prompt',
        stream: false,
        options: numCtx !== undefined ? { num_ctx: numCtx } : undefined,
      })

      logger.info(`Model ${this.llmProviderConfig.model} initialized successfully`)
    } catch (error) {
      logger.error(`Failed to initialize Ollama model: ${error}`)
      throw error
    }
  }

  /**
   * Summarize conversation context using LLM (not embeddings)
   * @param contextData - Conversation history
   * @returns Summary string
   */
  public async summarizeContext(systemSummaryMsg: string, messages: ChatMessage[]): Promise<string> {
    const prompt = `
${systemSummaryMsg}:

${messages.map((m: ChatMessage) => `${m.role}: ${m.content}`).join('\n\n')}
`

    const numCtx = this.resolveNumCtx();
    const result = await this.client.chat({
      model: this.llmProviderConfig.model,
      messages: [{ role: 'user', content: prompt }],
      stream: false,
      options: numCtx !== undefined ? { num_ctx: numCtx } : undefined,
    })

    return result.message?.content;
  }


  /**
   * Get provider display name
   * @returns Human-readable provider name
   */
  public getName(): string {
    return 'Ollama'
  }

  public getContextUsagePercentage(data: ChatResponse, contextWindow: number | undefined): number {
    const promptTokens = data.prompt_eval_count ?? 0
    const responseTokens = data.eval_count ?? 0
    const totalUsed = promptTokens + responseTokens
    const usagePercentage = contextWindow ? (totalUsed / contextWindow) * 100 : 0;

    return usagePercentage
  }
}
