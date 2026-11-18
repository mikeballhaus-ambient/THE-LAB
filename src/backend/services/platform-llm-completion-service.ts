import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import type { ChatMessage } from '@/shared/types/chat';
import type {
  PlatformLlmCompletionRequest,
  PlatformLlmCompletionResponse,
  PlatformLlmStreamDelta,
} from '@/shared/types/platform-llm-completion';
import { ProviderService } from '../ai/provider-service';
import {
  isPlatformStructuralToolId,
  platformStructuralToolSuppressesReasoning,
  resolvePlatformStructuralTools,
} from '../ai/structural-tools/platform-structural-tool-registry';
import type { ChatRequestPayload, LLMProviderResponse } from '@/shared/types/llm-provider';
import type { MCPToolCall } from '@/shared/types/mcp-tools';
import { VSCodeLogger } from '../utils/logger';
import { platformLlmStreamDebug } from '@/shared/utils/agent-stream-debug.node';
import { buildPlatformCompletionMessages } from '@/shared/utils/platform-llm-completion-messages';

export const PlatformLlmCompletionBodySchema = z.object({
  purpose: z.string().min(1).max(128),
  system: z.string().min(1).max(100_000),
  user: z.string().min(1).max(100_000),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().int().min(16).max(16_384).optional(),
  reasoningEffort: z
    .enum(['none', 'minimal', 'low', 'medium', 'high', 'xhigh'])
    .optional(),
  sampling: z
    .object({
      top_p: z.number().min(0).max(1).optional(),
      repeat_penalty: z.number().min(0).max(3).optional(),
      frequency_penalty: z.number().min(-2).max(2).optional(),
      presence_penalty: z.number().min(-2).max(2).optional(),
    })
    .optional(),
  /** Any id registered on the platform structural-tool registry (validated below). */
  structuralTool: z.string().min(1).max(128).optional(),
  toolFeedbackTurns: z
    .array(
      z.object({
        toolCallId: z.string().min(1).max(128),
        toolName: z.string().min(1).max(128),
        arguments: z.string().max(50_000),
        resultContent: z.string().min(1).max(10_000),
      }),
    )
    .max(16)
    .optional(),
  retryUserHint: z.string().max(10_000).optional(),
});

function buildPlatformChatRequestConfig(
  userId: number,
  body: PlatformLlmCompletionRequest,
): ChatRequestPayload {
  const config: ChatRequestPayload = {
    sessionId: `platform-llm:${body.purpose}:${userId}:${randomUUID()}`,
    persona: 'PlatformAgent',
  };
  if (body.maxTokens != null) {
    config.maxTokens = body.maxTokens;
  }
  if (body.temperature != null) {
    config.temperature = body.temperature;
  }
  if (body.sampling) {
    config.sampling = body.sampling;
  }
  if (body.reasoningEffort != null) {
    config.reasoningEffort = body.reasoningEffort;
  }
  if (body.structuralTool && isPlatformStructuralToolId(body.structuralTool)) {
    config.structuralToolIds = [body.structuralTool];
    config.requiredStructuralToolId = body.structuralTool;
  }
  return config;
}

function toolCallsFromResponse(response: LLMProviderResponse): MCPToolCall[] | undefined {
  const calls = response.message?.tool_calls;
  if (!calls?.length) {
    return undefined;
  }
  return calls;
}

function isAsyncChatGenerator(
  raw: LLMProviderResponse | AsyncGenerator<ChatMessage>,
): raw is AsyncGenerator<ChatMessage> {
  return raw != null && typeof (raw as AsyncGenerator<ChatMessage>).next === 'function';
}

function streamChunkText(chunk: ChatMessage): string {
  const contentDelta = typeof chunk.content === 'string' ? chunk.content : '';
  const reasoningField = typeof chunk.reasoning === 'string' ? chunk.reasoning : '';
  // Content deltas must win: compat stream puts full accumulated reasoning on content chunks.
  if (contentDelta.length > 0) {
    return contentDelta;
  }
  if (reasoningField.length > 0) {
    return reasoningField;
  }
  return '';
}

function isAgentGameStructuralRequest(body: PlatformLlmCompletionRequest): boolean {
  return platformStructuralToolSuppressesReasoning(body.purpose);
}

/** TW agent: reasoning is disabled at the provider; never forward or parse the reasoning channel. */
function emitTwAgentContentDelta(
  contentAcc: string,
  onDelta: (delta: PlatformLlmStreamDelta) => void,
): void {
  if (!contentAcc) {
    return;
  }
  onDelta({ kind: 'channels', reasoning: '', content: contentAcc });
}

function completionTextForRequest(
  body: PlatformLlmCompletionRequest,
  response: LLMProviderResponse,
): string {
  const content = assistantMessageContent(response.message).trim();
  if (isAgentGameStructuralRequest(body) || body.reasoningEffort === 'none') {
    if (content) {
      return content;
    }
  }
  return messageText(response).trim();
}

function fullTextFromCompleteChunk(chunk: ChatMessage): string {
  const reasoning = typeof chunk.reasoning === 'string' ? chunk.reasoning : '';
  const content = typeof chunk.content === 'string' ? chunk.content : '';
  if (reasoning && content) {
    return `${reasoning}\n\n${content}`;
  }
  return reasoning || content;
}

function assistantMessageContent(message: ChatMessage | undefined): string {
  const raw = message?.content;
  if (typeof raw === 'string') {
    return raw;
  }
  if (Array.isArray(raw)) {
    return raw
      .map((part) => {
        if (typeof part === 'string') {
          return part;
        }
        if (part && typeof part === 'object' && 'text' in part) {
          return String((part as { text?: string }).text ?? '');
        }
        return '';
      })
      .join('');
  }
  return '';
}

/** Non-stream completions: include reasoning + content (LM Studio reasoning models). */
function messageText(response: LLMProviderResponse): string {
  const msg = response.message;
  const reasoning = typeof msg?.reasoning === 'string' ? msg.reasoning : '';
  const content = assistantMessageContent(msg);
  if (reasoning && content) {
    return `${reasoning}\n\n${content}`;
  }
  return reasoning || content;
}

export class PlatformLlmCompletionService {
  private static instance: PlatformLlmCompletionService | null = null;

  static getInstance(): PlatformLlmCompletionService {
    if (!PlatformLlmCompletionService.instance) {
      PlatformLlmCompletionService.instance = new PlatformLlmCompletionService();
    }
    return PlatformLlmCompletionService.instance;
  }

  async completeForUser(
    userId: number,
    body: PlatformLlmCompletionRequest,
  ): Promise<PlatformLlmCompletionResponse> {
    const providerService = ProviderService.getInstance();
    const { chatProvider } = await providerService.ResolveProviderAdapter(userId);
    if (!chatProvider) {
      return {
        success: false,
        error: 'No chat provider configured — set one in Settings → AI Providers',
        code: 'NO_PROVIDER',
      };
    }

    const messages = buildPlatformCompletionMessages(body);
    if (body.purpose.includes('agent-turn')) {
      platformLlmStreamDebug('complete message list', {
        purpose: body.purpose,
        messageCount: messages.length,
        roles: messages.map((m) => m.role),
        toolFeedbackTurns: body.toolFeedbackTurns?.length ?? 0,
        maxTokens: body.maxTokens ?? 'provider-default',
      });
    }

    const config = buildPlatformChatRequestConfig(userId, body);
    const structuralTools =
      body.structuralTool && isPlatformStructuralToolId(body.structuralTool)
        ? resolvePlatformStructuralTools(body.structuralTool)
        : [];

    try {
      const batch =
        structuralTools.length > 0
          ? await providerService.completeAgentChatRequest(userId, messages, structuralTools, config)
          : null;

      let response: LLMProviderResponse;
      if (batch) {
        if (!batch.success) {
          return {
            success: false,
            error: batch.error,
            code: batch.code === 'NO_PROVIDER' ? 'NO_PROVIDER' : 'PROVIDER_ERROR',
          };
        }
        response = batch.response;
      } else {
        const raw = await chatProvider.makeChatRequest(messages, undefined, config, [], false);
        if (!raw || isAsyncChatGenerator(raw)) {
          return { success: false, error: 'Unexpected streaming response', code: 'PROVIDER_ERROR' };
        }
        response = raw as LLMProviderResponse;
      }

      const toolCalls = toolCallsFromResponse(response);
      const content = completionTextForRequest(body, response);
      const expectsStructuralTool =
        Boolean(body.structuralTool) && isPlatformStructuralToolId(body.structuralTool!);
      // LM Studio may return 200 with empty tool_calls after a truncated/malformed tool JSON — let the app retry loop handle it.
      if (!content && !toolCalls?.length && !expectsStructuralTool) {
        return { success: false, error: 'Provider returned empty content', code: 'EMPTY_RESPONSE' };
      }
      const cfg = chatProvider.llmProviderConfig;
      return {
        success: true,
        data: {
          content,
          model: cfg.model ?? 'unknown',
          provider: cfg.provider ?? chatProvider.getName(),
          ...(toolCalls ? { toolCalls } : {}),
        },
      };
    } catch (err) {
      const logger = await VSCodeLogger.getInstance();
      logger.error(
        `[platform-llm] ${body.purpose} failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Provider request failed',
        code: 'PROVIDER_ERROR',
      };
    }
  }

  async streamForUser(
    userId: number,
    body: PlatformLlmCompletionRequest,
    onDelta: (delta: PlatformLlmStreamDelta) => void,
  ): Promise<PlatformLlmCompletionResponse> {
    const providerService = ProviderService.getInstance();
    const { chatProvider } = await providerService.ResolveProviderAdapter(userId);
    if (!chatProvider) {
      return {
        success: false,
        error: 'No chat provider configured — set one in Settings → AI Providers',
        code: 'NO_PROVIDER',
      };
    }

    const messages: ChatMessage[] = [
      { role: 'system', content: body.system },
      { role: 'user', content: body.user },
    ];
    const config = buildPlatformChatRequestConfig(userId, body);

    try {
      const providerName = chatProvider.getName();
      platformLlmStreamDebug('stream start', {
        purpose: body.purpose,
        userId,
        provider: providerName,
        model: chatProvider.llmProviderConfig.model,
        temperature: config.temperature,
        reasoningEffort: config.reasoningEffort ?? 'unset',
        maxTokens: config.maxTokens ?? 'provider-default',
      });
      const raw = await chatProvider.makeChatRequest(messages, undefined, config, [], true);
      let content = '';
      let streamedLen = 0;
      let chunkIndex = 0;
      let emittedDeltaChars = 0;
      let emptyDeltaChunks = 0;
      const isTwAgentStream = isAgentGameStructuralRequest(body);
      let twContentAcc = '';
      if (isAsyncChatGenerator(raw)) {
        platformLlmStreamDebug('provider returned async generator', {
          purpose: body.purpose,
          maxTokens: body.maxTokens,
        });
        for await (const chunk of raw) {
          chunkIndex += 1;
          const contentLen =
            typeof chunk.content === 'string' ? chunk.content.length : 0;
          const reasoningLen = chunk.reasoning?.length ?? 0;

          // Completion chunks carry the full assistant text in `content`, not a delta.
          // Handle them first so we never append the full body twice (breaks JSON parse).
          if (chunk.isComplete) {
            const full = fullTextFromCompleteChunk(chunk);
            if (isTwAgentStream) {
              const completeContent =
                typeof chunk.content === 'string' ? chunk.content.trim() : '';
              if (completeContent) {
                const accHasFence = twContentAcc.includes('```');
                const completeHasFence = completeContent.includes('```');
                const completeHasMove =
                  /\{\s*"type"\s*:\s*"(?:place|pass|exchange|resign)"/.test(completeContent);
                if (
                  !twContentAcc ||
                  completeContent.length >= twContentAcc.length ||
                  (completeHasFence && !accHasFence) ||
                  (completeHasMove && !accHasFence)
                ) {
                  twContentAcc = completeContent;
                }
              }
              content = twContentAcc;
              emitTwAgentContentDelta(twContentAcc, onDelta);
              streamedLen = content.length;
            } else if (full.length > streamedLen) {
              const tail = full.slice(streamedLen);
              content = full;
              streamedLen = full.length;
              emittedDeltaChars += tail.length;
              if (tail) {
                onDelta({ kind: 'text', text: tail });
              }
            } else if (full) {
              content = full;
              streamedLen = full.length;
            }
            if (chunkIndex <= 3 || chunkIndex % 25 === 0) {
              platformLlmStreamDebug('chunk', {
                chunkIndex,
                deltaLen: 0,
                contentLen,
                reasoningLen,
                isComplete: true,
                doneReason: chunk.doneReason,
                hasToolCalls: Boolean(chunk.hasToolCalls),
              });
            }
            continue;
          }

          if (isTwAgentStream) {
            const contentDelta = typeof chunk.content === 'string' ? chunk.content : '';
            if (contentDelta) {
              twContentAcc += contentDelta;
            }
            content = twContentAcc;
            streamedLen = content.length;
            emitTwAgentContentDelta(twContentAcc, onDelta);
            emittedDeltaChars = twContentAcc.length;
            if (chunkIndex <= 3 || chunkIndex % 25 === 0) {
              platformLlmStreamDebug('chunk', {
                chunkIndex,
                deltaLen: contentDelta.length,
                contentLen,
                reasoningLen,
                isComplete: false,
                doneReason: chunk.doneReason,
                hasToolCalls: Boolean(chunk.hasToolCalls),
              });
            }
          } else {
            const delta = streamChunkText(chunk);
            if (!delta) {
              emptyDeltaChunks += 1;
            }
            if (chunkIndex <= 3 || chunkIndex % 25 === 0) {
              platformLlmStreamDebug('chunk', {
                chunkIndex,
                deltaLen: delta.length,
                contentLen,
                reasoningLen,
                isComplete: false,
                doneReason: chunk.doneReason,
                hasToolCalls: Boolean(chunk.hasToolCalls),
              });
            }
            if (delta) {
              content += delta;
              streamedLen += delta.length;
              emittedDeltaChars += delta.length;
              onDelta({ kind: 'text', text: delta });
            }
          }
        }
        platformLlmStreamDebug('generator finished', {
          chunkIndex,
          emittedDeltaChars,
          emptyDeltaChunks,
          contentLen: content.length,
          contentOnlyLen: twContentAcc.length,
          maxTokens: body.maxTokens,
          purpose: body.purpose,
        });
      } else {
        platformLlmStreamDebug('provider returned batch response (no stream generator)');
        content = messageText(raw as LLMProviderResponse).trim();
        if (content) {
          onDelta({ kind: 'text', text: content });
          emittedDeltaChars = content.length;
        }
      }
      content = content.trim();
      if (!content) {
        return { success: false, error: 'Provider returned empty content', code: 'EMPTY_RESPONSE' };
      }
      const cfg = chatProvider.llmProviderConfig;
      return {
        success: true,
        data: {
          content,
          model: cfg.model ?? 'unknown',
          provider: cfg.provider ?? chatProvider.getName(),
        },
      };
    } catch (err) {
      const logger = await VSCodeLogger.getInstance();
      logger.error(
        `[platform-llm:stream] ${body.purpose} failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Provider request failed',
        code: 'PROVIDER_ERROR',
      };
    }
  }
}
