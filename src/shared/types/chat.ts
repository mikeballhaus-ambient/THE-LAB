import { Persona } from "./persona";
import { MCPToolCall } from "./mcp-tools";
import { FollowupParams } from "./index";

export type ChatRole = "user" | "system" | "assistant" | "tool";
//export type ChatPersona = 'Chat' | 'Orchestrator' | 'Architect' | 'Code' | 'Debug' | 'QA';
export type ChatPersona = string;
export type DoneReason = "stop" | "tool_calls" | "content_filter" | undefined

export interface CompletionChoice {
  index: number;
  finish_reason: string | null;
  message: {
    role: ChatRole;
    content: string | null;
    tool_calls?: {
      id: string;
      type: "function";
      function: {
        name: string;
        arguments: string;
      };
    }[];
  };
}

export interface ParsedModelOutput {
  content: string;
  reasoning: string;
  toolCalls: MCPToolCall[];
  toolCallFromContent: boolean;
  toolCallFromReasoning: boolean;
  invalidToolCallExtracted: boolean;
  invalidToolCallError: string;
  invalidToolCallOriginalJson: string
}


export type ChatMessageContent =
  | { type: 'input_text'; text: string }
  | { type: 'input_image'; image_url: string };

export interface ChatMessage {
  chatId?: string;
  sessionId?: string;
  role: ChatRole;
  content: string | ChatMessageContent[];
  reasoning?: string
  contentStarted?: boolean,
  images?: string[]
  isComplete?: boolean
  doneReason?: DoneReason
  tool_call_id?: string;
  tool_calls?: MCPToolCall[],
  tool_call_current?: MCPToolCall,
  hasToolCalls?: boolean,
  toolCallsDone?: boolean,
  isError?: boolean
  contextUsed?: number
}

export interface AgentInteractionStatus {
  isAwaitingResponse: boolean,
  isSummarizingMessasge: boolean,
  /** rm-46 **2.26** — persona delegation in flight on this session */
  isPersonaDelegationActive?: boolean,
  delegationChildSessionId?: string,
  delegationParentSessionId?: string,
  delegationChatId?: string,
  delegationTargetPersona?: ChatPersona,
}

export interface ChatMessageHandlerResponse {
  responseMessage: ChatMessage;
  contextUsed: number;
  chatMessages: ChatMessage[],
  persona: ChatPersona,
  personaConfig: Persona | undefined
  sysMsg: string
}

export type UIChatMessage = ChatMessage & {
  isPlaceholder?: boolean,
  loading?: boolean,
  thinkingBuffer?: string,        // NEW: Accumulated reasoning text (buffer for streaming)
  contentBuffer?: string,         // NEW: Alternative for accumulated content during streaming
  systemLog?: {
    id: string,
    data: unknown,
    title: string,
    content: string,
    success?: boolean,
    isResult: boolean
  }
  followupData?: FollowupParams;   // NEW: Followup tool data for Phase 6
}

export interface ExtendedFile {
  file: File;
  preview: string; // URL.createObjectURL for <img> src
  base64?: string; // For OpenAI API
}

export interface ExtendedFileResolved {
  name: string,
  size: number,
  type: string,
  base64: string
}

export interface ChatAgentMessage extends ChatMessage {
  persona: ChatPersona;
}

export interface SummarizedContext {
  role: ChatRole;
  content: string;
  summary: string;
  ts: number;
}

export interface ChatSessionRecord {
  sessionId: string;
  title: string;
  createdAt: number;
  lastActivity: number;
  contextUsed?: number;
  persona?: ChatPersona;
  /** Dexie tab reused across vs–Lab Assistant matches for the same catalog game id. */
  labGameSidecarGameId?: string;
  /** Last vs–AI match id bound to this tab (for match-boundary context summarize). */
  labGameSidecarLastMatchId?: string;
  messagesWidth?: number;
  files: ExtendedFileResolved[];
}

export interface OllamaGenerateOptions {
  model?: string;
  prompt?: string;
  stream?: boolean;
  raw?: boolean;
  num_ctx?: number;
  temperature?: number;
  top_k?: number;
  top_p?: number;
  num_predict?: number;
  repeat_penalty?: number;
  seed?: number;
  stop?: string | string[];
  num_thread?: number;
  num_gpu?: number;
  mirostat?: number;
  mirostat_eta?: number;
  mirostat_tau?: number;
  tfs_z?: number;
  typical_p?: number;
  repeat_last_n?: number;
  repeat_penalty_slope?: number;
  presence_penalty?: number;
  frequency_penalty?: number;
  penalty_last_n?: number;
  f1_penalty?: number;
  grammar?: string;
  options?: Record<string, unknown>;
}

export interface GenerateRequest {
  model: string;
  prompt: string;
  stream?: boolean;
  raw?: boolean;
  num_ctx?: number;
  temperature?: number;
  top_k?: number;
  top_p?: number;
  num_predict?: number;
  repeat_penalty?: number;
  seed?: number;
  stop?: string | string[];
  num_thread?: number;
  num_gpu?: number;
  mirostat?: number;
  mirostat_eta?: number;
  mirostat_tau?: number;
  tfs_z?: number;
  typical_p?: number;
  repeat_last_n?: number;
  repeat_penalty_slope?: number;
  presence_penalty?: number;
  frequency_penalty?: number;
  penalty_last_n?: number;
  f1_penalty?: number;
  grammar?: string;
  options?: Record<string, unknown>;
}

export type GenerateRequestWithStream = GenerateRequest & { stream: true };
export type GenerateRequestWithoutStream = GenerateRequest & { stream?: false };
