import { VSCodeLogger } from '../../utils/logger';
import * as chatHelper from './open-ai/chat-helper';
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
  ProviderUpdateResultData,
} from '../../../shared/types';
import type { z } from 'zod';
import {
  getLmStudioServerRoot,
  listLmStudioModelIds,
  lmStudioRequest,
} from './lm-studio/lm-studio-http';
import { readOpenAiCompatChatCompletionSse } from './lm-studio/lm-studio-sse';
import {
  streamOpenAiCompatEventsToChatMessages,
  type OpenAiCompatStreamEvent,
} from './shared/open-ai-compat-chat-stream';
import { normalizeToolCallArgumentsString } from '../../../shared/utils/chat-tool-calls';
import { mapChatRequestPayload } from './shared/chat-request-payload';
import {
  resolveChatRequestToolChoice,
  resolveChatRequestTools,
} from './shared/resolve-chat-request-tools';
/**
 * LM Studio native REST API (server root, e.g. http://host:1234).
 * See https://lmstudio.ai/docs/developer/rest
 */
export class LmStudioAdapter implements LLMProvider {
  llmProviderConfig!: ProviderConfigBase;

  constructor(llmProviderConfig: ProviderConfigBase) {
    this.llmProviderConfig = llmProviderConfig;
  }

  resolveChatRequestOptions(config: ChatRequestPayload): ResolvedChatRequestOptions {
    return mapChatRequestPayload(config);
  }

  public getName(): string {
    return 'LM Studio';
  }

  public getContextUsagePercentage(data: ChatMessage[], contextWindow: number | undefined): number {
    let total = 0;
    for (const m of data) {
      const chars = m.content.length;
      total += Math.ceil(chars / 4) + 6;
    }
    if (!contextWindow || total === 0) {
      return 0;
    }
    return Number(((total / contextWindow) * 100).toFixed(4));
  }

  public async fetchModels(): Promise<string[]> {
    const logger = await VSCodeLogger.getInstance();
    try {
      return await listLmStudioModelIds(this.llmProviderConfig);
    } catch (error) {
      logger.error(`[LM-STUDIO]: Failed to fetch models: ${error}`);
      return [];
    }
  }

  public async testConnection(): Promise<ProviderUpdateResultData> {
    const logger = await VSCodeLogger.getInstance();
    const serverRoot = getLmStudioServerRoot(this.llmProviderConfig.baseUrl);
    const selectedModel = this.llmProviderConfig.model?.trim() ?? '';

    try {
      const modelIds = await listLmStudioModelIds(this.llmProviderConfig);

      if (!selectedModel) {
        return {
          success: true,
          message: `Connected to LM Studio at ${serverRoot}. ${modelIds.length} model(s) available — use Fetch Models and pick one.`,
        };
      }

      const exists = modelIds.includes(selectedModel);
      if (!exists) {
        return {
          success: false,
          message: `Connected to LM Studio, but model "${selectedModel}" is not in the catalog at ${serverRoot}. Use Fetch Models or load the model in LM Studio.`,
        };
      }

      return {
        success: true,
        message: `Connected to LM Studio and model "${selectedModel}" is available at ${serverRoot}.`,
      };
    } catch (error: unknown) {
      logger.error(`[LM-STUDIO]: Connection test failed: ${error}`);
      const message = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        message: `Failed to connect to LM Studio at ${serverRoot}: ${message}`,
      };
    }
  }

  public async embed(text: string): Promise<number[]> {
    const model = this.llmProviderConfig.model;
    if (!model) {
      throw new Error('No embedding model configured for LM Studio');
    }
    const trimmed = text.trim();
    if (!trimmed) {
      return [];
    }

    const res = await lmStudioRequest(this.llmProviderConfig, '/api/v0/embeddings', {
      method: 'POST',
      body: JSON.stringify({ model, input: trimmed }),
    });
    if (!res.ok) {
      const detail = await res.text();
      throw new Error(`LM Studio embeddings failed (${res.status}): ${detail}`);
    }
    const body = (await res.json()) as { data?: Array<{ embedding?: number[] }> };
    const embedding = body.data?.[0]?.embedding;
    if (!embedding) {
      throw new Error('LM Studio embeddings response missing vector');
    }
    return embedding;
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
    return this.chat(messages, files, config, tools);
  }

  private async chat<S extends z.ZodObject<z.ZodRawShape>>(
    messages: ChatMessage[],
    files: ExtendedFileResolved[] | undefined,
    config: ChatRequestPayload,
    tools: MCPToolInterface<S>[],
  ): Promise<LLMProviderResponse> {
    const logger = await VSCodeLogger.getInstance();
    try {
      const { payload, workingMessages } = this.buildChatPayload(messages, files, config, tools, false);

      logger.json('[LM-STUDIO]: chat request sent', {
        messages: messages.length,
        model: this.llmProviderConfig.model,
        stream: false,
      });

      const res = await lmStudioRequest(this.llmProviderConfig, '/api/v0/chat/completions', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const detail = await res.text();
        throw new Error(`LM Studio chat failed (${res.status}): ${detail}`);
      }

      const response = (await res.json()) as {
        choices?: Array<{
          message?: {
            role?: string;
            content?: string | null;
            reasoning_content?: string;
            tool_calls?: Array<{
              id: string;
              type: string;
              function: { name: string; arguments: string };
            }>;
          };
          finish_reason?: string;
        }>;
      };

      const choice = response.choices?.[0];
      if (!choice?.message) {
        throw new Error('No choices returned from LM Studio chat');
      }

      const msg = choice.message;
      const content = typeof msg.content === 'string' ? msg.content : '';
      const reasoning =
        typeof msg.reasoning_content === 'string' ? msg.reasoning_content : '';
      const mcpToolCallsResolved: MCPToolCall[] = [];
      let sawToolCall = false;

      if (msg.tool_calls?.length) {
        sawToolCall = true;
        for (const tc of msg.tool_calls) {
          if (tc.type === 'function') {
            mcpToolCallsResolved.push({
              type: 'function',
              id: tc.id,
              function: {
                name: tc.function.name,
                arguments: normalizeToolCallArgumentsString(tc.function.arguments),
              },
            });
          }
        }
      }

      let doneReason: DoneReason = 'stop';
      if (sawToolCall) {
        doneReason = 'tool_calls';
      } else if (choice.finish_reason === 'content_filter') {
        doneReason = 'content_filter';
      }

      const chatMessage = {
        role: (msg.role as ChatRole) ?? 'assistant',
        content: content.trim(),
        reasoning,
        tool_calls: mcpToolCallsResolved,
        hasToolCalls: sawToolCall,
        doneReason,
        isComplete: true,
      } as ChatMessage;

      return {
        message: chatMessage,
        sender: 'assistant',
        contextUsedPercentage: this.getContextUsagePercentage(
          [...workingMessages, chatMessage],
          this.llmProviderConfig.maxContext ? parseInt(this.llmProviderConfig.maxContext, 10) : undefined,
        ),
      };
    } catch (error) {
      return {
        sender: 'assistant',
        contextUsedPercentage: 0,
        message: {
          role: 'assistant',
          content: `LM Studio chat failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          isError: true,
        } as ChatMessage,
      };
    }
  }

  private buildChatPayload<S extends z.ZodObject<z.ZodRawShape>>(
    messages: ChatMessage[],
    files: ExtendedFileResolved[] | undefined,
    config: ChatRequestPayload,
    tools: MCPToolInterface<S>[],
    stream: boolean,
  ): { payload: Record<string, unknown>; workingMessages: ChatMessage[] } {
    const workingMessages = [...messages];
    const mcpTools = resolveChatRequestTools(tools, config);
    const toolChoice = resolveChatRequestToolChoice(mcpTools, config);

    if (files && files.length > 0) {
      workingMessages.splice(1, 0, { role: 'user', content: chatHelper.resolveFiles(files) });
    }

    const resolvedMessages = workingMessages.map((message) => chatHelper.toOpenAIMessage(message));
    const mapped = this.resolveChatRequestOptions(config);
    const payload: Record<string, unknown> = {
      model: this.llmProviderConfig.model,
      messages: resolvedMessages,
      stream,
      temperature: mapped.temperature,
      ...mapped.openAiCompatExtras,
    };
    if (mcpTools.length > 0) {
      payload.tools = mcpTools;
      if (toolChoice) {
        payload.tool_choice = toolChoice;
      }
    }

    return { payload, workingMessages };
  }

  private async *streamChat<S extends z.ZodObject<z.ZodRawShape>>(
    messages: ChatMessage[],
    files: ExtendedFileResolved[] | undefined,
    config: ChatRequestPayload,
    tools: MCPToolInterface<S>[],
  ): AsyncGenerator<ChatMessage> {
    const logger = await VSCodeLogger.getInstance();
    try {
      const { payload } = this.buildChatPayload(messages, files, config, tools, true);

      logger.json('[LM-STUDIO]: streaming chat request sent', {
        messages: messages.length,
        model: this.llmProviderConfig.model,
        stream: true,
      });

      const res = await lmStudioRequest(this.llmProviderConfig, '/api/v0/chat/completions', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const detail = await res.text();
        throw new Error(`LM Studio chat failed (${res.status}): ${detail}`);
      }

      const maxContext = this.llmProviderConfig.maxContext
        ? parseInt(this.llmProviderConfig.maxContext, 10)
        : undefined;

      async function* sseEvents(): AsyncGenerator<OpenAiCompatStreamEvent> {
        for await (const raw of readOpenAiCompatChatCompletionSse(res.body)) {
          yield raw as OpenAiCompatStreamEvent;
        }
      }

      yield* streamOpenAiCompatEventsToChatMessages(sseEvents(), { maxContext });
    } catch (error) {
      yield {
        role: 'assistant',
        content: `LM Studio stream chat failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        isError: true,
        isComplete: true,
      } as ChatMessage;
    }
  }

  public async initializeModels(): Promise<void> {
    const logger = await VSCodeLogger.getInstance();
    const modelIds = await listLmStudioModelIds(this.llmProviderConfig);
    const model = this.llmProviderConfig.model;
    if (!modelIds.includes(model)) {
      throw new Error(`Model "${model}" is not available on this LM Studio server.`);
    }
    logger.info(`[LM-STUDIO]: Model ${model} is available`);
  }

  public async summarizeContext(systemSummaryMsg: string, messages: ChatMessage[]): Promise<string> {
    const prompt = `${systemSummaryMsg}:\n\n${messages
      .map((m) => `${m.role}: ${m.content}`)
      .join('\n\n')}`;

    const res = await lmStudioRequest(this.llmProviderConfig, '/api/v0/chat/completions', {
      method: 'POST',
      body: JSON.stringify({
        model: this.llmProviderConfig.model,
        messages: [{ role: 'user', content: prompt }],
        stream: false,
        max_tokens: 1024,
      }),
    });
    if (!res.ok) {
      throw new Error(await res.text());
    }
    const body = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    return body.choices?.[0]?.message?.content?.trim() ?? '';
  }
}
