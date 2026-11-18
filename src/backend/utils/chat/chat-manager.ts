import type { Server as SocketIOServer } from 'socket.io'
import {
  SOCKET_EVENTS,
  ChatMessage,
  ChatPersona,
  Persona,
  LLMProvider,
  ChatRequestPayload,
  ProviderData,
  ExtendedFileResolved,
  LLMProviderResponse,
  ChatResponseData
} from '@/shared/types';
import MCPToolRegistry from '../../mcp/mcp-tool';
import { chatUtils } from './utils';
import { TemplateManager } from '../template-manager';
import { MCPUtils } from '../mcp-utils';
import { AgentResponse } from '../agent-response-parser';
import { ContextSettingsService } from '@/backend/db/ContextSettings/context-settings-service';
import { resolveModelOutputParseOptions } from '@/shared/config/lab-provider-capabilities';
import type { LabChatRequestExtras } from '@/shared/game-platform/lab-assistant-banter/lab-game-banter-chat-request';

export class ChatManager {

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

  public async toolHandler(userId: number,
    sessionId: string,
    persona: ChatPersona,
    personaConfig: Persona | undefined,
    sysMsg: string,
    messages: ChatMessage[],
    files: ExtendedFileResolved[] | undefined,
    chatId: string,
    agentResponse: AgentResponse,
    isDeveloperMode: boolean): Promise<void> {
    if (!this.chatProvider) return undefined

    if (agentResponse?.hasToolCall) {
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
        false,
        false,
        '',
        agentResponse.invalidToolCallExtracted,
        agentResponse.invalidToolCallError,
        agentResponse.invalidToolCallOriginalJson,
        isDeveloperMode)
    }
  }

  public async responseHandler(userId: number,
    sessionId: string,
    persona: ChatPersona,
    personaConfig: Persona | undefined,
    messages: ChatMessage[],
    files: ExtendedFileResolved[] | undefined,
    sysMsg: string,
    chatId: string,
    isDeveloperMode: boolean,
    chatRequestExtras?: LabChatRequestExtras,
  ): Promise<{
    agentResponse: AgentResponse,
    message: ChatMessage,
    persona: ChatPersona,
    personaConfig: Persona | undefined,
    sysMsg: string,
    contextUsed: number | undefined
  }> {

    let message: ChatMessage | undefined = undefined
    let agentResponse: AgentResponse | undefined = undefined

    const result: LLMProviderResponse = await this.requestBuilder(
      userId,
      sessionId,
      persona,
      personaConfig,
      messages,
      files,
      chatRequestExtras,
    ) as LLMProviderResponse & { role: 'assistant' }

    if (this.chatProvider) {

      await chatUtils.dispatchUIResponse(this.io, SOCKET_EVENTS.TOKEN_PROGRESS, {
        sessionId,
        percentage: result.contextUsedPercentage
      })
    }

    let usagePercentage = result.contextUsedPercentage;
    const contextSettings = await ContextSettingsService.getInstance().getContextSettings(userId)
    const contextUsageThreshold = contextSettings && contextSettings.enableAutoSummarization ? contextSettings.triggerSummarizationPercent : 100;

    if (usagePercentage && usagePercentage > contextUsageThreshold) {
      const summaryMsg = await chatUtils.summarizeRequest(userId, this.io, this.chatProvider, sessionId, [
        ...messages,
        { role: 'assistant', content: result.message.content } as ChatMessage
      ])

      result.message.content = summaryMsg;
      usagePercentage = 0
    }

    const agentParseOpts = resolveModelOutputParseOptions(this.chatProvider);

    if (result.message.isError) {
      const errorAgentResponse = await chatUtils.buildAgentResponse(
        userId,
        result.message,
        agentParseOpts,
      );
      const errorMessage = {
        role: 'assistant',
        chatId: chatId,
        content: errorAgentResponse.message,
        reasoning: errorAgentResponse.reasoning,
        tool_calls: errorAgentResponse.tool_calls,
        hasToolCalls: errorAgentResponse.hasToolCall,
        sender: 'assistant',
        isError: true,
        metadata: {
          sessionId,
        },
      } as ChatMessage;

      await chatUtils.dispatchUIResponse(this.io, SOCKET_EVENTS.RESPONSE, {
        chatId: chatId,
        content: errorAgentResponse.message,
        reasoning: errorAgentResponse.reasoning,
        sender: 'assistant',
        metadata: {
          sessionId,
        },
      } as ChatResponseData);

      await chatUtils.dispatchUIResponse(this.io, SOCKET_EVENTS.TOKEN_PROGRESS, {
        sessionId,
        percentage: usagePercentage,
      });

      return {
        agentResponse: errorAgentResponse,
        message: errorMessage,
        persona,
        personaConfig,
        sysMsg,
        contextUsed: usagePercentage,
      };
    }

    agentResponse = await chatUtils.buildAgentResponse(userId, result.message, agentParseOpts)

    const isAgentSlashCommand = agentResponse.commandContext?.command != undefined
    if (isAgentSlashCommand) {
      const personaUpdate = await chatUtils.handlePersonaUpdate(this.io, this.templateManager, this.providerData, this.mcpUtils, agentResponse.commandContext, sessionId, persona, personaConfig, sysMsg, isDeveloperMode, this.chatProvider)
      persona = personaUpdate.persona
      personaConfig = personaUpdate.personaConfig
      sysMsg = personaUpdate.sysMsg
    }

    message = {
      role: 'assistant',
      chatId: chatId,
      content: agentResponse.message,
      reasoning: agentResponse.reasoning,
      tool_calls: agentResponse.tool_calls,
      hasToolCalls: agentResponse.hasToolCall,
      sender: 'assistant',
      isError: result.message.isError,
      metadata: {
        sessionId
      }
    } as ChatMessage

    await chatUtils.dispatchUIResponse(this.io, SOCKET_EVENTS.RESPONSE, {
      chatId: chatId,
      content: agentResponse.message,
      reasoning: agentResponse.reasoning,
      sender: 'assistant',
      metadata: {
        sessionId
      }
    } as ChatResponseData)

    await chatUtils.dispatchUIResponse(this.io, SOCKET_EVENTS.TOKEN_PROGRESS, {
      sessionId,
      percentage: usagePercentage
    })

    return {
      message,
      agentResponse,
      sysMsg,
      persona,
      personaConfig,
      contextUsed: usagePercentage
    }
  }

  private async requestBuilder(
    userId: number,
    sessionId: string,
    persona: ChatPersona,
    personaConfig: Persona | undefined,
    messages: ChatMessage[],
    files: ExtendedFileResolved[] | undefined,
    chatRequestExtras?: LabChatRequestExtras,
  ): Promise<LLMProviderResponse | undefined> {
    if (!this.chatProvider) return undefined
    return await this.chatProvider.makeChatRequest(messages, files, {
      sessionId: sessionId,
      persona: persona,
      personaConfig: personaConfig,
      ...chatRequestExtras,
    } as ChatRequestPayload,
      this.mcpRegistry.getAllToolsForUser(userId),
      false) as LLMProviderResponse
  }


}
