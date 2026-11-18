import type { Server as SocketIOServer } from 'socket.io';
import type { AgentResponse } from '../agent-response-parser';
import { VSCodeLogger } from '../logger';
import { ConversationMemory } from '../../chroma/conversation-memory';
import MCPToolRegistry from '../../mcp/mcp-tool';
import type {
  ChatMessage,
  ChatPersona,
  ExtendedFileResolved,
  LLMProvider,
  Persona,
  ProviderData,
} from '../../../shared/types';
import { resolveModelOutputParseOptions } from '../../../shared/config/lab-provider-capabilities';
import { ChatManager } from './chat-manager';
import { StreamChatManager } from './stream-chat-manager';
import { MCPUtils } from '../mcp-utils';
import { TemplateManager } from '../template-manager';
import { chatUtils } from './utils';
import {
  applyAgentTurnRecoveryMessages,
  applyStreamTurnRecoveryMessages,
} from './model-turn-recovery';
import type { LabChatRequestExtras } from '@/shared/game-platform/lab-assistant-banter/lab-game-banter-chat-request';

/**
 * rm-46 **2.14** + **4.3** — shared post-tool continuation and initial user turns.
 * `ChatManager` / `StreamChatManager` remain thin provider adapters; entry is here.
 */
export interface ChatOrchestratorDeps {
  io: SocketIOServer | null;
  chatProvider: LLMProvider | undefined;
  providerData: ProviderData;
  templateManager: TemplateManager;
  mcpUtils: MCPUtils;
  mcpRegistry: MCPToolRegistry;
}

export interface ContinueProviderTurnParams {
  userId: number;
  sessionId: string;
  persona: ChatPersona;
  personaConfig: Persona | undefined;
  sysMsg: string;
  finalMessages: ChatMessage[];
  files: ExtendedFileResolved[] | undefined;
  chatId: string;
  isStreaming: boolean;
  isDeveloperMode: boolean;
}

export type ToolRunnerRecursion = (
  agentResponse: AgentResponse,
  finalMessages: ChatMessage[],
  persona: ChatPersona,
  personaConfig: Persona | undefined,
  sysMsg: string,
  flags: {
    noResponseHandler: boolean;
    noResponseReasoning: string;
    invalidToolCallExtracted: boolean;
    invalidToolCallError: string;
    invalidToolCallOriginalJson: string;
  },
) => Promise<void>;

export interface RunInitialTurnParams {
  userId: number;
  sessionId: string;
  persona: ChatPersona;
  personaConfig: Persona | undefined;
  sysMsg: string;
  fullMessages: ChatMessage[];
  files: ExtendedFileResolved[] | undefined;
  chatId: string | 'latest';
  isStreaming: boolean;
  isDeveloperMode: boolean;
  chatRequestExtras?: LabChatRequestExtras;
}

export class ChatOrchestrator {
  /** First model turn from socket MESSAGE / follow-up (recovery + tools before toolRunner). */
  static async runInitialTurn(deps: ChatOrchestratorDeps, params: RunInitialTurnParams): Promise<void> {
    const { chatProvider } = deps;
    if (!chatProvider) {
      return;
    }

    if (params.isStreaming) {
      const streamManger = new StreamChatManager(
        deps.io,
        chatProvider,
        deps.providerData,
        deps.templateManager,
        deps.mcpUtils,
        deps.mcpRegistry,
      );
      const streamResponse = await streamManger.streamingResponseHandler(
        params.userId,
        params.sessionId,
        params.persona,
        params.personaConfig,
        params.sysMsg,
        params.fullMessages,
        params.files,
        params.chatId,
        false,
        params.isDeveloperMode,
        params.chatRequestExtras,
      );

      if (streamResponse.contentBuffer && streamResponse.contentBuffer.trim().length > 0) {
        await ConversationMemory.getInstance().addTurn({
          userId: params.userId,
          sessionId: params.sessionId,
          role: 'assistant',
          content: streamResponse.contentBuffer,
        });
      }

      if (streamResponse.toolCalls.length === 0) {
        const recoveryAction = applyStreamTurnRecoveryMessages(
          {
            executableToolCallsLength: streamResponse.toolCalls.length,
            toolCallsLength: streamResponse.toolCalls.length,
            contentLength: streamResponse.contentBuffer.length,
            reasoningLength: streamResponse.reasoningBuffer.length,
            reasoningText: streamResponse.reasoningBuffer,
            invalidToolCallExtracted: streamResponse.invalidToolCallExtracted,
            invalidToolCallError: streamResponse.invalidToolCallError,
            invalidToolCallOriginalJson: streamResponse.invalidToolCallOriginalJson,
            latestChunkIsError: streamResponse.latestChunk?.isError,
          },
          params.fullMessages,
          streamResponse.latestChunk,
        );
        if (recoveryAction !== 'none') {
          await ChatOrchestrator.runInitialTurn(deps, params);
          return;
        }
      }

      if (streamResponse.toolCalls.length > 0) {
        if (streamResponse.latestChunk) {
          params.fullMessages.push(streamResponse.latestChunk);
        }
        await streamManger.streamingToolHandler(
          params.userId,
          params.sessionId,
          streamResponse.persona,
          streamResponse.personaConfig,
          streamResponse.sysMsg,
          params.fullMessages,
          params.files,
          params.chatId,
          streamResponse.parser,
          streamResponse.contentBuffer,
          streamResponse.reasoningBuffer,
          streamResponse.toolCalls,
          streamResponse.latestChunk,
          params.isDeveloperMode,
        );
      }
      return;
    }

    const chatManger = new ChatManager(
      deps.io,
      chatProvider,
      deps.providerData,
      deps.templateManager,
      deps.mcpUtils,
      deps.mcpRegistry,
    );
    const chatResponse = await chatManger.responseHandler(
      params.userId,
      params.sessionId,
      params.persona,
      params.personaConfig,
      params.fullMessages,
      params.files,
      params.sysMsg,
      params.chatId,
      params.isDeveloperMode,
      params.chatRequestExtras,
    );

    if (chatResponse.agentResponse.tool_calls.length === 0) {
      const recoveryAction = applyAgentTurnRecoveryMessages(
        {
          toolCallsLength: chatResponse.agentResponse.tool_calls.length,
          messageLength: chatResponse.agentResponse.message.length,
          reasoningLength: chatResponse.agentResponse.reasoning.length,
          reasoningText: chatResponse.agentResponse.reasoning,
          invalidToolCallExtracted: chatResponse.agentResponse.invalidToolCallExtracted,
          invalidToolCallError: chatResponse.agentResponse.invalidToolCallError,
          invalidToolCallOriginalJson: chatResponse.agentResponse.invalidToolCallOriginalJson,
          messageIsError: chatResponse.message.isError,
        },
        params.fullMessages,
        chatResponse.message,
      );
      if (recoveryAction !== 'none') {
        await ChatOrchestrator.runInitialTurn(deps, params);
        return;
      }
    }

    if (chatResponse.agentResponse.hasToolCall) {
      if (chatResponse.message) {
        params.fullMessages.push(chatResponse.message);
      }
      await chatManger.toolHandler(
        params.userId,
        params.sessionId,
        chatResponse.persona,
        chatResponse.personaConfig,
        chatResponse.sysMsg,
        params.fullMessages,
        params.files,
        params.chatId,
        chatResponse.agentResponse,
        params.isDeveloperMode,
      );
    }
    if (
      chatResponse.agentResponse.message &&
      chatResponse.agentResponse.message.trim().length > 0 &&
      !chatResponse.message.isError
    ) {
      await ConversationMemory.getInstance().addTurn({
        userId: params.userId,
        sessionId: params.sessionId,
        role: 'assistant',
        content: chatResponse.agentResponse.message,
      });
    }
  }

  static async continueProviderTurn(
    deps: ChatOrchestratorDeps,
    params: ContinueProviderTurnParams,
    recurse: ToolRunnerRecursion,
  ): Promise<void> {
    const { chatProvider } = deps;
    if (!chatProvider) return;

    const parseOpts = resolveModelOutputParseOptions(chatProvider);

    if (params.isStreaming) {
      const streamManger = new StreamChatManager(
        deps.io,
        chatProvider,
        deps.providerData,
        deps.templateManager,
        deps.mcpUtils,
        deps.mcpRegistry,
      );
      const streamResponse = await streamManger.streamingResponseHandler(
        params.userId,
        params.sessionId,
        params.persona,
        params.personaConfig,
        params.sysMsg,
        params.finalMessages,
        params.files,
        params.chatId,
        true,
        params.isDeveloperMode,
      );
      await chatUtils.dispatchEstContextUpdate(
        chatProvider,
        deps.io,
        params.sessionId,
        streamResponse.latestChunk?.contextUsed,
      );

      if (streamResponse.latestChunk && (streamResponse.latestChunk.isError || streamResponse.invalidToolCallExtracted)) {
        if (streamResponse.latestChunk.isError && !streamResponse.invalidToolCallExtracted) {
          return;
        }
        params.finalMessages.push(streamResponse.latestChunk);
        const updatedParser = await chatUtils.buildAgentResponse(params.userId, streamResponse.latestChunk, parseOpts);
        await recurse(updatedParser, params.finalMessages, streamResponse.persona, streamResponse.personaConfig, streamResponse.sysMsg, {
          noResponseHandler: false,
          noResponseReasoning: '',
          invalidToolCallExtracted: updatedParser.invalidToolCallExtracted ?? false,
          invalidToolCallError: updatedParser.invalidToolCallError ?? '',
          invalidToolCallOriginalJson: updatedParser.invalidToolCallOriginalJson ?? '',
        });
        return;
      }

      if (streamResponse.toolCalls.length > 0) {
        if (streamResponse.latestChunk) params.finalMessages.push(streamResponse.latestChunk);
        await streamManger.streamingToolHandler(
          params.userId,
          params.sessionId,
          streamResponse.persona,
          streamResponse.personaConfig,
          streamResponse.sysMsg,
          params.finalMessages,
          params.files,
          params.chatId,
          streamResponse.parser,
          streamResponse.contentBuffer,
          streamResponse.reasoningBuffer,
          streamResponse.toolCalls,
          streamResponse.latestChunk,
          params.isDeveloperMode,
        );
      }
      if (streamResponse.contentBuffer?.trim()) {
        await ConversationMemory.getInstance().addTurn({
          userId: params.userId,
          sessionId: params.sessionId,
          role: 'assistant',
          content: streamResponse.contentBuffer,
        });
      }
      if (
        streamResponse.toolCalls.length === 0 &&
        streamResponse.contentBuffer.length === 0 &&
        streamResponse.reasoningBuffer.length > 0 &&
        streamResponse.latestChunk
      ) {
        const updatedParser = await chatUtils.buildAgentResponse(params.userId, streamResponse.latestChunk, parseOpts);
        await recurse(updatedParser, params.finalMessages, streamResponse.persona, streamResponse.personaConfig, streamResponse.sysMsg, {
          noResponseHandler: true,
          noResponseReasoning: updatedParser.reasoning,
          invalidToolCallExtracted: updatedParser.invalidToolCallExtracted ?? false,
          invalidToolCallError: updatedParser.invalidToolCallError ?? '',
          invalidToolCallOriginalJson: updatedParser.invalidToolCallOriginalJson ?? '',
        });
      }
      return;
    }

    const chatManger = new ChatManager(
      deps.io,
      chatProvider,
      deps.providerData,
      deps.templateManager,
      deps.mcpUtils,
      deps.mcpRegistry,
    );
    const chatResponse = await chatManger.responseHandler(
      params.userId,
      params.sessionId,
      params.persona,
      params.personaConfig,
      params.finalMessages,
      params.files,
      params.sysMsg,
      params.chatId,
      params.isDeveloperMode,
    );
    await chatUtils.dispatchEstContextUpdate(chatProvider, deps.io, params.sessionId, chatResponse.contextUsed);

    if (chatResponse.message.isError || chatResponse.agentResponse.invalidToolCallExtracted) {
      if (chatResponse.message.isError && !chatResponse.agentResponse.invalidToolCallExtracted) {
        return;
      }
      params.finalMessages.push(chatResponse.message);
      const updatedParser = await chatUtils.buildAgentResponse(params.userId, chatResponse.message, parseOpts);
      await recurse(updatedParser, params.finalMessages, chatResponse.persona, chatResponse.personaConfig, chatResponse.sysMsg, {
        noResponseHandler: false,
        noResponseReasoning: '',
        invalidToolCallExtracted: updatedParser.invalidToolCallExtracted ?? false,
        invalidToolCallError: updatedParser.invalidToolCallError ?? '',
        invalidToolCallOriginalJson: updatedParser.invalidToolCallOriginalJson ?? '',
      });
      return;
    }

    if (chatResponse.agentResponse.hasToolCall) {
      if (chatResponse.message) params.finalMessages.push(chatResponse.message);
      await chatManger.toolHandler(
        params.userId,
        params.sessionId,
        chatResponse.persona,
        chatResponse.personaConfig,
        chatResponse.sysMsg,
        params.finalMessages,
        params.files,
        params.chatId,
        chatResponse.agentResponse,
        params.isDeveloperMode,
      );
    }
    if (chatResponse.agentResponse.message?.trim()) {
      await ConversationMemory.getInstance().addTurn({
        userId: params.userId,
        sessionId: params.sessionId,
        role: 'assistant',
        content: chatResponse.agentResponse.message,
      });
    }
    if (
      chatResponse.agentResponse.tool_calls.length === 0 &&
      chatResponse.agentResponse.message.length === 0 &&
      chatResponse.agentResponse.reasoning.length > 0 &&
      chatResponse.message
    ) {
      const updatedParser = await chatUtils.buildAgentResponse(params.userId, chatResponse.message, parseOpts);
      await recurse(updatedParser, params.finalMessages, chatResponse.persona, chatResponse.personaConfig, chatResponse.sysMsg, {
        noResponseHandler: true,
        noResponseReasoning: updatedParser.reasoning,
        invalidToolCallExtracted: updatedParser.invalidToolCallExtracted ?? false,
        invalidToolCallError: updatedParser.invalidToolCallError ?? '',
        invalidToolCallOriginalJson: updatedParser.invalidToolCallOriginalJson ?? '',
      });
    }

    (await VSCodeLogger.getInstance()).json('[ChatOrchestrator] batch turn complete', {
      sessionId: params.sessionId,
      hasToolCall: chatResponse.agentResponse.hasToolCall,
    });
  }
}
