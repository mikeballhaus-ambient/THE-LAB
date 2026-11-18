import { ProviderService } from "../../../../../backend/ai/provider-service";
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { ConversationMemory } from "../../../../../backend/chroma/conversation-memory";
import { chatUtils } from '../../../../../backend/utils/chat/utils';
import { ChatManager } from "../../../../../backend/utils/chat/chat-manager";
import {
  ChatPersona,
  MCPToolResponse,
  TodoItemCodeTaskSchemaItem,
  createListSchemaFields,
  addTodoItemSchemaFields,
  SOCKET_EVENTS,
  UIChatMessage,
  NewSessionRequestEventData,
  MCPToolData,
  MCPToolCall,
  ResponsePersonaEventData
} from "../../../../../shared/types";
import MCPToolRegistry from "../../../mcp-tool";
import * as personaUtils from './persona-utils'
import { resolveSystemPromptAssembly } from '../../../../../shared/config/lab-system-prompt';

export interface ActivatePersonaRequest {
  userId: number,
  targetPersona: string,
  originatingSessionId: string,
  originatingPersona?: string,
  parentPersona?: string,
  messageToAgent?: string,
  agentMessage?: string,
  todoListId?: string,
  todoListName?: string,
  todoItemId?: string,
  todoItem?: string,
  todoItemData?: string,
  todoItemTask?: TodoItemCodeTaskSchemaItem,
}

export interface ResponsePersonaRequest {
  userId: number,
  sessionId: string,
  message: string,
  success: boolean,
  parentSessionId: string,
  parentPersona: string,
  chatId: string,
  todoListId?: string,
}

export class PersonaManagerUtils {
  static initPersonaManagerEndpoints(server: FastifyInstance): void {
    server.post('/workflow/response-persona', {
      schema: {
        body: {
          type: 'object',
          properties: {
            userId: { type: 'number' },
            sessionId: { type: 'string' },
            message: { type: 'string' },
            success: { type: 'boolean' },
            parentSessionId: { type: 'string' },
            parentPersona: { type: 'string' },
            chatId: { type: 'string' },
          },
          required: ['userId', 'sessionId', 'message', 'success', 'parentSessionId', 'parentPersona', 'chatId'],
        },
      },
    }, async (request: FastifyRequest<{ Body: ResponsePersonaRequest }>, reply: FastifyReply) => {

      server.log.info(`[/workflow/response-persona] Request body: ${JSON.stringify(request.body)}`);

      try {
        const {
          userId,
          sessionId,
          message,
          success,
          parentSessionId,
          parentPersona,
          chatId,
          todoListId
        } = request.body;

        const responsePersonaResult = await this.responsePersonaHandler(
          userId,
          sessionId,
          message,
          success,
          parentSessionId,
          parentPersona,
          chatId,
          todoListId
        )

        reply.status(200).send(responsePersonaResult)

      } catch (error: unknown) {

        return reply.status(500).send({
          success: false,
          message: error instanceof Error ? error.message : 'Unknown error occurred',
        });
      }
    });

    server.post('/workflow/activate-persona', {
      schema: {
        body: {
          type: 'object',
          properties: {
            userId: { type: 'number' },
            targetPersona: { type: 'string' },
            originatingSessionId: { type: 'string' },
            originatingPersona: { type: 'string' },
            parentPersona: { type: 'string' },
            messageToAgent: { type: 'string' },
            agentMessage: { type: 'string' },
            todoListId: { type: 'string' },
            todoListName: { type: 'string' },
            todoItemId: { type: 'string' },
            todoItem: { type: 'string' },
            todoItemData: { type: 'string' },
            todoItemTask: {
              type: 'object',
              properties: {
                taskId: { type: 'string' },
                description: { type: 'string' },
                type: { type: 'string' },
                filePath: { type: 'string' },
                codeContent: { type: 'string' },
                operationRangeStartLine: { type: 'number' },
                operationRangeEndLine: { type: 'number' },
                operationAction: { type: 'array', items: { type: 'string' } },
                priority: { type: 'string' },
                dependencies: { type: 'string' },
                persona: { type: 'string' },
              }
            },
          },
          required: ['userId', 'targetPersona', 'originatingSessionId'],
        },
      },
    }, async (request: FastifyRequest<{ Body: ActivatePersonaRequest }>, reply: FastifyReply) => {

      server.log.info(`[/workflow/activate-persona] Request body: ${JSON.stringify(request.body)}`);

      try {
        const body = request.body;
        const {
          userId,
          targetPersona,
          originatingSessionId,
          messageToAgent,
          todoListId,
          todoListName,
          todoItemId,
          todoItem,
          todoItemData,
          todoItemTask
        } = body;

        const agentMessage =
          body.agentMessage?.trim() ||
          messageToAgent?.trim() ||
          body.messageToAgent?.trim() ||
          '';

        if (!agentMessage) {
          return reply.status(400).send({
            success: false,
            message: 'agentMessage or messageToAgent is required',
          });
        }

        const activatePersonaResult = await this.activatePersonaHandler(
          userId,
          originatingSessionId,
          targetPersona as ChatPersona,
          agentMessage,
          messageToAgent ?? agentMessage,
          todoListId,
          todoListName,
          todoItemId,
          todoItem,
          todoItemData,
          todoItemTask
        )

        reply.status(200).send(activatePersonaResult)

      } catch (error: unknown) {

        return reply.status(500).send({
          success: false,
          message: error instanceof Error ? error.message : 'Unknown error occurred',
        });
      }
    });
  }

  static async activatePersonaHandler(
    userId: number,
    originatingSessionId: string,
    targetPersona: ChatPersona | undefined,
    agentMessage: string,
    messageToAgent: string,
    todoListId?: string,
    todoListName?: string,
    todoItemId?: string,
    todoItem?: string,
    todoItemData?: string,
    todoItemTask?: TodoItemCodeTaskSchemaItem | null | undefined,
    additionalTodos?: Array<{
      todoItemId: string;
      todoItem: string;
      todoItemData: string;
      todoItemTask?: TodoItemCodeTaskSchemaItem | null;
    }>,
  ): Promise<MCPToolResponse> {

    const providerService = ProviderService.getInstance();
    const ioServer = providerService.getSocketIOServer();
    const chatProvider = (await providerService.ResolveProviderAdapter(userId)).chatProvider
    const memory = ConversationMemory.getInstance();

    if (!targetPersona) {
      return {
        type: 'tool_result',
        tool_call_id: 'persona_manager',
        function: 'activate-persona',
        content: `Error: targetPersona is required. Must be one of: Chat, Orchestrator, Architect, Code, Debug, or QA, or user defined persona`,
        success: false
      } as MCPToolResponse;
    }

    if (!chatProvider) {
      return {
        type: 'tool_result',
        tool_call_id: 'persona_manager',
        function: 'activate-persona',
        content: `Error: chatProvider was not found`,
        success: false
      } as MCPToolResponse;
    }

    if (!ioServer) {
      return {
        type: 'tool_result',
        tool_call_id: 'persona_manager',
        function: 'activate-persona',
        content: 'Error: Socket server is not available. Please ensure the backend server is running properly before activating a persona.',
        success: false
      } as MCPToolResponse;
    }

    const newSessionId: string = crypto.randomUUID();
    const userMessage: string = agentMessage

    try {

      const newChatId: string = crypto.randomUUID();

      const todoValidationResult = personaUtils.validateTodos(todoListId, todoListName, todoItemId, todoItem, todoItemData, todoItemTask);

      if (todoValidationResult.error) {
        return {
          type: 'tool_result',
          tool_call_id: 'persona_manager',
          function: 'activate-persona',
          content: todoValidationResult.error,
          success: false
        } as MCPToolResponse;
      }

      if ((todoListId || todoListName) && todoValidationResult.valid) {
        const toolRegistry = MCPToolRegistry.getInstance();
        const createListTool = toolRegistry.getTool('todo_list_create_list', userId);
        const addTodoItemTool = toolRegistry.getTool('todo_list_add_todo_item', userId);

        if (!createListTool || !addTodoItemTool) {
          return {
            type: 'tool_result',
            tool_call_id: 'persona_manager',
            function: 'activate-persona',
            content: `Error: Split todo list tools (todo_list_create_list / todo_list_add_todo_item) were not found in MCPToolRegistry. Verify todo-list MCP server registration before activating a persona with todo items.`,
            success: false
          } as MCPToolResponse;
        }

        if (!todoListId || !todoListName) {
          if (!todoListId) todoListId = crypto.randomUUID();
          if (!todoListName) todoListName = 'TODO Tasks'
        }

        const createTodoListParams = createListSchemaFields.parse({
          sessionId: newSessionId,
          parentSessionId: originatingSessionId,
          todoListId: todoListId,
          name: todoListName
        });

        const createResult = await createListTool.execute(createTodoListParams);

        if (!createResult.success) {
          return {
            type: 'tool_result',
            tool_call_id: 'persona_manager',
            function: 'activate-persona',
            content: `Error: Failed to create todo list: ${createResult.content}`,
            success: false
          } as MCPToolResponse;
        }

        if (ioServer) {
          await chatUtils.dispatchUIResponse(ioServer, SOCKET_EVENTS.NEW_SESSION_REQUEST, {
            sessionId: newSessionId,
            parentSessionId: originatingSessionId,
            persona: targetPersona,
            chatId: newChatId,
            message: {
              role: 'user',
              content: messageToAgent,
              isPlaceholder: true,
              loading: true,
              isComplete: false
            } as UIChatMessage
          } as NewSessionRequestEventData, 500);

          const operationId = crypto.randomUUID();

          const createTodoListUiResponse: MCPToolData = {
            toolcall: {
              id: operationId,
              type: 'function',
              function: {
                name: 'todo_list_create_list',
                arguments: JSON.stringify({
                  sessionId: newSessionId,
                  parentSessionId: originatingSessionId,
                  todoListId: todoListId,
                  name: todoListName,
                })
              }
            } as MCPToolCall,
            toolresult: {
              type: 'tool_result' as const,
              tool_call_id: `create_list_${todoListId}`,
              function: 'create_list',
              success: createResult.success,
              content: createResult.content || JSON.stringify(createResult)
            } as MCPToolResponse
          };
          await chatUtils.dispatchUIResponse(ioServer, SOCKET_EVENTS.TODO_LIST_UPDATED, JSON.stringify(createTodoListUiResponse), 500);
        }

        const addTodoParams = addTodoItemSchemaFields.parse({
          sessionId: newSessionId,
          todoListId: todoListId,
          itemId: todoItemId!,
          item: todoItem!,
          itemData: todoItemData!,
          task: todoItemTask ?? undefined,
        });
        const addTodoResult = await addTodoItemTool.execute(addTodoParams);

        if (ioServer && addTodoResult.success) {
          const operationId = crypto.randomUUID();
          const addTodoItemUiResponse: MCPToolData = {
            toolcall: {
              id: operationId,
              type: 'function',
              function: {
                name: 'todo_list_add_todo_item',
                arguments: JSON.stringify(addTodoParams)
              }
            } as MCPToolCall,
            toolresult: {
              type: 'tool_result' as const,
              tool_call_id: `add_todo_item_${todoItemId}`,
              function: 'add_todo_item',
              success: addTodoResult.success,
              content: addTodoResult.content || JSON.stringify(addTodoResult)
            } as MCPToolResponse
          };
          await chatUtils.dispatchUIResponse(ioServer, SOCKET_EVENTS.TODO_LIST_UPDATED, JSON.stringify(addTodoItemUiResponse), 500);
        }

        if (additionalTodos?.length && todoListId) {
          for (const extra of additionalTodos) {
            const extraParams = addTodoItemSchemaFields.parse({
              sessionId: newSessionId,
              todoListId,
              itemId: extra.todoItemId,
              item: extra.todoItem,
              itemData: extra.todoItemData,
              task: extra.todoItemTask ?? undefined,
            });
            await addTodoItemTool.execute(extraParams);
          }
        }

      } else {
        if (ioServer) {
          await chatUtils.dispatchUIResponse(ioServer, SOCKET_EVENTS.NEW_SESSION_REQUEST, {
            sessionId: newSessionId,
            parentSessionId: originatingSessionId,
            persona: targetPersona,
            chatId: newChatId,
            message: {
              role: 'user',
              content: messageToAgent,
              isPlaceholder: true,
              loading: true,
              isComplete: false
            } as UIChatMessage
          } as NewSessionRequestEventData, 500);
        }
      }

      await memory.addTurn({
        userId,
        sessionId: newSessionId,
        role: 'user',
        content: userMessage
      });

      const messages = await memory.retrieveAsMessages({ sessionId: newSessionId, nResults: 99 });

      let isFinalized: boolean = false;
      let finalContent: string = ''

      while (!isFinalized) {
        const templateManager = await providerService.getTemplateManager(userId)
        const chatManger = new ChatManager(providerService.getSocketIOServer(),
          chatProvider,
          providerService.getProviderData(),
          templateManager,
          providerService.getMCPUtils(),
          providerService.getMCPRegistry())
        const { sysMsg, personaConfig } = await providerService.getTemplateManagerData(
          templateManager,
          newSessionId,
          targetPersona,
          true,
          resolveSystemPromptAssembly(chatProvider),
        );

        const chatResponse = await chatManger.responseHandler(userId, newSessionId, targetPersona, personaConfig, messages, [], sysMsg, newChatId, true)

        if (chatResponse?.agentResponse.tool_calls.length == 0 && chatResponse?.agentResponse.message.length == 0 && chatResponse.agentResponse.reasoning.length > 0) {
          messages.push(chatResponse.message)
          messages.push({ role: 'user', content: `**CRITICAL!** Your previous response only contained reasoning without any tool_calls, however you MUST always provide user content with your reasoning if you do NOT make tool_calls. Here was your previous message reasoning: [${chatResponse.agentResponse.reasoning}]` })
          isFinalized = false
        }

        if (chatResponse?.agentResponse.hasToolCall) {
          if (chatResponse.message) messages.push(chatResponse.message)
          await chatManger.toolHandler(userId,
            newSessionId,
            chatResponse.persona,
            chatResponse.personaConfig,
            chatResponse.sysMsg,
            messages,
            [],
            newChatId,
            chatResponse.agentResponse,
            true)
          isFinalized = true
        }

        if (chatResponse?.agentResponse?.message) {
          isFinalized = true
          finalContent = chatResponse?.agentResponse?.message
          await memory.addTurn({
            userId,
            sessionId: newSessionId,
            role: 'assistant',
            content: chatResponse.agentResponse.message as string
          });
        }

        if (isFinalized) break;
      }

      return {
        type: 'tool_result',
        tool_call_id: 'persona_manager',
        function: 'activate-persona',
        content: JSON.stringify({
          sessionId: originatingSessionId,
          targetPersona: targetPersona,
          todoListId: todoListId,
          action: 'activate-persona',
          newSessionId: newSessionId,
          userMessage: userMessage,
          assistantResponse: finalContent,
          chatId: newChatId
        }),
        success: true
      } as MCPToolResponse;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      return {
        type: 'tool_result',
        tool_call_id: 'persona_manager',
        function: 'activate-persona',
        content: `Error activating persona: ${errorMessage}. The agent should review the error details and correct the parameters. If this was a parameters error (missing required fields, invalid UUID, etc.), resubmit with corrected values.`,
        success: false
      } as MCPToolResponse;
    }

  }

  static async responsePersonaHandler(
    userId: number,
    sessionId: string,
    message: string | undefined,
    success: boolean | undefined,
    parentSessionId: string,
    parentPersona: ChatPersona,
    chatId: string,
    todoListId?: string): Promise<MCPToolResponse> {

    try {
      const providerService = ProviderService.getInstance();
      const ioServer = providerService.getSocketIOServer();
      const chatProvider = (await providerService.ResolveProviderAdapter(userId)).chatProvider
      const memory = ConversationMemory.getInstance();

      if (!chatProvider) {
        return {
          type: 'tool_result',
          tool_call_id: 'persona_manager',
          function: 'response-persona',
          content: `Error: chatProvider was not found`,
          success: false
        } as MCPToolResponse;
      }

      const userMessage = personaUtils.responseUserMessage(todoListId, success, message)

      await memory.addTurn({
        userId,
        sessionId: parentSessionId,
        role: 'user',
        content: userMessage
      });

      const messages = await memory.retrieveAsMessages({ sessionId: parentSessionId, nResults: 99 });
      const templateManager = await providerService.getTemplateManager(userId)
      const chatManger = new ChatManager(providerService.getSocketIOServer(),
        chatProvider,
        providerService.getProviderData(),
        templateManager,
        providerService.getMCPUtils(),
        providerService.getMCPRegistry())
      const { sysMsg, personaConfig } = await providerService.getTemplateManagerData(
        templateManager,
        parentSessionId,
        parentPersona,
        true,
        resolveSystemPromptAssembly(chatProvider),
      );

      const chatResponse = await chatManger.responseHandler(userId, parentSessionId, parentPersona, personaConfig, messages, [], sysMsg, chatId, true)

      const agentMessageText = chatResponse?.agentResponse?.message?.trim() ?? '';
      const hasToolCalls = Boolean(chatResponse?.agentResponse?.hasToolCall);

      if (agentMessageText) {
        await memory.addTurn({
          userId,
          sessionId: sessionId,
          role: 'assistant',
          content: agentMessageText,
        });
      }

      if (ioServer && chatResponse) {
        const uiContent = agentMessageText || userMessage || '(parent session continuing)';
        await chatUtils.dispatchUIResponse(ioServer, SOCKET_EVENTS.RESPONSE_PERSONA, {
          sessionId: sessionId,
          parentSessionId: parentSessionId,
          chatId: chatId,
          message: {
            role: 'assistant',
            content: uiContent,
            reasoning: chatResponse.agentResponse.reasoning,
            isPlaceholder: false,
            loading: hasToolCalls,
            isComplete: !hasToolCalls,
          } as UIChatMessage,
          success: success
        } as ResponsePersonaEventData, 500);
      }

      return {
        type: 'tool_result',
        tool_call_id: 'persona_manager',
        function: 'response-persona',
        content: JSON.stringify({
          sessionId: sessionId,
          parentSessionId: parentSessionId,
          message: message,
          success: success,
          action: 'response-persona'
        }),
        success: true
      } as MCPToolResponse;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      return {
        type: 'tool_result',
        tool_call_id: 'persona_manager',
        function: 'response-persona',
        content: `Error sending response-persona: ${errorMessage}. The agent should provide valid parameters and retry.`,
        success: false
      } as MCPToolResponse;
    }

  }
}
