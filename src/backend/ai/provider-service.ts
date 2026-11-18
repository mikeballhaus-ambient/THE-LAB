import {
  adapterSupportsStreaming,
  createProviderAdapter,
  getStreamFallbackNotice,
} from './provider-adapter-factory'
import { VSCodeLogger } from '../utils/logger'
import type { Server as SocketIOServer } from 'socket.io'
import type { Socket as RawSocket } from 'socket.io';
import { MCPUtils } from '../utils/mcp-utils'
import { TemplateManager } from '../utils/template-manager'
import {
  resolveSystemPromptAssembly,
  type SystemPromptAssemblyOptions,
} from '../../shared/config/lab-system-prompt'

import {
  SOCKET_EVENTS,
  ChatMessage,
  ChatPersona,
  ChatRole,
  PersonaReasoning,
  LLMProvider,
  LLMProviderResponse,
  ChatRequestPayload,
  ProviderConfigBase,
  LLMProviderConfig,
  ProviderData,
  ExtendedFileResolved,
  MCPToolInterface,
} from '../../shared/types'
import aiProviderService from '../db/AIProvider/ai-provider-service'
import MCPToolRegistry from '../mcp/mcp-tool';
import { chatUtils } from '../utils/chat/utils'
import { ChatOrchestrator, type ChatOrchestratorDeps } from '../utils/chat/chat-orchestrator'
import type { LabChatRequestExtras } from '@/shared/game-platform/lab-assistant-banter/lab-game-banter-chat-request';
import z from 'zod';

function resolveLatestUserMessageText(messages: ChatMessage[]): string | undefined {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const msg = messages[i];
    if (msg.role !== 'user') {
      continue;
    }
    const content = msg.content;
    if (typeof content === 'string') {
      return content;
    }
  }
  return undefined;
}

export type CompleteAgentChatRequestResult =
  | { success: true; response: LLMProviderResponse }
  | { success: false; error: string; code: 'NO_PROVIDER' | 'PROVIDER_ERROR' | 'UNEXPECTED_STREAM' };

export class ProviderService {
  private static instance: ProviderService | null = null

  private io: SocketIOServer | null = null
  private socketConnection: RawSocket | null = null
  private mcpUtils!: MCPUtils
  private mcpRegistry!: MCPToolRegistry
  private providerData!: ProviderData
  private generalErrorMsg: string = 'Lab Assistant is on break!'

  private constructor() {

  }

  public static getInstance(): ProviderService {
    if (!ProviderService.instance) {
      ProviderService.instance = new ProviderService()
    }
    return ProviderService.instance
  }

  public async init(): Promise<void> {
    this.mcpUtils = new MCPUtils()
  }

  public async ResolveProviderAdapter(userId: number): Promise<{
    chatProvider: LLMProvider | undefined,
    embedProvider: LLMProvider | undefined
  }> {
    const userProviderConfig = await this.loadConfigAsync(userId)
    if (userProviderConfig) {
      return {
        chatProvider: createProviderAdapter(userProviderConfig.chat),
        embedProvider: createProviderAdapter(userProviderConfig.embed)
      }
    }
    return {
      chatProvider: undefined,
      embedProvider: undefined
    }
  }

  public builProviderAdapter(llmProviderConfig: ProviderConfigBase | undefined): LLMProvider | undefined {
    return createProviderAdapter(llmProviderConfig);
  }

  private async loadConfigAsync(userId: number): Promise<LLMProviderConfig | undefined> {
    try {
      const data: LLMProviderConfig | undefined = aiProviderService.getStructuredUserProviderConfig(userId)
      return data
    } catch {
      return undefined
    }
  }

  public async saveConfig(userId: number, config: LLMProviderConfig): Promise<boolean> {
    try {
      aiProviderService.updateUserProviderConfig(userId, config)

      return true
    } catch (error) {
      const logger = await VSCodeLogger.getInstance()
      logger.error(`[PROVIDER-SERVICE]: Error saving config: ${error}`)
      return false
    }
  }

  public getGeneralErrorMsg(): string {
    return this.generalErrorMsg;
  }

  public async getTemplateManager(userId: number): Promise<TemplateManager> {
    return new TemplateManager(userId).init()
  }

  public async getTemplateManagerData(
    templateManager: TemplateManager,
    sessionId: string,
    persona: ChatPersona,
    isDeveloperMode: boolean,
    assembly?: SystemPromptAssemblyOptions,
  ) {
    return await templateManager.buildSystemInstructions(
      sessionId,
      persona,
      isDeveloperMode,
      this.providerData,
      this.mcpUtils,
      assembly,
    );
  }

  public setMCPRegistry(): void {
    this.mcpRegistry = MCPToolRegistry.getInstance()
  }

  public setProviderData(providerData: ProviderData): void {
    this.providerData = providerData
  }

  public getProviderData(): ProviderData {
    return this.providerData
  }

  public setSocketIOServer(io: SocketIOServer): void {
    this.io = io
  }

  public getSocketIOServer(): SocketIOServer | null {
    return this.io
  }

  public setSocketConnection(socketConnection: RawSocket): void {
    this.socketConnection = socketConnection
  }

  public getSocketConnection(): RawSocket | null {
    return this.socketConnection
  }

  public getGlobalSysMsg(): string {
    return this.providerData.sysMsg
  }

  public setGlobalSysMsg(data: string): void {
    this.providerData.sysMsg = data
  }

  public getMCPUtils(): MCPUtils {
    return this.mcpUtils
  }

  public getMCPRegistry(): MCPToolRegistry {
    return this.mcpRegistry
  }

  private buildChatOrchestratorDeps(
    chatProvider: LLMProvider | undefined,
    templateManager: TemplateManager,
  ): ChatOrchestratorDeps {
    return {
      io: this.io,
      chatProvider,
      providerData: this.providerData,
      templateManager,
      mcpUtils: this.mcpUtils,
      mcpRegistry: this.mcpRegistry,
    }
  }

  /**
   * Generates a chat response and returns the result data.
   * Uses internal ProviderService dependencies (cached) to avoid redundant retrieval.
   * 
   * @param sessionId - Current session ID
   * @param persona - Chat persona to use
   * @param messages - Array of chat messages
   * @param files - Optional file attachments
   * @param chatId - Current chat message ID
   * @returns Response data from ChatManager.responseHandler()
   */

  public async generateStreamResponse(
    userId: number,
    sessionId: string,
    persona: ChatPersona,
    messages: ChatMessage[],
    files: ExtendedFileResolved[] | undefined,
    chatId: string | 'latest',
    isDeveloperMode: boolean,
    labSidecarContext?: import('../../shared/types/lab-sidecar-view-context').LabSidecarChatContext,
    chatRequestExtras?: LabChatRequestExtras,
    labUserDisplayName?: string,
  ): Promise<void> {
    try {
      const providers = await this.ResolveProviderAdapter(userId)
      if (!providers?.chatProvider) return

      if (!adapterSupportsStreaming(providers.chatProvider)) {
        const logger = await VSCodeLogger.getInstance()
        logger.info(`[PROVIDER-SERVICE] ${getStreamFallbackNotice(providers.chatProvider)}`)
        await this.dispatchUIResponse(SOCKET_EVENTS.ERROR, {
          message: getStreamFallbackNotice(providers.chatProvider),
        })
        await this.generateResponse(
          userId,
          sessionId,
          persona,
          messages,
          files,
          chatId,
          isDeveloperMode,
          labSidecarContext,
          chatRequestExtras,
          labUserDisplayName,
        )
        return
      }

      await chatUtils.removeStopRequest(this.io, sessionId);
      const templateManager = await this.getTemplateManager(userId)
      const assembly = resolveSystemPromptAssembly(providers.chatProvider);
      let { sysMsg, personaConfig } = await this.getTemplateManagerData(
        templateManager,
        sessionId,
        persona,
        isDeveloperMode,
        assembly,
      );
      const { appendLabSidecarContextToSystemMessage } = await import(
        '../utils/lab-sidecar-system-prompt'
      );
      sysMsg = await appendLabSidecarContextToSystemMessage(sysMsg, labSidecarContext);
      const { appendLabUserDisplayNameToSystemMessage } = await import(
        '@/shared/composables/lab-user-display-name-system-prompt'
      );
      sysMsg = appendLabUserDisplayNameToSystemMessage(sysMsg, labUserDisplayName);
      const latestUserText = resolveLatestUserMessageText(messages);
      const { appendLabIntegrationsPromptLayers } = await import(
        '../utils/lab-integrations-system-prompt'
      );
      sysMsg = await appendLabIntegrationsPromptLayers(sysMsg, {
        latestUserMessage: latestUserText,
        labSidecarContext,
        currentPersonaName: persona,
      });
      const { appendKbRagLayersToSystemMessage } = await import('../utils/kb-rag-preinject');
      sysMsg = await appendKbRagLayersToSystemMessage(sysMsg, {
        latestUserMessage: latestUserText ?? '',
        userId,
        currentPersonaName: persona,
      });
      const { prepareLabSidecarChatTurn } = await import('../utils/apply-lab-sidecar-chat-turn');
      personaConfig = prepareLabSidecarChatTurn(sessionId, personaConfig, labSidecarContext);

      if (messages.length > 0) {
        messages = messages.filter(_ => _.role != 'system')
      }

      const fullMessages: ChatMessage[] = [{ role: 'system' as ChatRole, content: sysMsg }]

      fullMessages.push(...messages)

      await ChatOrchestrator.runInitialTurn(this.buildChatOrchestratorDeps(providers.chatProvider, templateManager), {
          userId,
          sessionId,
          persona,
          personaConfig,
          sysMsg,
          fullMessages,
          files,
          chatId,
          isStreaming: true,
          isDeveloperMode,
          chatRequestExtras,
        },
      )
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      const logger = await VSCodeLogger.getInstance()
      logger.error(`Error generating chat response: ${errorMessage}`)

      await chatUtils.dispatchUIResponse(this.io, SOCKET_EVENTS.RESPONSE, {
        content: `Oops! ${this.getGeneralErrorMsg()}`,
        sender: 'assistant',
        metadata: { sessionId }
      })
    }
  }

  public async generateResponse(
    userId: number,
    sessionId: string,
    persona: ChatPersona,
    messages: ChatMessage[],
    files: ExtendedFileResolved[] | undefined,
    chatId: string | 'latest',
    isDeveloperMode: boolean,
    labSidecarContext?: import('../../shared/types/lab-sidecar-view-context').LabSidecarChatContext,
    chatRequestExtras?: LabChatRequestExtras,
    labUserDisplayName?: string,
  ): Promise<void> {
    try {
      const providers = await this.ResolveProviderAdapter(userId)
      if (!providers) return
      await chatUtils.removeStopRequest(this.io, sessionId);
       const templateManager = await this.getTemplateManager(userId)
      const assembly = resolveSystemPromptAssembly(providers.chatProvider);
      let { sysMsg, personaConfig } = await this.getTemplateManagerData(
        templateManager,
        sessionId,
        persona,
        isDeveloperMode,
        assembly,
      );
      const { appendLabSidecarContextToSystemMessage } = await import(
        '../utils/lab-sidecar-system-prompt'
      );
      sysMsg = await appendLabSidecarContextToSystemMessage(sysMsg, labSidecarContext);
      const { appendLabUserDisplayNameToSystemMessage } = await import(
        '@/shared/composables/lab-user-display-name-system-prompt'
      );
      sysMsg = appendLabUserDisplayNameToSystemMessage(sysMsg, labUserDisplayName);
      const latestUserText = resolveLatestUserMessageText(messages);
      const { appendLabIntegrationsPromptLayers } = await import(
        '../utils/lab-integrations-system-prompt'
      );
      sysMsg = await appendLabIntegrationsPromptLayers(sysMsg, {
        latestUserMessage: latestUserText,
        labSidecarContext,
        currentPersonaName: persona,
      });
      const { appendKbRagLayersToSystemMessage } = await import('../utils/kb-rag-preinject');
      sysMsg = await appendKbRagLayersToSystemMessage(sysMsg, {
        latestUserMessage: latestUserText ?? '',
        userId,
        currentPersonaName: persona,
      });
      const { prepareLabSidecarChatTurn } = await import('../utils/apply-lab-sidecar-chat-turn');
      personaConfig = prepareLabSidecarChatTurn(sessionId, personaConfig, labSidecarContext);

      if (messages.length > 0) {
        messages = messages.filter(_ => _.role != 'system')
      }

      const fullMessages: ChatMessage[] = [{ role: 'system' as ChatRole, content: sysMsg }]

      fullMessages.push(...messages)

      await ChatOrchestrator.runInitialTurn(this.buildChatOrchestratorDeps(providers.chatProvider, templateManager), {
          userId,
          sessionId,
          persona,
          personaConfig,
          sysMsg,
          fullMessages,
          files,
          chatId,
          isStreaming: false,
          isDeveloperMode,
          chatRequestExtras,
        },
      )
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      const logger = await VSCodeLogger.getInstance()
      logger.error(`Error generating chat response: ${errorMessage}`)

      await this.dispatchUIResponse(SOCKET_EVENTS.RESPONSE, {
        content: `Oops! ${this.getGeneralErrorMsg()}`,
        sender: 'assistant',
        metadata: { sessionId }
      })
    }
  }

  public async summarizeRequest(userId: number, sessionId: string, messages: ChatMessage[]): Promise<string> {
    const providers = await this.ResolveProviderAdapter(userId)
    return providers ? await chatUtils.summarizeRequest(userId, this.io, providers.chatProvider, sessionId, messages) : ''
  }

  public filterToolsByPersona(
    allTools: MCPToolInterface<z.ZodObject<z.ZodRawShape>>[],
    allowedToolIds: string[],
  ): MCPToolInterface<z.ZodObject<z.ZodRawShape>>[] {
    return allTools.filter((tool) => allowedToolIds.includes(tool.id))
  }

  public filterCommandsByPersona(userId: number, allowedCommandKeys: string[]) {
    return chatUtils.filterCommandsByPersona(userId, allowedCommandKeys)
  }

  public async dispatchUIResponse(event: string, data: unknown, delay?: number): Promise<void> {
    await chatUtils.dispatchUIResponse(this.io, event, data, delay)
  }

  public getTemperature(reasoning: PersonaReasoning): number {
    return Object.values(reasoning)[0]
  }

  public getConfig(userId?: number): LLMProviderConfig | undefined {
    if (userId !== undefined) {
      // Return user-specific config
      const data: LLMProviderConfig | undefined = aiProviderService.getStructuredUserProviderConfig(userId);
      return data;
    }
    return undefined
  }

  /**
   * Non-streaming chat completion for platform agent jobs (games, tools).
   * Pass structural/mock tools via `tools` + `config.structuralToolIds` / `requiredStructuralToolId`.
   */
  public async completeAgentChatRequest(
    userId: number,
    messages: ChatMessage[],
    tools: MCPToolInterface<z.ZodTypeAny>[],
    config: ChatRequestPayload,
  ): Promise<CompleteAgentChatRequestResult> {
    const { chatProvider } = await this.ResolveProviderAdapter(userId);
    if (!chatProvider) {
      return {
        success: false,
        error: 'No chat provider configured',
        code: 'NO_PROVIDER',
      };
    }
    try {
      const raw = await chatProvider.makeChatRequest(
        messages,
        undefined,
        config,
        tools as MCPToolInterface<z.ZodObject<z.ZodRawShape>>[],
        false,
      );
      if (!raw || typeof (raw as AsyncGenerator<ChatMessage>).next === 'function') {
        return {
          success: false,
          error: 'Unexpected streaming response',
          code: 'UNEXPECTED_STREAM',
        };
      }
      const response = raw as LLMProviderResponse;
      if (response.message?.isError) {
        return {
          success: false,
          error:
            typeof response.message.content === 'string'
              ? response.message.content
              : 'Provider returned an error response',
          code: 'PROVIDER_ERROR',
        };
      }
      return { success: true, response };
    } catch (err) {
      const logger = await VSCodeLogger.getInstance();
      logger.error(
        `[PROVIDER-SERVICE] completeAgentChatRequest failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Provider request failed',
        code: 'PROVIDER_ERROR',
      };
    }
  }
}
