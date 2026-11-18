import type { Server as SocketIOServer } from 'socket.io'
import { SlashCommandContext, AgentResponse } from '../agent-response-parser'
import {
  ChatMessage,
  ProviderData,
  ChatPersona,
  Persona,
  LLMProvider,
  FILE_PATHS,
  ExtendedFileResolved,
  ParsedModelOutput,
  ChatRole,
  MCPToolInterface,
} from '../../../shared/types'
import z from 'zod'
import { TemplateManager } from '../template-manager'
import { MCPUtils } from '../mcp-utils'
import { ConversationMemory } from '../../../backend/chroma/conversation-memory'
import { fileHelpers } from '../file-helpers'
import { VSCodeLogger } from '../logger'
import MCPToolRegistry from '@/backend/mcp/mcp-tool'
import { ChatOrchestrator } from './chat-orchestrator'
import { baseUtils } from './base-utils'
import { CommandService } from '@/backend/db/Command/command-service'
import { resolveSystemPromptAssembly } from '../../../shared/config/lab-system-prompt'
import {
  buildToolFailureRecoveryUserMessage,
  shouldSkipToolFailureRecoveryNudge,
  type ToolFailureSummary,
} from '../tool-failure-agent-guidance'

export class chatUtils {

  static isStopRequest: boolean = false

  static async toolRunner(
    chatProvider: LLMProvider | undefined,
    io: SocketIOServer | null,
    mcpUtils: MCPUtils,
    mcpRegistry: MCPToolRegistry,
    templateManager: TemplateManager,
    providerData: ProviderData,
    userId: number,
    sessionId: string,
    persona: ChatPersona,
    personaConfig: Persona | undefined,
    sysMsg: string,
    messages: ChatMessage[],
    agentResponse: AgentResponse,
    files: ExtendedFileResolved[] | undefined,
    chatId: string,
    isStreaming: boolean,
    noResponseHandler: boolean,
    noResponseReasoning: string,
    invalidToolCallExtracted: boolean,
    invalidToolCallError: string,
    invalidToolCallOriginalJson: string,
    isDeveloperMode: boolean
  ): Promise<void> {

    if (!chatProvider) return

    const outputRulesViolationMsg: string = `
## Critical Output Rules

- **🚫 PROHIBITED: Do NOT use json in responses**
- **🚫 PROHIBITED: Do NOT use any xml markup tags (<>, <function>, <parameter>, etc.) in any reasoning or conversational explanations**
- **✅ ALLOWED: Markdown formatting, code blocks, and plain text only**`

    const toolCallData = agentResponse.tool_calls != undefined && agentResponse.tool_calls.length > 0

    const toolResults: ChatMessage[] = []

    if ((noResponseHandler || invalidToolCallExtracted) && !toolCallData) {

      const finalMessages: ChatMessage[] = [];

      finalMessages.push(...messages);

      const noResponseContent = `**CRITICAL!** Your previous response only contained reasoning without any content or tool_calls!
      
You MUST ALWAYS provide either user content or tool_calls. 

Here was your previous message reasoning: [${noResponseReasoning}]`

      const invalidToolCallContent = `**CRITICAL!** Your previous tool call contained malformed JSON!
      
COMMON MISTAKES TO AVOID

| Mistake | Impact | Prevention |
| ------- | ------ | ---------- |
| Sending JSON as plain text | Tool call not recognized | Only use system tool calling mechanism |
| Using XML tags in response | Formatting errors | Use markdown only |
| Missing required parameters | Tool execution fails | Validate against schema first |
| Wrong parameter types | Validation errors | Match Zod schemas exactly |
| Mismatched curly braces \`{}\` | Malformed tool call | **Count opening and closing braces before sending** - ensure every \`{\` has a matching \`}\` |

Here is the JSON.parse error:
${invalidToolCallError}

Here was the original malformed JSON:
${invalidToolCallOriginalJson}]`

      let userContent = ''

      if (noResponseHandler) userContent += noResponseContent
      if (invalidToolCallExtracted) {
        if (noResponseHandler) {
          userContent += `\n\n${invalidToolCallContent}`
        } else {
          userContent += invalidToolCallContent
        }
      }

      finalMessages.push({ role: 'user', content: userContent })

      await this.continueAfterPreparedMessages(
        chatProvider,
        io,
        mcpUtils,
        mcpRegistry,
        templateManager,
        providerData,
        userId,
        sessionId,
        persona,
        personaConfig,
        sysMsg,
        finalMessages,
        files,
        chatId,
        isStreaming,
        isDeveloperMode,
      )
    }

    if (agentResponse.commandContext?.command != undefined) {

      const finalMessages: ChatMessage[] = [];

      finalMessages.push(...messages);
      finalMessages.push({ role: 'user', content: agentResponse.commandContext.message });

      await this.continueAfterPreparedMessages(
        chatProvider,
        io,
        mcpUtils,
        mcpRegistry,
        templateManager,
        providerData,
        userId,
        sessionId,
        persona,
        personaConfig,
        sysMsg,
        finalMessages,
        files,
        chatId,
        isStreaming,
        isDeveloperMode,
      )
    } else {

      if (toolCallData) {

        let _toolResult: {
          messages: ChatMessage[];
          isPersonaUpdated?: boolean;
          updatedPersona?: ChatPersona | undefined;
          bypassAgentNotification?: boolean;
          toolFailureSummaries?: ToolFailureSummary[];
        } = {
          messages: [],
          isPersonaUpdated: false,
          updatedPersona: undefined
        }

        _toolResult = await mcpUtils.executeToolSequence(io, userId, sessionId, persona, agentResponse.tool_calls, agentResponse.message, isStreaming, chatId, isDeveloperMode)
        if (_toolResult.isPersonaUpdated && _toolResult.updatedPersona) persona = _toolResult.updatedPersona
        toolResults.push(
          ..._toolResult.messages
        )

        if (_toolResult.isPersonaUpdated && _toolResult.updatedPersona) {
          const updatedSysMetaData = await templateManager.buildSystemInstructions(
            sessionId,
            _toolResult.updatedPersona,
            isDeveloperMode,
            providerData,
            mcpUtils,
            resolveSystemPromptAssembly(chatProvider),
          );

          sysMsg = updatedSysMetaData.sysMsg;
          personaConfig = updatedSysMetaData.personaConfig;
        }

        const finalMessages: ChatMessage[] = [];

        finalMessages.push(...messages);
        finalMessages.push(...toolResults);

        const violationCount = messages.filter(_ => _.role == 'user' && (_.content as string).startsWith('🚫 You violated the Critical Output Rule')).length

        if (agentResponse.toolCallFromContent) {
          const newMsg = { role: 'user' as ChatRole, content: `🚫 You violated the Critical Output Rules ${violationCount > 0 ? `${violationCount + 1} times ` : ``}by outputting json in your response to the user and must stop immediatley! The only exception to this is if the user has explicitly requested\n${outputRulesViolationMsg}` }
          await ConversationMemory.getInstance().addTurn({ userId: userId, sessionId: sessionId, ...newMsg });
          finalMessages.push(newMsg)
        }
        if (agentResponse.toolCallFromReasoning) {
          const newMsg = { role: 'user' as ChatRole, content: `🚫 You violated the Critical Output Rules ${violationCount > 0 ? `${violationCount + 1} times ` : ``}by outputting xml tags in your reasoning and/or conversational explanations and must stop immediatley!\n${outputRulesViolationMsg}` }
          await ConversationMemory.getInstance().addTurn({ userId: userId, sessionId: sessionId, ...newMsg });
          finalMessages.push(newMsg)
        }

        const failureSummaries = _toolResult.toolFailureSummaries ?? [];
        if (
          failureSummaries.length > 0 &&
          !shouldSkipToolFailureRecoveryNudge(failureSummaries)
        ) {
          const recoveryMsg = {
            role: 'user' as ChatRole,
            content: buildToolFailureRecoveryUserMessage(failureSummaries),
          };
          await ConversationMemory.getInstance().addTurn({
            userId,
            sessionId,
            ...recoveryMsg,
          });
          finalMessages.push(recoveryMsg);
        }

        if (_toolResult.bypassAgentNotification) 
          return

        (await VSCodeLogger.getInstance()).json('[TOOL]: sent to provider', finalMessages)

        await this.continueAfterPreparedMessages(
          chatProvider,
          io,
          mcpUtils,
          mcpRegistry,
          templateManager,
          providerData,
          userId,
          sessionId,
          persona,
          personaConfig,
          sysMsg,
          finalMessages,
          files,
          chatId,
          isStreaming,
          isDeveloperMode,
        )
      }
    }
  }

  private static async continueAfterPreparedMessages(
    chatProvider: LLMProvider | undefined,
    io: SocketIOServer | null,
    mcpUtils: MCPUtils,
    mcpRegistry: MCPToolRegistry,
    templateManager: TemplateManager,
    providerData: ProviderData,
    userId: number,
    sessionId: string,
    persona: ChatPersona,
    personaConfig: Persona | undefined,
    sysMsg: string,
    finalMessages: ChatMessage[],
    files: ExtendedFileResolved[] | undefined,
    chatId: string,
    isStreaming: boolean,
    isDeveloperMode: boolean,
  ): Promise<void> {
    await ChatOrchestrator.continueProviderTurn(
      { io, chatProvider, providerData, templateManager, mcpUtils, mcpRegistry },
      {
        userId,
        sessionId,
        persona,
        personaConfig,
        sysMsg,
        finalMessages,
        files,
        chatId,
        isStreaming,
        isDeveloperMode,
      },
      (updatedParser, fm, p, pc, sm, flags) =>
        this.toolRunner(
          chatProvider,
          io,
          mcpUtils,
          mcpRegistry,
          templateManager,
          providerData,
          userId,
          sessionId,
          p,
          pc,
          sm,
          fm,
          updatedParser,
          files,
          chatId,
          isStreaming,
          flags.noResponseHandler,
          flags.noResponseReasoning,
          flags.invalidToolCallExtracted,
          flags.invalidToolCallError,
          flags.invalidToolCallOriginalJson,
          isDeveloperMode,
        ),
    );
  }

  static requestStop() {
    this.isStopRequest = true;
  }

  static async removeStopRequest(
    io: SocketIOServer | null,
    sessionId: string
  ): Promise<void> {
    void io;
    void sessionId;
    this.isStopRequest = false;
  }

  static isPendingRequestStop() {
    return this.isStopRequest;
  }

  static async dispatchUIResponse(io: SocketIOServer | null, event: string, data: unknown, delay?: number): Promise<void> {
    await baseUtils.dispatchUIResponse(io, event, data, delay)
  }

  static async buildAgentResponse(
    userId: number,
    message: ChatMessage,
    options?: { allowTextToolExtraction?: boolean; allowLeakedToolExtraction?: boolean },
  ): Promise<AgentResponse> {
    return await baseUtils.buildAgentResponse(userId, message, options)
  }

  static async handlePersonaUpdate(io: SocketIOServer | null, templateManager: TemplateManager, providerData: ProviderData, mcpUtils: MCPUtils, commandContext: SlashCommandContext | undefined, sessionId: string, persona: ChatPersona, personaConfig: Persona | undefined, sysMsg: string, isDeveloperMode: boolean, chatProvider?: LLMProvider): Promise<{ persona: ChatPersona, personaConfig: Persona | undefined, sysMsg: string }> {
    return baseUtils.handlePersonaUpdate(io, templateManager, providerData, mcpUtils, commandContext, sessionId, persona, personaConfig, sysMsg, isDeveloperMode, chatProvider)
  }

  static async summarizeRequest(userId: number, io: SocketIOServer | null, chatProvider: LLMProvider | undefined, sessionId: string, messages: ChatMessage[]): Promise<string> {
    return await baseUtils.summarizeRequest(userId, io, chatProvider, sessionId, messages)
  }

  static async getSystemSummaryMessage(): Promise<string> {
    return await fileHelpers.readFile(FILE_PATHS.SYSTEM_SUMMARY_MESSAGE)
  }

  static filterToolsByPersona(
    allTools: MCPToolInterface<z.ZodObject<z.ZodRawShape>>[],
    allowedToolIds: string[],
  ): MCPToolInterface<z.ZodObject<z.ZodRawShape>>[] {
    return allTools.filter((tool) => allowedToolIds.includes(tool.id))
  }

  static filterCommandsByPersona(userId: number, allowedCommandKeys: string[]) {
    const userCommands = CommandService.getInstance().getAllCommandsForUser(userId)
    return userCommands.filter(command => allowedCommandKeys.includes(command.key))
  }

  static extractReasoningAndContent(
    rawReasoning: string,
    rawContent: string
  ): { reasoning: string; content: string } {
    return baseUtils.extractReasoningAndContent(rawReasoning, rawContent)
  }

  static parseModelOutput(
    rawContent: string = '',
    rawReasoning: string = '',
    options?: { allowTextToolExtraction?: boolean; allowLeakedToolExtraction?: boolean },
  ): ParsedModelOutput {
    return baseUtils.parseModelOutput(rawContent, rawReasoning, options)
  }

  static async dispatchEstContextUpdate(chatProvider: LLMProvider, io: SocketIOServer | null, sessionId: string, contextUsed: number | undefined): Promise<void> {
    await baseUtils.dispatchEstContextUpdate(chatProvider, io, sessionId, contextUsed)
  }
}