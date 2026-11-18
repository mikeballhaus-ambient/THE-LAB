import type { Server as SocketIOServer } from 'socket.io'
import { Parser } from '../parse-utils'
import { SlashCommandContext, AgentResponse } from '../agent-response-parser'
import { ChatMessage, ProviderData, ChatPersona, Persona, PersonaSwitchedEventData, LLMProvider, FILE_PATHS, ParsedModelOutput, MCPToolCall } from '../../../shared/types'
import { SOCKET_EVENTS } from '../../../shared/types'
import { TemplateManager } from '../template-manager'
import { MCPUtils } from '../mcp-utils'
import { ConversationMemory } from '../../../backend/chroma/conversation-memory'
import { fileHelpers } from '../file-helpers'
import { CommandService } from '@/backend/db/Command/command-service'
import { agentHasToolCalls, getMessageToolCalls } from '@/shared/utils/chat-tool-calls'
import { resolveSystemPromptAssembly } from '../../../shared/config/lab-system-prompt'
import {
  assistantTextLooksLikeToolCallLeak,
  extractLeakedToolCallsFromText,
  stripAssistantToolCallJson,
} from '@/shared/utils/leaked-tool-call-extraction'
import {
  mergeToolCallValidationFailure,
  validateToolCallsForExecution,
} from '@/shared/utils/tool-call-turn-validation'
import { VSCodeLogger } from '../logger'
import { getLabChatUiDispatchDelayMs } from '@/shared/config/lab-chat-ui-dispatch-delay'

export class baseUtils {

  static async dispatchUIResponse(io: SocketIOServer | null, event: string, data: unknown, delay?: number): Promise<void> {
    if (io) {
      const waitMs = delay !== undefined ? delay : getLabChatUiDispatchDelayMs()
      if (waitMs > 0) {
        await new Promise(resolve => setTimeout(resolve, waitMs))
      }
      io.emit(event, data)
    }
  }

  static async buildAgentResponse(
    userId: number,
    message: ChatMessage,
    options?: { allowTextToolExtraction?: boolean; allowLeakedToolExtraction?: boolean },
  ): Promise<AgentResponse> {
    const nativeToolCalls = getMessageToolCalls(message);
    const hasNativeToolCalls = nativeToolCalls.length > 0;
    const allowText =
      options?.allowTextToolExtraction !== false && !hasNativeToolCalls;
    const allowLeaked = options?.allowLeakedToolExtraction !== false;
    const parsedContentReasoning = this.parseModelOutput(
      message.content as string,
      message.reasoning,
      {
        allowTextToolExtraction: allowText,
        allowLeakedToolExtraction: allowLeaked,
      },
    );
    const userCommands = CommandService.getInstance().getAllCommandsForUser(userId)
    const extractedToolCalls = parsedContentReasoning.toolCalls.length > 0 ? parsedContentReasoning.toolCalls : [];
    const rawToolCalls = hasNativeToolCalls ? nativeToolCalls : extractedToolCalls;
    const validated = validateToolCallsForExecution(rawToolCalls);
    const invalidMeta = mergeToolCallValidationFailure(
      {
        invalidToolCallExtracted: parsedContentReasoning.invalidToolCallExtracted,
        invalidToolCallError: parsedContentReasoning.invalidToolCallError,
        invalidToolCallOriginalJson: parsedContentReasoning.invalidToolCallOriginalJson,
      },
      validated.rejected,
    );
    const tool_calls = validated.executable;
    return {
      hasToolCall: agentHasToolCalls({ tool_calls, hasToolCall: tool_calls.length > 0 }),
      isToolCallIncomplete: false,
      message: parsedContentReasoning.content as string,
      reasoning: parsedContentReasoning.reasoning != undefined ? parsedContentReasoning.reasoning : '',
      tool_calls,
      commandContext: (userCommands ? await Parser.parseSlashCommands(message.content as string, userCommands) : undefined) as SlashCommandContext,
      toolCallFromContent: parsedContentReasoning.toolCallFromContent,
      toolCallFromReasoning: parsedContentReasoning.toolCallFromReasoning,
      invalidToolCallExtracted: invalidMeta.invalidToolCallExtracted,
      invalidToolCallError: invalidMeta.invalidToolCallError,
      invalidToolCallOriginalJson: invalidMeta.invalidToolCallOriginalJson,
    }
  }

  static async handlePersonaUpdate(io: SocketIOServer | null,
    templateManager: TemplateManager,
    providerData: ProviderData,
    mcpUtils: MCPUtils,
    commandContext: SlashCommandContext | undefined,
    sessionId: string,
    persona: ChatPersona,
    personaConfig: Persona | undefined,
    sysMsg: string,
    isDeveloperMode: boolean,
    chatProvider?: LLMProvider): Promise<{
      persona: ChatPersona,
      personaConfig: Persona | undefined,
      sysMsg: string
    }> {
    let nextSysMsg = sysMsg
    let nextPersonaConfig = personaConfig
    let nextPersona = persona
    if (commandContext?.persona) {
      nextPersona = commandContext.persona
      const { sysMsg: rebuiltSysMsg, personaConfig: rebuiltPersonaConfig } = await templateManager.buildSystemInstructions(
        sessionId,
        nextPersona,
        isDeveloperMode,
        providerData,
        mcpUtils,
        resolveSystemPromptAssembly(chatProvider),
      );
      nextSysMsg = rebuiltSysMsg
      nextPersonaConfig = rebuiltPersonaConfig
      await this.dispatchUIResponse(io, SOCKET_EVENTS.PERSONA_SWITCHED, {
        sessionId: sessionId,
        persona: nextPersona
      } as PersonaSwitchedEventData);
    }

    return {
      persona: nextPersona,
      personaConfig: nextPersonaConfig,
      sysMsg: nextSysMsg
    }
  }

  static async summarizeRequest(userId: number, io: SocketIOServer | null, chatProvider: LLMProvider | undefined, sessionId: string, messages: ChatMessage[]): Promise<string> {

    if (chatProvider) {
      const memory = ConversationMemory.getInstance();

      const validateMessages = this.checkAndSplitMessages(messages, parseInt(chatProvider.llmProviderConfig.maxContext))

      let finalSummaryMessage = ''

      if (!validateMessages.needsSplit) {
        finalSummaryMessage = await chatProvider.summarizeContext(await this.getSystemSummaryMessage(), messages);
      } else {
        const firstSummary = await chatProvider.summarizeContext(await this.getSystemSummaryMessage_Pre(), validateMessages.batch1);
        if (firstSummary) {
          const historicalSummaryContextMessage: ChatMessage = {
            role: "system",
            content: `Here is the foundational summary of the first half of the conversation:\n\n${firstSummary}`
          };
          const combinedBatch2 = [
            historicalSummaryContextMessage,
            ...validateMessages.batch2
          ];
          finalSummaryMessage = await chatProvider.summarizeContext(await this.getSystemSummaryMessage_Post(), combinedBatch2);
        }
      }

      if (!finalSummaryMessage) {
        throw new Error('Failed to generate conversation summary');
      }

      // Clear existing conversation state (BR-003 Step 1 & 2) - Note: clearSession not implemented yet in ConversationMemory
      await memory.deleteAllForSession(sessionId)

      // Add summarized content as assistant message with system-level context (ChatRole restriction in ConversationMemory requires user/assistant/tool)
      await memory.addTurn({
        userId: userId,
        sessionId: sessionId,
        role: 'assistant',
        content: `[SYSTEM SUMMARY] ${finalSummaryMessage}`
      });

      // Dispatch to UI for feedback (FR-015 - Server-side notification of success)
      await this.dispatchUIResponse(io, SOCKET_EVENTS.RESPONSE, {
        sender: 'assistant',
        content: `[SUMMARY MODE] Previous conversation has been summarized. You can continue with a fresh, compacted context.\n\n${finalSummaryMessage}`,
        metadata: {
          operation: 'summary-completed', sessionId: sessionId
        }
      });

      return `[SUMMARY MODE] Previous conversation has been summarized. You can continue with a fresh, compacted context.\n\n${finalSummaryMessage}`
    }

    return ''
  }

  static checkAndSplitMessages(messages: ChatMessage[], tokenLimit = 100000) {
    let totalCharacters = 0;

    const safeTokenThreshold = tokenLimit - 25000;

    // 1. Sum up all characters in the message contents
    messages.forEach(msg => {
      if (msg.content) {
        totalCharacters += msg.content.length;
      }
    });

    // 2. Estimate tokens (4 characters per token + 15% safety buffer for structural JSON overhead)
    const estimatedTokens = Math.ceil((totalCharacters / 4) * 1.15);

    // 3. Check if payload is safe or needs splitting
    if (estimatedTokens <= safeTokenThreshold) {
      return {
        needsSplit: false,
        estimatedTokens: estimatedTokens,
        batch1: messages,
        batch2: []
      };
    }

    // 4. Split the message array in half cleanly by message count index
    const middleIndex = Math.floor(messages.length / 2);
    const batch1 = messages.slice(0, middleIndex);
    const batch2 = messages.slice(middleIndex);

    return {
      needsSplit: true,
      estimatedTokens: estimatedTokens,
      batch1: batch1,
      batch2: batch2
    };
  }

  static async getSystemSummaryMessage(): Promise<string> {
    return await fileHelpers.readFile(FILE_PATHS.SYSTEM_SUMMARY_MESSAGE)
  }

  static async getSystemSummaryMessage_Pre(): Promise<string> {
    return await fileHelpers.readFile(FILE_PATHS.SYSTEM_SUMMARY_MESSAGE_1)
  }

  static async getSystemSummaryMessage_Post(): Promise<string> {
    return await fileHelpers.readFile(FILE_PATHS.SYSTEM_SUMMARY_MESSAGE_2)
  }

  static filterToolsByPersona(allTools: unknown[], allowedToolIds: string[]): unknown[] {
    return allTools.filter((tool) => {
      const id = (tool as { id?: string }).id
      return typeof id === 'string' && allowedToolIds.includes(id)
    })
  }

  static filterCommandsByPersona(userId: number, allowedCommandKeys: string[]): unknown[] {
    const userCommands = CommandService.getInstance().getAllCommandsForUser(userId)
    return userCommands.filter((command) => allowedCommandKeys.includes(command.key))
  }

  static extractReasoningAndContent(
    rawReasoning: string,
    rawContent: string
  ): { reasoning: string; content: string } {
    // Use a non-global regex for simple single-match extraction
    const thinkRegex = /<think>([\s\S]*?)<\/think>/;

    let reasoning = rawReasoning ? rawReasoning.trim() : '';
    let content = rawContent ? rawContent.trim() : '';

    // Check if rawContent contains <think> tags
    const match = thinkRegex.exec(content);

    if (match) {
      // 1. If rawReasoning is empty, extract the <think> text into reasoning
      if (!reasoning) {
        reasoning = match[1].trim();
      }
      // 2. Always strip the <think> tags and text out of the content
      content = content.replace(thinkRegex, '').trim();
    }

    return {
      reasoning,
      content,
    };
  }

  static parseModelOutput(
    rawContent: string = '',
    rawReasoning: string = '',
    options?: { allowTextToolExtraction?: boolean; allowLeakedToolExtraction?: boolean },
  ): ParsedModelOutput {
    const allowTextToolExtraction = options?.allowTextToolExtraction !== false;
    const allowLeakedToolExtraction = options?.allowLeakedToolExtraction !== false;
    const toolCalls: MCPToolCall[] = [];
    let toolCallFromContent = false;
    const toolCallFromReasoning = false;
    let invalidToolCallExtracted = false
    let invalidToolCallError = ''
    let invalidToolCallOriginalJson = ''

    const combinedRaw = `${rawReasoning.trim()}\n${rawContent.trim()}`.trim();

    if (allowTextToolExtraction) {
    // ⭐ Unified JSON parser with unescaping only (no repair)
    const parseJsonWithRepair = (str: string, onError?: (msg: string) => void): unknown => {
      if (typeof str !== 'string') return str;

      // Unescape JSON string (handle escapes, unicode, protect attribute selectors)
      let result = str.replace(/\\\\/g, '\\')
        .replace(/\n/g, '\n')
        .replace(/\r/g, '\r')
        .replace(/\t/g, '\t')
        .replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) =>
          String.fromCharCode(parseInt(hex, 16))
        );

      const attrSelectorPattern = /\[[^\]]*(?:\\"[^"]*\\"|'[^']*'|=)[^\]]*\]/g;
      const protectedChunks: string[] = [];

      result = result.replace(attrSelectorPattern, (m) => {
        const placeholder = `\x00PROTECTED_${protectedChunks.length}\x00`;
        protectedChunks.push(m);
        return placeholder;
      });

      result = result.replace(/\\"/g, '"');

      protectedChunks.forEach((val, i) => {
        result = result.replace(`\x00PROTECTED_${i}\x00`, val);
      });

      // Parse JSON - no repair attempts
      try {
        return JSON.parse(result);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        if (onError) onError(errorMsg);
        throw err;
      }
    };

    const textLogRegex = /\[Tool Call\]Executing:\s*(\w+)\s*with arguments:\s*(\{[\s\S]*?\})/g;
    let logMatch: RegExpExecArray | null;

    while ((logMatch = textLogRegex.exec(combinedRaw)) !== null) {
      const functionName = logMatch[1];
      const rawArguments = logMatch[2];

      try {
        const parsedArgs = parseJsonWithRepair(rawArguments, (msg) => {
          invalidToolCallExtracted = true;
          invalidToolCallError = msg;
          invalidToolCallOriginalJson = combinedRaw
        });
        toolCallFromContent = true;

        toolCalls.push({
          id: `call_log_${Math.random().toString(36).slice(2, 9)}`,
          type: 'function',
          function: { name: functionName, arguments: JSON.stringify(parsedArgs) }
        });
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        invalidToolCallExtracted = true;
        invalidToolCallError = errorMsg;
        invalidToolCallOriginalJson = combinedRaw
      }
    }

    if (toolCalls.length === 0) {
      const startIndex =
        combinedRaw.indexOf('[{"id":') !== -1
          ? combinedRaw.indexOf('[{"id":')
          : combinedRaw.indexOf('[{"type":');

      if (startIndex !== -1) {
        const endIndex = combinedRaw.lastIndexOf(']');
        if (endIndex > startIndex) {
          let arrayString = combinedRaw.substring(startIndex, endIndex + 1);

          arrayString = arrayString
            .replace(/\n/g, '\\n')
            .replace(/\r/g, '\\r')
            .replace(/\t/g, '\\t');

          // ⭐ Apply single repair pass
          try {
            const parsedArray = parseJsonWithRepair(arrayString, (msg) => {
              invalidToolCallExtracted = true;
              invalidToolCallError = msg;
              invalidToolCallOriginalJson = arrayString
            });

            if (Array.isArray(parsedArray)) {
              for (const item of parsedArray) {
                if (item?.function?.name && item?.function?.arguments) {
                  let finalArgs = item.function.arguments;

                  if (typeof finalArgs === 'string') {
                    try {
                      finalArgs = JSON.stringify(parseJsonWithRepair(finalArgs, (msg) => {
                        invalidToolCallExtracted = true;
                        invalidToolCallError = msg;
                        invalidToolCallOriginalJson = arrayString
                      }));
                    } catch (err) {
                      const errorMsg = err instanceof Error ? err.message : String(err);
                      invalidToolCallExtracted = true;
                      invalidToolCallError = errorMsg;
                      invalidToolCallOriginalJson = arrayString;
                      continue;
                    }
                  } else {
                    finalArgs = JSON.stringify(finalArgs);
                  }

                  const candidate: MCPToolCall = {
                    id: item.id || `call_arr_${Math.random().toString(36).slice(2, 9)}`,
                    type: 'function',
                    function: {
                      name: item.function.name,
                      arguments: finalArgs,
                    },
                  };
                  if (!validateToolCallsForExecution([candidate]).executable.length) {
                    invalidToolCallExtracted = true;
                    if (!invalidToolCallError) {
                      invalidToolCallError = 'Tool call arguments failed JSON validation.';
                    }
                    invalidToolCallOriginalJson = invalidToolCallOriginalJson || arrayString;
                    continue;
                  }

                  toolCallFromContent = true;
                  toolCalls.push(candidate);
                }
              }
            }
          } catch (err) {
            const errorMsg = err instanceof Error ? err.message : String(err);
            invalidToolCallExtracted = true;
            invalidToolCallError = errorMsg;
            invalidToolCallOriginalJson = arrayString
          }
        }
      }
    }

    if (toolCalls.length == 0 && !invalidToolCallExtracted && combinedRaw.startsWith('[{"id":')) {
      invalidToolCallExtracted = true
      invalidToolCallError = 'Tool call JSON was malformmated'
      invalidToolCallOriginalJson = combinedRaw
    }
    }

    let leakedContentOverride: string | undefined;
    if (allowLeakedToolExtraction && toolCalls.length === 0) {
      const leaked = extractLeakedToolCallsFromText(rawContent, rawReasoning);
      if (leaked.extracted && leaked.toolCalls.length > 0) {
        toolCalls.push(...leaked.toolCalls);
        toolCallFromContent = true;
        leakedContentOverride = leaked.contentWithoutLeak;
        invalidToolCallExtracted = false;
        invalidToolCallError = '';
        invalidToolCallOriginalJson = '';
      } else if (
        process.env.LAB_CHAT_TOOL_LEAK_DEBUG === '1' &&
        /\[{\s*"id"\s*:|"type"\s*:\s*"function"/.test(rawContent)
      ) {
        const log = VSCodeLogger.getInstance();
        void log.then((l) => {
          l.json('[parseModelOutput] leaked tool salvage missed', {
            contentTail: rawContent.trim().slice(-96),
            invalidToolCallExtracted,
          });
        });
      }
    }

    const textLogRegex = /\[Tool Call\]Executing:\s*(\w+)\s*with arguments:\s*(\{[\s\S]*?\})/g;
    const cleanContent = allowTextToolExtraction ? rawContent.replace(textLogRegex, '').trim() : rawContent.trim();
    const cleanReasoning = allowTextToolExtraction ? rawReasoning.replace(textLogRegex, '').trim() : rawReasoning.trim();
    const { reasoning } = this.extractReasoningAndContent(cleanReasoning, cleanContent);

    let content = leakedContentOverride ?? rawContent;
    if (
      invalidToolCallExtracted ||
      (toolCalls.length === 0 && assistantTextLooksLikeToolCallLeak(content))
    ) {
      content = stripAssistantToolCallJson(content);
    }

    return {
      content,
      reasoning,
      toolCalls,
      toolCallFromContent: toolCallFromContent,
      toolCallFromReasoning: toolCallFromReasoning,
      invalidToolCallExtracted: invalidToolCallExtracted,
      invalidToolCallError: invalidToolCallError,
      invalidToolCallOriginalJson: invalidToolCallOriginalJson
    } as ParsedModelOutput;
  }

  static async dispatchEstContextUpdate(chatProvider: LLMProvider, io: SocketIOServer | null, sessionId: string, contextUsed: number | undefined): Promise<void> {
    if (chatProvider) {
      const total = contextUsed ? contextUsed : 0

      const contextWindow = chatProvider.llmProviderConfig.maxContext ? parseInt(chatProvider.llmProviderConfig.maxContext) : 0

      if (contextWindow > 0) {
        const usagePercentage = (total / contextWindow) * 100;

        await this.dispatchUIResponse(io, SOCKET_EVENTS.TOKEN_PROGRESS, {
          sessionId,
          percentage: Number(usagePercentage.toFixed(4))
        })
      }
    }
  }
}
