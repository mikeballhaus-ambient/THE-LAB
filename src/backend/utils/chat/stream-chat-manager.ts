import type { Server as SocketIOServer } from 'socket.io'
import { Parser } from '../parse-utils'
import { AgentResponse, AgentResponseParser, SlashCommandContext } from '../agent-response-parser'
import {
  SOCKET_EVENTS,
  ChatMessage,
  ChatPersona,
  Persona,
  LLMProvider,
  ChatRequestPayload,
  ProviderData,
  ExtendedFileResolved,
  StreamingDelta,
  StreamingDone,
  MCPToolCall,
} from '@/shared/types';
import MCPToolRegistry from '../../mcp/mcp-tool';
import { chatUtils } from './utils';
import { TemplateManager } from '../template-manager';
import { MCPUtils } from '../mcp-utils';
import { ContextSettingsService } from '@/backend/db/ContextSettings/context-settings-service';
import { CommandService } from '@/backend/db/Command/command-service';
import { resolveModelOutputParseOptions } from '@/shared/config/lab-provider-capabilities';
import {
  mergeToolCallValidationFailure,
  validateToolCallsForExecution,
} from '@/shared/utils/tool-call-turn-validation';
import { getLabChatStreamUiDelayMs } from '@/shared/config/lab-chat-stream-ui-delay';
import type { LabChatRequestExtras } from '@/shared/game-platform/lab-assistant-banter/lab-game-banter-chat-request';
import {
  resolveStreamingToolCallsForRunner,
  shouldRunStreamingToolRunner,
} from '@/shared/utils/resolve-streaming-tool-calls';

export class StreamChatManager {

  private io: SocketIOServer | null = null
  private chatProvider!: LLMProvider | undefined
  private providerData!: ProviderData
  private templateManager!: TemplateManager
  private mcpUtils!: MCPUtils
  private mcpRegistry!: MCPToolRegistry

  constructor(io: SocketIOServer | null, chatProvider: LLMProvider | undefined, providerData: ProviderData, templateManager: TemplateManager, mcpUtils: MCPUtils, mcpRegistry: MCPToolRegistry) {
    this.io = io
    this.chatProvider = chatProvider
    this.providerData = providerData
    this.templateManager = templateManager
    this.mcpUtils = mcpUtils
    this.mcpRegistry = mcpRegistry
  }

  public async streamingResponseHandler(userId: number,
    sessionId: string,
    persona: ChatPersona,
    personaConfig: Persona | undefined,
    sysMsg: string,
    messages: ChatMessage[],
    files: ExtendedFileResolved[] | undefined,
    chatId: string,
    isFromToolCall: boolean,
    isDeveloperMode: boolean,
    chatRequestExtras?: LabChatRequestExtras,
  ): Promise<{
    contentBuffer: string,
    reasoningBuffer: string,
    latestChunk: ChatMessage | undefined,
    persona: ChatPersona,
    personaConfig: Persona | undefined,
    sysMsg: string,
    toolCalls: MCPToolCall[],
    parser: AgentResponseParser,
    invalidToolCallExtracted: boolean;
    invalidToolCallError: string,
    invalidToolCallOriginalJson: string
  }> {

    const parser = new AgentResponseParser()
    const request = this.streamRequestBuilder(
      userId,
      sessionId,
      persona,
      personaConfig,
      messages,
      files,
      chatRequestExtras,
    )
    const {
      contextUsed,
      contentBuffer,
      reasoningBuffer,
      latestChunk,
      toolCalls,
      sysMsg: _sysMsg,
      persona: _persona,
      personaConfig: _personaConfig } = await this.streamResponseHandler(request, parser, userId, sessionId, persona, personaConfig, sysMsg, chatId, isFromToolCall, isDeveloperMode)
    sysMsg = _sysMsg
    persona = _persona
    personaConfig = _personaConfig

    //check if we need to summarize
    let usagePercentage = contextUsed
    const contextSettings = ContextSettingsService.getInstance().getContextSettings(userId)
    const contextUsageThreshold = contextSettings && contextSettings.enableAutoSummarization ? contextSettings.triggerSummarizationPercent : 100;

    if (latestChunk && usagePercentage && usagePercentage > contextUsageThreshold) {
      const summaryMsg = await chatUtils.summarizeRequest(userId, this.io, this.chatProvider, sessionId, [
        ...messages,
        { role: 'assistant', content: latestChunk?.content } as ChatMessage
      ])

      latestChunk.content = summaryMsg;
      usagePercentage = 0

      await chatUtils.dispatchUIResponse(this.io, SOCKET_EVENTS.TOKEN_PROGRESS, {
        sessionId,
        percentage: usagePercentage
      })

      return {
        contentBuffer: latestChunk.content,
        reasoningBuffer: '',
        latestChunk,
        persona,
        personaConfig,
        sysMsg,
        toolCalls: [],
        parser,
        invalidToolCallExtracted: false,
        invalidToolCallError: '',
        invalidToolCallOriginalJson: ''
      }
    }

    const parseOpts = resolveModelOutputParseOptions(this.chatProvider);
    const parsedAgentResponse = chatUtils.parseModelOutput(contentBuffer, reasoningBuffer, parseOpts)

    const streamNativeToolCalls = toolCalls;
    const parsedLeakedToolCalls = parsedAgentResponse.toolCalls;
    const resolvedToolCalls =
      streamNativeToolCalls.length > 0 ? streamNativeToolCalls : parsedLeakedToolCalls;

    const validatedToolCalls = validateToolCallsForExecution(resolvedToolCalls);
    const invalidMeta = mergeToolCallValidationFailure(
      {
        invalidToolCallExtracted: parsedAgentResponse.invalidToolCallExtracted,
        invalidToolCallError: parsedAgentResponse.invalidToolCallError,
        invalidToolCallOriginalJson: parsedAgentResponse.invalidToolCallOriginalJson,
      },
      validatedToolCalls.rejected,
    );

    if (
      process.env.LAB_CHAT_TOOL_LEAK_DEBUG === '1' &&
      parsedLeakedToolCalls.length > 0 &&
      streamNativeToolCalls.length === 0
    ) {
      const log = await import('../logger').then((m) => m.VSCodeLogger.getInstance());
      log.json('[stream] salvaged leaked tool calls from assistant content', {
        tools: parsedLeakedToolCalls.map((t) => t.function.name),
        contentLength: contentBuffer.length,
      });
    }

    return {
      contentBuffer: parsedAgentResponse.content,
      reasoningBuffer: parsedAgentResponse.reasoning,
      latestChunk,
      persona,
      personaConfig,
      sysMsg,
      toolCalls: validatedToolCalls.executable,
      parser,
      invalidToolCallExtracted: invalidMeta.invalidToolCallExtracted,
      invalidToolCallError: invalidMeta.invalidToolCallError,
      invalidToolCallOriginalJson: invalidMeta.invalidToolCallOriginalJson,
    }
  }

  public async streamingToolHandler(userId: number,
    sessionId: string,
    persona: ChatPersona,
    personaConfig: Persona | undefined,
    sysMsg: string,
    messages: ChatMessage[],
    files: ExtendedFileResolved[] | undefined,
    chatId: string,
    parser: AgentResponseParser,
    contentBuffer: string,
    reasoningBuffer: string,
    toolCalls: MCPToolCall[],
    latestChunk: ChatMessage | undefined,
    isDeveloperMode: boolean): Promise<void> {
    if (!this.chatProvider) return undefined
    const toolCallContextUsed: number = 0
    const toolCallResponseText: string = ''

    const parseOpts = resolveModelOutputParseOptions(this.chatProvider);
    const parsedContentReasoning = chatUtils.parseModelOutput(contentBuffer, reasoningBuffer, parseOpts)
    const resolvedToolCalls = resolveStreamingToolCallsForRunner(
      toolCalls,
      parsedContentReasoning.toolCalls,
    );

    if (shouldRunStreamingToolRunner(resolvedToolCalls)) {
      const agentResponse: AgentResponse =
        toolCalls.length > 0 && latestChunk
          ? await chatUtils.buildAgentResponse(userId, latestChunk, parseOpts)
          : await chatUtils.buildAgentResponse(userId, {
              content: parsedContentReasoning.content,
              reasoning: parsedContentReasoning.reasoning,
              tool_calls: resolvedToolCalls,
            } as ChatMessage, parseOpts);
      await chatUtils.toolRunner(this.chatProvider,
        this.io,
        this.mcpUtils,
        this.mcpRegistry,
        this.templateManager,
        this.providerData,
        userId,
        sessionId,
        persona,
        personaConfig,
        sysMsg,
        messages,
        agentResponse,
        files,
        chatId,
        true,
        false,
        '',
        parsedContentReasoning.invalidToolCallExtracted,
        parsedContentReasoning.invalidToolCallError,
        parsedContentReasoning.invalidToolCallOriginalJson,
        isDeveloperMode
      )
    }

    const final = parser.getFinalResult();
    const finalMsg = {
      role: "assistant",
      content: final.tool_calls && final.tool_calls.length > 0 ? toolCallResponseText : final.content,
    } as ChatMessage

    const usagePercentage = this.chatProvider.getContextUsagePercentage([...messages, finalMsg], this.chatProvider.llmProviderConfig.maxContext ? parseInt(this.chatProvider.llmProviderConfig.maxContext) : undefined);

    const finalContextUsed = toolCallContextUsed > 0 ? toolCallContextUsed : usagePercentage

    await chatUtils.dispatchUIResponse(this.io, SOCKET_EVENTS.TOKEN_PROGRESS, {
      sessionId,
      percentage: finalContextUsed
    })
  }

  private async streamRequestBuilder(
    userId: number,
    sessionId: string,
    persona: ChatPersona,
    personaConfig: Persona | undefined,
    messages: ChatMessage[],
    files: ExtendedFileResolved[] | undefined,
    chatRequestExtras?: LabChatRequestExtras,
  ): Promise<AsyncGenerator<ChatMessage> | undefined> {
    if (!this.chatProvider) return undefined
    return await this.chatProvider.makeChatRequest(messages, files, {
      sessionId: sessionId,
      persona: persona,
      personaConfig: personaConfig,
      ...chatRequestExtras,
    } as ChatRequestPayload,
      this.mcpRegistry.getAllToolsForUser(userId),
      true) as AsyncGenerator<ChatMessage>
  }

  private async streamResponseHandler(request: Promise<AsyncGenerator<ChatMessage> | undefined>,
    parser: AgentResponseParser,
    userId: number,
    sessionId: string,
    persona: ChatPersona,
    personaConfig: Persona | undefined,
    sysMsg: string,
    chatId: string,
    isFromToolCall: boolean,
    isDeveloperMode: boolean
  ): Promise<{
    contextUsed: number,
    contentBuffer: string,
    reasoningBuffer: string,
    toolCalls: MCPToolCall[]
    latestChunk: ChatMessage | undefined,
    persona: ChatPersona,
    personaConfig: Persona | undefined,
    sysMsg: string
  }> {
    let _contentBuffer: string = "";
    let _reasoningBuffer: string = "";
    let _toolCalls: MCPToolCall[] = []
    let _latestChunk: ChatMessage | undefined = undefined
    let curIteration = 0
    let curContextUsed: number = 0

    for await (const chunk of await request as AsyncGenerator<ChatMessage>) {
      if (chunk.contextUsed && chunk.contextUsed > 0) curContextUsed = chunk.contextUsed
      const response = await this.responseChunkHandler(parser, userId, sessionId, persona, personaConfig, sysMsg, chunk, _reasoningBuffer, _contentBuffer, chatId, isFromToolCall, curIteration, isDeveloperMode)
      _contentBuffer = response.contentBuffer
      _reasoningBuffer = response.reasoningBuffer
      _toolCalls = response.toolCalls.length > 0 ? response.toolCalls : _toolCalls
      sysMsg = response.sysMsg
      persona = response.persona
      personaConfig = response.personaConfig
      _latestChunk = chunk
      curIteration++
    }

    return {
      contextUsed: curContextUsed,
      contentBuffer: _contentBuffer,
      reasoningBuffer: _reasoningBuffer,
      toolCalls: _toolCalls,
      latestChunk: _latestChunk,
      sysMsg: sysMsg,
      persona: persona,
      personaConfig: personaConfig
    }
  }

  private async responseChunkHandler(parser: AgentResponseParser,
    userId: number,
    sessionId: string,
    persona: ChatPersona,
    personaConfig: Persona | undefined,
    sysMsg: string,
    chunk: ChatMessage,
    reasoningBuffer: string,
    contentBuffer: string,
    chatId: string,
    ifFromToolCall: boolean,
    iteration: number,
    isDeveloperMode: boolean): Promise<{
      contentBuffer: string,
      reasoningBuffer: string,
      persona: ChatPersona,
      personaConfig: Persona | undefined,
      sysMsg: string,
      toolCalls: MCPToolCall[]
    }> {

    const events = parser.ingestChatMessage(chunk);
    const toolCalls: MCPToolCall[] = []
    const streamUiDelayMs = getLabChatStreamUiDelayMs();

    for (const ev of events) {
      // REASONING (thinking) DELTA
      if (ev.type === "reasoning.delta" && ev.text && ev.text != undefined) {
        const reasoningText = (ifFromToolCall && iteration == 0 ? '\n' : '') + ev.text;
        reasoningBuffer += reasoningText
        await chatUtils.dispatchUIResponse(this.io, SOCKET_EVENTS.REASONING_DELTA, {
          sessionId,
          text: reasoningText,
          chatId: chatId,
          contextUsed: chunk.contextUsed
        } as StreamingDelta, streamUiDelayMs);
      }

      // REASONING (thinking) DONE
      if (ev.type === "reasoning.done") {
        await chatUtils.dispatchUIResponse(this.io, SOCKET_EVENTS.REASONING_DONE, {
          sessionId,
          chatId: chatId
        } as StreamingDone)
      }

      // CONTENT (visible assistant text) DELTA
      if ((ev.type === "text.delta" && ev.text && ev.text != undefined)) {
        contentBuffer += ev.text
        await chatUtils.dispatchUIResponse(this.io, SOCKET_EVENTS.CONTENT_DELTA, {
          sessionId,
          text: ev.text,
          chatId: chatId,
          contextUsed: chunk.contextUsed
        } as StreamingDelta, streamUiDelayMs);
      }

      // CONTENT (visible assistant text) DONE
      if (ev.type === "text.done") {
        await chatUtils.dispatchUIResponse(this.io, SOCKET_EVENTS.CONTENT_DONE, {
          sessionId,
          chatId: chatId
        } as StreamingDone)
      }

      // TOOL CALLS DONE
      if (ev.type === "function_call.complete") {
        const userCommands = CommandService.getInstance().getAllCommandsForUser(userId)
        const commandContext = (userCommands ? await Parser.parseSlashCommands(chunk.content as string, userCommands) : undefined) as SlashCommandContext
        if (commandContext.command) {
          const personaUpdate = await chatUtils.handlePersonaUpdate(this.io, this.templateManager, this.providerData, this.mcpUtils, commandContext, sessionId, persona, personaConfig, sysMsg, isDeveloperMode, this.chatProvider)
          persona = personaUpdate.persona
          personaConfig = personaUpdate.personaConfig
          sysMsg = personaUpdate.sysMsg
        }

        if (ev.toolCall?.length) {
          toolCalls.push(...ev.toolCall)
        } else if (chunk.tool_calls && chunk.tool_calls.length > 0) {
          toolCalls.push(...chunk.tool_calls)
        }
      }

      // COMPLETED
      if (ev.type === "completed") {
        const completed = ev.message;
        if (completed?.tool_calls?.length) {
          for (const tc of completed.tool_calls) {
            if (!toolCalls.some((existing) => existing.id === tc.id)) {
              toolCalls.push(tc);
            }
          }
        }
        const trailingContent =
          typeof completed?.content === 'string' ? completed.content.trim() : '';
        if (trailingContent && contentBuffer.length === 0) {
          contentBuffer = trailingContent;
          await chatUtils.dispatchUIResponse(this.io, SOCKET_EVENTS.CONTENT_DELTA, {
            sessionId,
            text: trailingContent,
            chatId: chatId,
            contextUsed: chunk.contextUsed,
          } as StreamingDelta, streamUiDelayMs);
        }
        break;
      }
    }

    return {
      contentBuffer: contentBuffer,
      reasoningBuffer: reasoningBuffer,
      persona: persona,
      personaConfig: personaConfig,
      sysMsg: sysMsg,
      toolCalls: toolCalls
    }
  }
}