import {
  ChatPersona,
  Persona,
  ToolsList,
  AiProvider,
  LLMProviderConfig,
  MCPToolCall,
  MCPToolResponse,
  ICommand,
  IContextSettings,
  ExtendedFileResolved,
  RuntimeApp,
  UIChatMessage,
  UserInstruction,
  IMCPServerConfig
} from './index';
import { FollowupParams, TodoList } from './index';

// Chat initialization data payload (server-initiated event)
export interface ChatInitializedData {
  ready: boolean;
  providers?: AiProvider[];
  llmProviderConfig?: LLMProviderConfig;
  globalSysMsg?: string;
  repoFiles: string[];
  apps: RuntimeApp[];
  memoryHealth?: {
    status: 'ok' | 'degraded' | 'unavailable';
    message?: string;
  };
  /** Optional external MCP env gaps (rm-46 2.24). */
  externalMcpEnvGaps?: Array<{
    id: string;
    label: string;
    envHint: string;
    detail: string;
  }>;
}

// Client-side event handler (wraps server data for client handlers)
export interface ChatInitializedEvent {
  data: ChatInitializedData;
  sessionId: string;
  timestamp: string;
}

// Token progress
export interface TokenProgressEvent {
  sessionId: string;
  totalTokens?: number;
  currentTokens?: number;
  percentage?: number;
  timestamp?: string;
}

// Socket connect error
export interface ConnectErrorEvent {
  message: string;
  code?: string;
  description?: string;
}

// Chat response
export interface ChatResponseData {
  chatId: string | 'latest';
  content: string;
  reasoning: string;
  sender: 'user' | 'assistant';
  metadata?: Record<string, unknown>;
}

// First message received
export interface FirstMessageReceivedEventData {
  sessionId: string;
  title: string;
}

// First message edited
export interface FirstMessageEditedEventData {
  sessionId: string;
  title: string;
  previousTitle?: string;
}

// Generic error event
export interface SocketErrorEvent {
  name: string;
  message: string;
  description?: string;
  errno?: string;
}

// Server-side socket error (emitted from server)
export interface ServerErrorMessage {
  sender: 'assistant';
  message: string;
}

// Todo list update
export interface TodoListUpdateEventData {
  toolCalls: string;
  timestamp: string;
}

// Persona switched
export interface PersonaSwitchedEventData {
  sessionId: string;
  persona: ChatPersona;
}

// Todo list updated
export interface TodoListUpdatedEventData {
  toolCalls: string;
  timestamp: string;
}

// New session created
export interface NewSessionCreatedEventData {
  sessionId: string;
}

// New session request
export interface NewSessionRequestEventData {
  sessionId: string;
  persona: ChatPersona;
  chatId?: string;
  message?: UIChatMessage;
  /** Parent session that initiated delegation (rm-46 **2.26**) */
  parentSessionId?: string;
}

// New session request completed
export interface NewSessionRequestCompletedEventData {
  sessionId: string;
  targetPersona: ChatPersona;
}

// Response from persona (chat/agent response)
export interface ResponsePersonaEventData {
  sessionId: string;
  parentSessionId: string;
  parentPersona: ChatPersona;
  chatId?: string;
  message?: UIChatMessage;
  success: boolean;
}

export type PersonaEventType = 'add' | 'update' | 'remove'

export interface UpdatePersonaConfigEventData {
  personaName: string;
  persona: Persona;
  action: PersonaEventType
  userId?: number;
}

// Summarize request (client sends to server)
export interface SummarizeRequestEventData {
  sessionId: string;
}

export interface DeleteSessionEventData {
  sessionId: string;
}

// Todo list sync (client sends to server)
export interface TodoListSyncEventData {
  todoList: TodoList;
}

export interface MCPServerUpdateEventData {
  mcpServersUpdate: IMCPServerConfig[]
  tools: ToolsList[]
}

// Provider config update event data: sent from UI to server when user saves configuration
export interface ProviderConfigUpdateEventData {
  providerConfig: LLMProviderConfig;
  userId?: number;
}

// Provider test event data: sent from UI when testing provider connection
export interface ProviderTestEventData {
  providerConfig: LLMProviderConfig;
}

export interface ResponseBase {
  success: boolean;
  message?: string;
}

export interface AppPermissionChangedEventData extends ResponseBase {
  data?: {
    userId: string | number;
    appId: string;
  };
}

export interface UserPermissionsChangedEventData {
  success: boolean;
  userId: string | number;
  data?: unknown;
}

export type ProviderUpdateResultData = ResponseBase;

export interface ICommandResultData extends ResponseBase {
  updatedCommands: ICommand[]
  userId?: number  // Optional: Which user's commands were updated
}

export interface IContextSettingsResultData extends ResponseBase {
  updatedContextSettings: IContextSettings
}

export interface ICommandRequestData {
  command: ICommand,
  isRemove?: boolean,
  userId?: number  // Optional: User ID for this command request
}

// Provider test result event data: sent from server to UI with test result
export interface ProviderTestResultEventData {
  chat: ProviderUpdateResultData,
  embed: ProviderUpdateResultData
}

export interface ProviderFetchModelRequest {
  providerConfig: LLMProviderConfig;
}

export interface ProviderFetchModelResponse {
  chatModels: string[],
  embedModels: string[]
};

export interface ToolCallEventData {
  chatId: string;
  id: string;
  sessionId: string;
  toolCall: MCPToolCall;
  toolId: string;
  timestamp: string;
}

export interface ToolResultEventData extends ToolCallEventData {
  toolResult: MCPToolResponse | undefined;
}

export interface SystemInstructionsRequestData {
  userId: number,
  sessionId: string,
  persona: ChatPersona,
  isDeveloperMode: boolean
}

export interface SystemInstructionsResponseData {
  systemInstructions: string
}

export interface SendChatMesssageData {
  userId: number,
  chatId: string,
  sessionId: string,
  text: string,
  persona: ChatPersona,
  streaming: boolean,
  isDeveloperMode: boolean,
  files?: ExtendedFileResolved[]
  /** Present when the user sends from Lab Sidecar (rm-57). */
  labSidecarContext?: import('./lab-sidecar-view-context').LabSidecarChatContext
  /** Lab profile display name (`User.name`) for personable chat — Laboratory and Sidecar. */
  labUserDisplayName?: string
  /** Proactive in-game moment — LLM table talk (not a visible user message). */
  labGameBanter?: import('../game-platform/lab-assistant-banter/types').LabAssistantBanterRequest
  /** Client snapshot of active vs–Lab Assistant match for user Sidecar chat enrichment. */
  labGameMatchSnapshot?: import('../composables/lab-sidecar/lab-sidecar-game-match-snapshot').LabSidecarGameMatchSnapshot
}

export interface UpdatedRepoFiles {
  repoFiles: string[]
}

export interface ToolCallAgentMesssage {
  chatId: string,
  sessionId: string,
  message: string
}

export interface StopRequestData {
  sessionId: string,
  success: boolean
}

export interface StreamingDelta {
  sessionId: string,
  text: string,
  chatId: string,
  contextUsed?: number
}

export interface StreamingDone {
  sessionId: string,
  chatId: string,
  contextUsed?: number
}

// Followup Tool Event Data - Phase 6
// Unified followup event data (both request and response)
export interface FollowupEventData {
  chatId: string;
  sessionId: string;
  persona: ChatPersona;
  isStreaming: boolean;
  followupData: FollowupParams;  // Contains options with selected property
}

export type UserInstructionsEventData = UserInstruction;

// MCP Server Event Data
export interface UpdateMCPServerEventData {
  userId?: number;
  action: 'add' | 'update' | 'remove';
  server: IMCPServerConfig;
  serverId?: number;
}

export interface ToggleMCPServerEventData {
  userId?: number;
  serverId: number;
}

export interface McpStdioAccessEventData {
  userId: number;
  action: 'request' | 'approve' | 'deny';
  serverId?: number;
  requestId?: number;
  note?: string;
}

export interface McpStdioAccessUpdatedEventData {
  allowlistedServerIds: number[];
  myRequests: import('./mcp-stdio-access').McpStdioAccessRequest[];
  pendingForReview: import('./mcp-stdio-access').McpStdioAccessRequest[];
}

export interface ThemeUpdatedEventData {
  theme: import('./lab-theme').LabTheme;
  updatedAt: string;
}

export interface AppsOrderUpdatedEventData {
  apps: RuntimeApp[];
  updatedAt: string;
}

export interface LabSidecarActivityUpdatedEventData {
  settings: import('./lab-sidecar-activity-settings').LabSidecarActivitySettings;
  updatedAt: string;
}

export const SOCKET_EVENTS = {
  CHAT_INITIALIZED: 'chat-initialized',
  TOKEN_PROGRESS: 'token-progress',
  RESPONSE: 'response',
  TODO_LIST_UPDATED: 'todo-list-updated',
  FIRST_MESSAGE_RECEIVED: 'first-message-received',
  FIRST_MESSAGE_EDITED: 'first-message-edited',
  ERROR: 'error',
  PROVIDER_CONFIG_UPDATE_ACK: 'provider-config-update-ack',
  PROVIDER_TEST_RESULT: 'provider-test-result',
  MESSAGE: 'message',
  GLOBAL_SYSMSG_UPDATE: 'globalsysmsg-update',
  GLOBAL_USERINSTRUCTIONS_UPDATE: 'global_userInstructions_update',
  UPDATE_PERSONA_CONFIG: 'update-persona-config',
  SUMMARIZE_REQUEST: 'summarize-request',
  TODO_LIST_SYNC: 'todo-list-sync',
  PROVIDER_CONFIG_UPDATE: 'provider-config-update',
  PROVIDER_TEST: 'provider-test',
  CURRENT_SYSTEM_INSTRUCTIONS_REQUEST: 'current-system-instructions-request',
  CURRENT_SYSTEM_INSTRUCTIONS_REQUEST_COMPLETED: 'current-system-instructions-request-completed',
  TOOL_CALL_BEFORE: 'tool-call-before',
  TOOL_CALL_AFTER: 'tool-call-after',
  TOOL_CALL_AGENT_MESSAGE: 'tool-call-agent-message',
  PERSONA_SWITCHED: 'persona-switched',
  NEW_SESSION_REQUEST: 'new-session-request',
  NEW_SESSION_CREATED: 'new-session-created',
  RESPONSE_PERSONA: 'response-persona',
  FETCH_MODELS_REQUEST: 'fetch-models-request',
  FETCH_MODELS_RESPONSE: 'fetch-models-response',
  UPDATE_SLASHCOMMAND_REQUEST: 'update-slashcommand-request',
  UPDATE_SLACHCOMMAND_RESPONSE: 'update-slashcommand-response',
  UPDATE_CONTEXTSETTINGS_REQUEST: 'update-context-settings-request',
  UPDATE_CONTEXTSETTINGS_RESPONSE: 'update-context-settings-response',
  UPDATED_REPOFILES: 'updated-repo-files',
  STOP_REQUEST: 'stop-request',
  DELETE_SESSION: 'delete-session',
  USER_LIST_REQUEST: 'user-list-request',
  USER_LIST_RESPONSE: 'user-list-response',
  USER_FIND_REQUEST: 'user-find-request',
  USER_FIND_RESPONSE: 'user-find-response',
  USER_GET: 'user-get',
  USER_GET_RESPONSE: 'user-get-response',
  USER_UPDATE: 'user-update',
  USER_UPDATE_RESPONSE: 'user-update-response',
  USER_DELETE: 'user-delete',
  USER_CREATED_REQUEST: 'user-created-request',
  USER_CREATED_RESPONSE: 'user-created-response',
  USER_CREATED_SUCCESS: 'user-created-success',
  USER_UPDATE_PERMISSIONS_REQUEST: 'user-update-permissions-request',
  USER_UPDATE_PERMISSIONS_RESPONSE: 'user-update-permissions-response',
  USER_ROLE_CHANGE_REQUEST: 'user-role-change-request',
  USER_ROLE_CHANGE_RESPONSE: 'user-role-change-response',
  USER_DELETED_REQUEST: 'user-deleted-request',
  USER_DELETED_RESPONSE: 'user-deleted-response',
  USER_DELETED_SUCCESS: 'user-deleted-success',
  USER_LOGIN: 'user-login',
  EXISTING_USER: 'existing-user',
  USER_REGISTER: 'user-register',
  USER_CHECK_AUTH: 'user-check-auth',
  USER_AUTHENTICATED: 'user-authenticated',
  USER_UNAUTHENTICATED: 'user-unauthenticated',
  USER_AUTH_STATE: 'user-auth-state',
  USER_LOGOUT: 'user-logout',
  USER_ACTIVITY_UPDATE: 'user-activity-update',
  APP_PERMISSION_GRANTED: 'app-permission-granted',
  UPDATE_MCP_SERVER: 'update-mcp-server',
  TOGGLE_MCP_SERVER: 'toggle-mcp-server',
  MCP_STDIO_ACCESS: 'mcp-stdio-access',
  MCP_STDIO_ACCESS_UPDATED: 'mcp-stdio-access-updated',
  LOAD_USER_DATA: 'load-user-data',
  LOAD_MCP_DATA: 'load-mcp-data',
  APP_PERMISSION_REVOKED: 'app-permission-revoked',
  USER_PERMISSIONS_CHANGED: 'user-permissions-changed',
  FOLLOWUP_REQUEST: 'followup-request',
  FOLLOWUP_RESPONSE: 'followup-response',
  REASONING_DELTA: 'reasoning-delta',
  REASONING_DONE: 'reasoning-done',
  CONTENT_DELTA: 'content-delta',
  CONTENT_DONE: 'content-done',
  UI_AUTOMATION_DISCOVER_REQUEST: 'ui-automation-discover-request',
  UI_AUTOMATION_DISCOVER_RESPONSE: 'ui-automation-discover-response',
  UI_AUTOMATION_ACTION_REQUEST: 'ui-automation-action-request',
  UI_AUTOMATION_ACTION_RESPONSE: 'ui-automation-action-response',
  THEME_UPDATED: 'theme:updated',
  APPS_ORDER_UPDATED: 'apps:order-updated',
  LAB_SIDECAR_ACTIVITY_UPDATED: 'lab-sidecar-activity:updated',
};

