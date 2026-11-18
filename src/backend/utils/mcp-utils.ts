import { z } from "zod";
import { Server as SocketIOServer } from 'socket.io';
import { VSCodeLogger } from "./logger";
import { ConversationMemory } from "../chroma/conversation-memory";
import MCPToolRegistry from "../mcp/mcp-tool";
import {
  SOCKET_EVENTS,
  ChatMessage,
  ChatPersona,
  MCPToolCall,
  MCPToolData,
  MCPToolInterface,
  MCPToolResponse,
  listTodoListsSchemaFields,
  ToolCallEventData,
  ToolResultEventData,
  switchPersonaSchemaFields as PersonaManagerParamsSchema,
  UpdatedRepoFiles,
  saveDocumentSchemaFields as DocumentorParamsSchema,
  createFileSchemaFields as CreateFileParamsSchema,
  updateFileSchemaFields,
  ToolCallAgentMesssage
} from "../../shared/types";
import { ProviderService } from "../ai/provider-service";
import { truncateToolResultContent } from '../../shared/utils/tool-result-content';
import { truncateUiAutomationDiscoveryContent } from '../../shared/utils/ui-automation-discover-content';
import { sanitizeToolResultContentForAgent } from '../../shared/utils/agent-audience-tool-result';
import { fileHelpers } from "./file-helpers";
import { TypeCheckVaildator, TypeCheckVaildatorResult } from "./type-script-validator";
import { LintValidator, LintValidatorResult } from "./lint-file";
import { FailureTracker } from "./failure-tracker";
import { chatUtils } from "./chat/utils";
import { PersonaService } from "../db/Persona/persona-service";
import { UserService } from "../db/Auth/auth-service";
import { evaluateMcpProductionPolicy } from "./mcp-production-enforcer";
import { zodToolParamsToJsonSchema } from "../../shared/utils/mcp-tool-json-schema";
import { getMcpToolUiDelayMs } from "@/shared/config/lab-mcp-tool-ui-delay";
import { parseToolCallArgumentsJson, coerceToolCallParamsForExecution } from "../../shared/utils/chat-tool-calls";
import { applyToolExecutionContext } from "./tool-call-execution-context";
import {
  buildEnrichedToolFailureContent,
  formatZodValidationFailure,
  TOOL_FAILURE_LOOP_WARNING_SUFFIX,
  type ToolFailureSummary,
} from "./tool-failure-agent-guidance";

export class MCPUtils {

  toolsToTriggerRepoFileUpdate: string[] = [
    'create_directory',
    'create_file',
    'documentor_save_document',
    'update_file_update_file',
    'remove_file',
    'remove_directory',
    'run_terminal_command'
  ]
  toolsToTriggerTypescriptValidation: string[] = [
    'documentor_save_document',
    'create_file',
    'update_file_update_file',
  ]
  private readonly failureTracker: FailureTracker;
  providerService: ProviderService;

  constructor() {
    this.failureTracker = FailureTracker.getInstance();
    this.providerService = ProviderService.getInstance();
  }


  public fetchToolList(userId: number, sessionId?: string): Array<MCPToolInterface<z.ZodObject<z.ZodRawShape>>> {
    const registry = MCPToolRegistry.getInstance();
    const tools = registry.getAllToolsForUser(userId) as Array<MCPToolInterface<z.ZodObject<z.ZodRawShape>>>;
    const _toolList: Array<MCPToolInterface<z.ZodObject<z.ZodRawShape>>> = [];
    for (const tool of tools.values()) {
      let description = tool.description;
      if (sessionId) {
        description = this.replaceSessionIdPlaceholders(description, sessionId);
      }
      _toolList.push({
        id: tool.id,
        name: tool.name,
        description: description,
        isExternal: tool.isExternal,
        serverId: tool.serverId,
        serverName: tool.serverName,
        display: tool.display,
        params: tool.params ? zodToolParamsToJsonSchema(tool.params) : undefined
      } as MCPToolInterface<z.ZodObject<z.ZodRawShape>>);
    }
    return _toolList;
  }

  private tsMsg = (filePath: string, result: TypeCheckVaildatorResult): string => {
    return `
## Save was successfull however the change introduced new typescript error(s) in the file: ${filePath}

${result.output}`
  }

  private lintMsg = (filePath: string, result: LintValidatorResult): string => {
    return `
## Save was successfull however the change introduced new lint error(s) in the file: ${filePath}

${result.output}`
  }

  private replaceSessionIdPlaceholders(description: string, sessionId: string): string {
    if (!description || !sessionId) return description;
    return description.replace(/\{\{sessionId\}\}/g, sessionId);
  }

  public async fetchTodoListItems(sessionId: string, userId: number): Promise<MCPToolResponse> {
    const toolRegistry = MCPToolRegistry.getInstance();
    const listTool = toolRegistry.getTool('todo_list_list_todo_lists', userId) as MCPToolInterface<
      typeof listTodoListsSchemaFields
    >;

    if (!listTool) {
      (await VSCodeLogger.getInstance()).error(`[MCP-UTILS]: todo_list_list_todo_lists tool not found`);
      return {
        content: 'todo_list_list_todo_lists tool not found',
        success: false,
        type: "tool_result",
        tool_call_id: 'todo_list_list_todo_lists'
      } as MCPToolResponse
    }

    const params = listTodoListsSchemaFields.parse({
      sessionId,
      limit: 10
    });

    return await listTool.execute(params);
  }

  public async executeToolSequence(
    io: SocketIOServer | null,
    userId: number,
    sessionId: string,
    persona: ChatPersona,
    toolCalls: MCPToolCall[],
    agent_message: string,
    isStreaming: boolean,
    chatId: string,
    isDeveloperMode = true,
  ): Promise<{
    messages: ChatMessage[];
    isPersonaUpdated?: boolean;
    updatedPersona?: ChatPersona | undefined;
    bypassAgentNotification?: boolean;
    toolFailureSummaries?: ToolFailureSummary[];
  }> {

    // STOP CHECK #1 - Function Entry (at start of function)
    if (chatUtils.isPendingRequestStop()) {
      console.log(`[TOOL-STOP] Tool execution interrupted for session ${sessionId}`)
      return { messages: [], isPersonaUpdated: false }
    }

    const toolRegistry = MCPToolRegistry.getInstance();
    const toolResults: ChatMessage[] = [];
    const toolFailureSummaries: ToolFailureSummary[] = [];
    const currentTime = Date.now();
    let _bypassAgentNotification: boolean = false

    if (toolCalls.length === 0) {
      (await VSCodeLogger.getInstance()).error(`[MCP-UTILS]: No tool calls provided`);
      return {
        messages: toolResults
      }
    }

    const memory = ConversationMemory.getInstance();
    let isPersonaChange: boolean = false;
    let updatedPersona: ChatPersona | undefined;
    let repoFilesRefreshPending = false;

    let agent_message_sent: boolean = false;

    for (const toolCall of toolCalls) {
      // STOP CHECK #2 - Loop Iteration (at start of each iteration)
      if (chatUtils.isPendingRequestStop()) {
        console.log(`[TOOL-STOP] Stopping after partial execution for session ${sessionId}`)
        break
      }

      const tool = toolRegistry.getTool(toolCall.function.name, userId) as MCPToolInterface<z.ZodObject<z.ZodRawShape>>;

      // Track if this call needs early termination
      let shouldTerminateAfterThis = false;

      let canToolRun: boolean = true;
      let toolExists: boolean = true;
      let canAgentExecute: boolean = true;
      let toolResult: MCPToolResponse;

      if (!tool) {
        (await VSCodeLogger.getInstance()).error(`[MCP-UTILS]: Tool ${toolCall.function.name} not found`);

        canToolRun = false;
        toolExists = false
      }

      const toolId = toolCall.function.name;
      const userPersonaData = PersonaService.getInstance().getAllPersonasForUser(userId)
      const allowedTools: string[] = []
      if (userPersonaData.length > 0) {
        const targetPersonaData = userPersonaData.filter(_ => _.name == persona)[0]
        if (targetPersonaData) {
          allowedTools.push(...targetPersonaData.tools)
        }
      }

      if (!allowedTools.includes(toolId)) {
        const errorMsg = `Tool "${toolId}" is not available for this persona`;
        (await VSCodeLogger.getInstance()).error(`[MCP-UTILS]: ${errorMsg}`);
        await memory.addTurn({ userId: userId, sessionId, role: 'assistant', content: errorMsg });

        canToolRun = false
        canAgentExecute = false
      }

      const { isToolAllowedForLabSidecarSession } = await import('./lab-sidecar-tool-profile-session');
      if (canToolRun && !isToolAllowedForLabSidecarSession(sessionId, toolId)) {
        const errorMsg = `Tool "${toolId}" is not available in the current Lab Sidecar profile (use Open Laboratory for full repo tools).`;
        (await VSCodeLogger.getInstance()).error(`[MCP-UTILS]: ${errorMsg}`);
        await memory.addTurn({ userId: userId, sessionId, role: 'assistant', content: errorMsg });
        canToolRun = false;
        canAgentExecute = false;
      }

      let parsedToolParams: Record<string, unknown> = {};
      let toolArgumentError: string | undefined;
      const parsedArgs = parseToolCallArgumentsJson(
        toolCall.function.arguments as string | Record<string, unknown> | undefined,
      );
      if (parsedArgs.success) {
        parsedToolParams = applyToolExecutionContext(
          { userId, sessionId, persona },
          toolId,
          coerceToolCallParamsForExecution(toolId, parsedArgs.value),
        );
      } else if (canToolRun) {
        toolArgumentError = parsedArgs.error;
        canToolRun = false;
      }

      if (canToolRun && tool?.params) {
        const validated = tool.params.safeParse(parsedToolParams);
        if (!validated.success) {
          toolArgumentError = formatZodValidationFailure(toolId, validated.error);
          canToolRun = false;
        } else {
          parsedToolParams = validated.data as Record<string, unknown>;
        }
      }

      if (canToolRun) {
        const platformUser = UserService.getInstance().getUserById(userId);
        const productionPolicy = evaluateMcpProductionPolicy({
          user: platformUser,
          userId,
          toolId,
          tool,
          params: parsedToolParams,
        });
        if (!productionPolicy.allowed) {
          const errorMsg =
            productionPolicy.reason ??
            `Tool "${toolId}" is not permitted under production profile`;
          (await VSCodeLogger.getInstance()).error(`[MCP-UTILS]: ${errorMsg}`);
          await memory.addTurn({ userId, sessionId, role: 'assistant', content: errorMsg });
          canToolRun = false;
          canAgentExecute = false;
        }
      }

      try {

        if (!isStreaming && agent_message && agent_message != '') {
          if (!agent_message_sent) {
            agent_message_sent = true
            await new Promise(resolve => setTimeout(resolve, getMcpToolUiDelayMs()));
            io?.emit(SOCKET_EVENTS.TOOL_CALL_AGENT_MESSAGE, { chatId: chatId, message: agent_message, sessionId: sessionId } as ToolCallAgentMesssage);
          }
        }

        const operationId = crypto.randomUUID();

        // Emit tool call start event to UI
        const eventData: ToolCallEventData = {
          chatId: chatId,
          id: operationId,
          sessionId: sessionId,
          toolCall: toolCall,
          toolId: toolCall.function.name,
          timestamp: new Date().toISOString()
        };
        await new Promise(resolve => setTimeout(resolve, getMcpToolUiDelayMs()));
        io?.emit(SOCKET_EVENTS.TOOL_CALL_BEFORE, eventData);

        if (canToolRun) {
          toolResult = await tool!.execute(parsedToolParams) as MCPToolResponse;
          const agentFacingContent = sanitizeToolResultContentForAgent(
            toolId,
            toolResult.content ?? '',
            isDeveloperMode,
          );
          const truncatedContent =
            toolId === 'ui_automation_discover_elements'
              ? truncateUiAutomationDiscoveryContent(agentFacingContent)
              : truncateToolResultContent(agentFacingContent);
          toolResult = {
            ...toolResult,
            content: truncatedContent,
          };

          // Track failure when tool call fails
          if (!toolResult.success) {
            this.failureTracker.trackFailure(
              sessionId,
              toolId,
              toolCall.function.arguments,
              toolResult.content ?? '',
              currentTime
            );
            toolResult = {
              ...toolResult,
              content: buildEnrichedToolFailureContent(toolId, toolResult.content ?? 'Tool returned failure', toolFailureSummaries),
            };
          }

          if (toolResult.bypassAgentNotification) _bypassAgentNotification = true

          const toolParams = parsedToolParams
          if (toolResult.success && this.toolsToTriggerTypescriptValidation.includes(toolCall.function.name) &&
            toolParams &&
            typeof toolParams === 'object' &&
            !Array.isArray(toolParams)) {

            let _filePath: string = ''
            let _canValidate: boolean = true;

            switch (toolCall.function.name) {
              case 'documentor_save_document': {
                const validatedParams = DocumentorParamsSchema.safeParse(toolParams);
                if (validatedParams.success && validatedParams.data.path) _filePath = validatedParams.data.path

              }
                break;
              case 'create_file': {
                const validatedParams = CreateFileParamsSchema.safeParse(toolParams);
                if (validatedParams.success && validatedParams.data.path) _filePath = validatedParams.data.path
              }
                break;
              case 'update_file_update_file': {
                const validatedParams = updateFileSchemaFields.safeParse(toolParams);
                if (validatedParams.success && validatedParams.data.path) {
                  _filePath = validatedParams.data.path
                  if (toolParams.operation) {
                    _canValidate = toolParams.operation == 'update_file'
                  }
                }
              }
                break;
            }

            if (_filePath.length > 0 && _canValidate) {
              const lower = _filePath.toLowerCase();

              // TypeScript type-checking
              if (
                lower.endsWith(".ts") ||
                lower.endsWith(".tsx") ||
                lower.endsWith(".vue")
              ) {
                const validateTS = await TypeCheckVaildator.run(_filePath);
                if (!validateTS.success) {
                  toolResult.content = `${this.tsMsg(_filePath, validateTS)}\n\n${toolResult.content}`;
                }
              }

              // ESLint linting
              if (
                lower.endsWith(".vue") ||
                lower.endsWith(".js") ||
                lower.endsWith(".jsx") ||
                lower.endsWith(".cjs") ||
                lower.endsWith(".mjs") ||
                lower.endsWith(".ts") ||
                lower.endsWith(".tsx")
              ) {
                const validateLint = await LintValidator.run(_filePath);
                if (!validateLint.success) {
                  toolResult.content = `${this.lintMsg(_filePath, validateLint)}\n\n${toolResult.content}`;
                }
              }
            }
          }
        } else {
          const errorResponse = !toolExists
            ? `Tool ${toolCall.function.name} not found`
            : toolArgumentError
              ? toolArgumentError
              : !canAgentExecute
                ? `Tool "${toolId}" is not available for this persona`
                : 'Unknown error executing tool';

          const enrichedError = buildEnrichedToolFailureContent(toolId, errorResponse, toolFailureSummaries);

          toolResult = {
            type: 'tool_result',
            tool_call_id: toolCall.id,
            success: false,
            content: enrichedError
          } as MCPToolResponse;

          // Track failure when tool call fails
          this.failureTracker.trackFailure(
            sessionId,
            toolCall.function.name,
            toolCall.function.arguments,
            errorResponse,
            currentTime
          );
        }

        // Emit tool completion event to UI - share same ID for pairing
        const toolResultData: ToolResultEventData = {
          chatId: chatId,
          id: operationId,
          sessionId: sessionId,
          toolCall: toolCall,
          toolId: toolCall.function.name,
          toolResult: toolResult,
          timestamp: new Date().toISOString()
        };
        await new Promise(resolve => setTimeout(resolve, getMcpToolUiDelayMs()));
        io?.emit(SOCKET_EVENTS.TOOL_CALL_AFTER, toolResultData);

        const toolRequestWrapped: ChatMessage = {
          role: 'assistant',
          content: '\n\n',
          tool_calls: [
            {
              id: toolCall.id,
              type: 'function',
              function: {
                name: toolCall.function.name,
                arguments: toolCall.function.arguments
              }
            } as MCPToolCall
          ]
        };

        await memory.addTurn({
          userId,
          sessionId,
          role: 'assistant',
          content: '\n\n',
          tool_calls: [
            {
              id: toolCall.id,
              type: 'function',
              function: {
                name: toolCall.function.name,
                arguments: toolCall.function.arguments
              }
            } as MCPToolCall
          ]
        });
        if (!_bypassAgentNotification) {
          await memory.addTurn({
            userId,
            sessionId,
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify({
              status: toolResult.success,
              message: toolResult.content,
              exit_code: toolResult.success ? 0 : 1
            })
          });
        }

        // Check if we should prevent subsequent calls for EXACT same call/result
        const warning = this.failureTracker.shouldPreventSubsequentCalls(
          sessionId,
          toolCall.function.name,
          toolCall.function.arguments,
          toolResult.content,
          currentTime
        );

        // Set shouldTerminateAfterThis if warning.prevent is true
        if (toolResult && !toolResult.success && warning.prevent) {
          shouldTerminateAfterThis = true;
          (await VSCodeLogger.getInstance()).warn(
            `[MCP-UTILS]: Loop detected - identical tool call/result repeated ${warning.consecutiveCount} times for session ${sessionId}`
          );
        }

        // Reset prevention flag when tool call succeeds (after being in a loop)
        // This allows the agent to break the loop with a different approach
        if (toolResult && toolResult.success && warning.prevent) {
          this.failureTracker.resetPrevention(
            sessionId,
            toolCall.function.name,
            toolCall.function.arguments,
            toolResult.content
          );
        }

        if (shouldTerminateAfterThis && toolResult && !toolResult.success) {
          toolResult = {
            ...toolResult,
            content: `${toolResult.content}\n\n${TOOL_FAILURE_LOOP_WARNING_SUFFIX}`,
          };
          const last = toolFailureSummaries[toolFailureSummaries.length - 1];
          if (last?.toolId === toolId) {
            last.detail = toolResult.content;
          }
        }

        toolResults.push(toolRequestWrapped);
        toolResults.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify({
            status: toolResult.success,
            message: toolResult.content,
            exit_code: toolResult.success ? 0 : 1
          })
        });

        if (shouldTerminateAfterThis) {
          break;
        }

        const uiResponse: MCPToolData = {
          toolcall: toolCall,
          toolresult: toolResult
        };

        if (this.toolsToTriggerRepoFileUpdate.includes(toolCall.function.name) && io && toolResult?.success) {
          fileHelpers.invalidateRepoFileIndex();
          repoFilesRefreshPending = true;
        }

        const toolParams = uiResponse.toolcall.function.arguments ? JSON.parse(uiResponse.toolcall.function.arguments) : undefined

        if (
          (uiResponse.toolcall.function.name === 'persona_manager' ||
            uiResponse.toolcall.function.name === 'persona_manager_switch_persona') &&
          io &&
          toolParams &&
          typeof toolParams === 'object' &&
          !Array.isArray(toolParams)
        ) {

          const validatedParams = PersonaManagerParamsSchema.safeParse(toolParams);
          const switchParams =
            uiResponse.toolcall.function.name === 'persona_manager_switch_persona'
              ? { targetPersona: (toolParams as { targetPersona?: string }).targetPersona }
              : validatedParams.success
                ? validatedParams.data
                : undefined;

          const target =
            switchParams && typeof switchParams === 'object' && 'targetPersona' in switchParams
              ? switchParams.targetPersona
              : undefined;

          if (target) {
            isPersonaChange = true
            updatedPersona = target
            persona = target;
          }
        }

        const toolName = uiResponse.toolcall.function.name;
        if (
          (toolName === 'todo_list' || toolName.startsWith('todo_list_')) &&
          io
        ) {
          (await VSCodeLogger.getInstance()).error(`[MCP-UTILS]: sending todolist data to ui: ${JSON.stringify(uiResponse as MCPToolData)}`);
          await chatUtils.dispatchUIResponse(io, SOCKET_EVENTS.TODO_LIST_UPDATED, JSON.stringify(uiResponse as MCPToolData), 500);
        }
      } catch (error: unknown) {
        // Track failure for exceptions too
        const errorResponse = `Exception: ${error instanceof Error ? error.message : String(error)}`;
        this.failureTracker.trackFailure(
          sessionId,
          toolCall.function.name,
          toolCall.function.arguments,
          errorResponse,
          currentTime
        );

        const toolResultData: ToolResultEventData = {
          chatId: chatId,
          id: crypto.randomUUID(),
          sessionId: sessionId,
          toolCall: toolCall,
          toolId: toolCall.function.name,
          toolResult: undefined,
          timestamp: new Date().toISOString()
        };
        (await VSCodeLogger.getInstance()).error(`[MCPUtils]: Failed to execute tool ${toolCall.function.name} [${error}]:, ${JSON.stringify(toolResultData)}`)

        toolResults.push({
          role: 'assistant',
          content: JSON.stringify(toolCall)
        } as ChatMessage);

        toolResults.push({
          role: 'user',
          content: JSON.stringify({
            success: false,
            tool_call_id: toolCall.function.name,
            content: `Failed to execute tool ${toolCall.function.name} [${error}]`
          } as MCPToolResponse)
        } as ChatMessage);
      }
    }

    // Update failure counts for all entries in the session before returning
    this.failureTracker.updateFailureCounts(sessionId, currentTime);

    if (repoFilesRefreshPending && io && this.providerService) {
      const updatedRepoFiles = await fileHelpers.fetchRepoFiles();
      const currentProviderData = this.providerService.getProviderData();
      currentProviderData.repoFiles = updatedRepoFiles;
      this.providerService.setProviderData(currentProviderData);
      await chatUtils.dispatchUIResponse(
        io,
        SOCKET_EVENTS.UPDATED_REPOFILES,
        { repoFiles: updatedRepoFiles } as UpdatedRepoFiles,
        500,
      );
    }

    return {
      messages: toolResults,
      isPersonaUpdated: isPersonaChange,
      updatedPersona: updatedPersona,
      bypassAgentNotification: _bypassAgentNotification,
      toolFailureSummaries,
    }
  }
}
