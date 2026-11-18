import { ChatMessage, ChatPersona, ICommand, MCPToolCall } from "../../shared/types";

export interface AgentResponse {
  hasToolCall: boolean;
  message: string;
  reasoning: string;
  tool_calls: MCPToolCall[];
  commandContext?: SlashCommandContext;
  isToolCallIncomplete: boolean;
  toolCallFromContent?: boolean;
  toolCallFromReasoning?: boolean;
  invalidToolCallExtracted: boolean;
  invalidToolCallError: string;
  invalidToolCallOriginalJson: string
}

export interface FileContext {
  message: string;
}

export interface SlashCommandContext {
  message: string;
  persona?: ChatPersona;
  command?: ICommand
}

/**
 * Normalized event types consumed by AgentResponseParser.
 * These are independent of OpenAI’s raw event names.
 */
export type NormalizedEvent =
  // Visible assistant text
  | { type: 'text.delta'; text: string }
  | { type: 'text.done' }

  // Hidden reasoning text (o1/o3 families unified)
  | { type: 'reasoning.delta'; text: string }
  | { type: 'reasoning.done' }

  // Function tool calls
  | { type: 'function_call.start' }
  | { type: 'function_call.complete'; toolCall: MCPToolCall[] }

  // MCP tool calls
  | { type: 'mcp_call.start'; }
  | { type: 'mcp_call.complete'; toolCall: MCPToolCall[] }

  // Refusal
  | { type: 'refusal' }

  // Final completion
  | { type: 'completed'; message: ChatMessage };

export type ParserMode =
  | 'idle'
  | 'text'
  | 'reasoning'
  | 'function_call'
  | 'mcp_call'
  | 'completed';

export interface ParserState {
  sessionId: string;

  messageBuffer: string;
  reasoningBuffer: string;
  toolArgsBuffer: string;

  sawToolCall: boolean;
  sawRefusal: boolean;

  currentFunctionCall: {
    name: string | null;
    argsText: string;
  } | null;

  currentMcpCall: {
    itemId: string | null;
    argsText: string;
  } | null;

  completedToolCalls: MCPToolCall[];

  mode: ParserMode;

  finalResult: ChatMessage | null;
}


export function buildPartialMessage(state: ParserState) {
  return {
    type: 'partial',
    message: state.messageBuffer,
    reasoning: state.reasoningBuffer,
    toolCalls: state.completedToolCalls,
    mode: state.mode,
  };
}


export function buildFinalMessage(state: ParserState): ChatMessage {
  let doneReason: ChatMessage['doneReason'] = 'stop';

  if (state.sawRefusal) {
    doneReason = 'content_filter';
  } else if (state.completedToolCalls.length > 0) {
    doneReason = 'tool_calls';
  }

  return {
    role: 'assistant',
    content: state.messageBuffer,
    reasoning: state.reasoningBuffer,
    toolCalls: state.completedToolCalls,
    doneReason,
  } as ChatMessage;
}


export class AgentResponseParser {
  // ---------------------------------------------------------------------------
  // Session identity
  // ---------------------------------------------------------------------------
  public sessionId: string;

  // ---------------------------------------------------------------------------
  // Core buffers
  // ---------------------------------------------------------------------------
  /** Accumulates visible assistant text (non‑reasoning, non‑tool) */
  public messageBuffer: string;

  /** Accumulates hidden reasoning text (reasoning_text.* or output_text.reasoning.*) */
  public reasoningBuffer: string;

  /** Accumulates raw tool‑call argument text (function or MCP) */
  public toolArgsBuffer: string;

  // ---------------------------------------------------------------------------
  // Tool call tracking
  // ---------------------------------------------------------------------------
  /** True if any tool call has been detected in this response */
  public sawToolCall: boolean;

  /** True if a refusal event was detected */
  public sawRefusal: boolean;

  /** MCP/Function tool call currently being constructed */
  public currentMcpCall: MCPToolCall | null;

  /** Completed tool calls (function + MCP unified) */
  public completedToolCalls: Array<MCPToolCall>;

  // ---------------------------------------------------------------------------
  // State machine
  // ---------------------------------------------------------------------------
  /** High‑level parser mode */
  public mode:
    | 'idle'
    | 'text'
    | 'reasoning'
    | 'function_call'
    | 'mcp_call'
    | 'completed';

  // ---------------------------------------------------------------------------
  // Final result snapshot (for non‑streaming mode)
  // ---------------------------------------------------------------------------
  public finalResult: ChatMessage | null;

  // ---------------------------------------------------------------------------
  // Event listeners (same as your previous version)
  // ---------------------------------------------------------------------------
  private readonly _eventListeners: Map<string, Array<(data?: unknown) => void>>;

  // ---------------------------------------------------------------------------
  // Constructor (properties only, no logic)
  // ---------------------------------------------------------------------------
  constructor(sessionId?: string) {
    this.sessionId = sessionId || `session-${Date.now()}`;

    this.messageBuffer = '';
    this.reasoningBuffer = '';
    this.toolArgsBuffer = '';

    this.sawToolCall = false;
    this.sawRefusal = false;

    this.currentMcpCall = null;

    this.completedToolCalls = [];

    this.mode = 'idle';

    this.finalResult = null;

    this._eventListeners = new Map();
  }

  // ---------------------------------------------------------------------------
  // Reducer skeleton — no logic yet
  // ---------------------------------------------------------------------------
  public applyEvent(event: NormalizedEvent): void {
    switch (event.type) {
      // ---------------------------------------------------------
      // Visible text
      // ---------------------------------------------------------
      case 'text.delta': {
        // Switch parser into visible text mode
        this.mode = 'text';

        // Append visible assistant text
        this.messageBuffer += event.text;

        // Emit partial message event (optional)
        this.emit('text', { text: event.text });
        break;
      }

      case 'text.done': {
        // Mark that visible text section is complete
        // (No special behavior needed yet, but we may use this later)
        this.mode = 'text';

        // Emit completion event (optional)
        this.emit('text_done');
        break;
      }

      // ---------------------------------------------------------
      // Reasoning text
      // ---------------------------------------------------------
      case 'reasoning.delta': {
        // Switch parser into reasoning mode
        this.mode = 'reasoning';

        // Append hidden reasoning text
        this.reasoningBuffer += event.text;

        // Emit partial reasoning event (optional)
        this.emit('reasoning', { text: event.text });
        break;
      }

      case 'reasoning.done': {
        // Mark reasoning section as complete
        this.mode = 'reasoning';

        // Emit reasoning completion event (optional)
        this.emit('reasoning_done');
        break;
      }

      // ---------------------------------------------------------
      // Function tool calls
      // ---------------------------------------------------------

      case 'function_call.start': {
        // Emit event (optional)
        this.sawToolCall = true
        this.emit('function_call.start');
        break;
      }
      case 'function_call.complete': {
        // Emit event (optional)
        this.emit('function_call_args_done', { data: event.toolCall });
        break;
      }

      // ---------------------------------------------------------
      // MCP tool calls
      // ---------------------------------------------------------
      case 'mcp_call.start': {
        this.sawToolCall = true
        this.emit('function_call.start');
        break;
      }
      case 'mcp_call.complete': {
        this.emit('mcp_call.complete', { data: event.toolCall });
        break;
      }

      // ---------------------------------------------------------
      // Refusal
      // ---------------------------------------------------------
      case 'refusal': {
        this.sawRefusal = true;
        this.mode = 'completed';

        // Emit refusal event (optional)
        this.emit('refusal');

        break;
      }


      // ---------------------------------------------------------
      // Final completion
      // ---------------------------------------------------------
      case 'completed': {
        this.mode = 'completed';

        // Emit completion event (optional)
        this.emit('completed');

        break;
      }


      // ---------------------------------------------------------
      // Exhaustiveness guard (optional)
      // ---------------------------------------------------------
      default:
        const _exhaustive: never = event;
        return _exhaustive;
    }
  }

  public ingestChatMessage(chunk: ChatMessage): NormalizedEvent[] {
    const events = this.normalizeChatMessageChunk(chunk);
    for (const ev of events) {
      this.applyEvent(ev);
    }
    return events;
  }

  /** Avoid re-emitting full provider snapshots when incremental deltas were already ingested. */
  private streamRemainderAfterBuffer(buffer: string, incoming: string): string {
    if (!incoming) {
      return '';
    }
    if (!buffer) {
      return incoming;
    }
    if (incoming.startsWith(buffer)) {
      return incoming.slice(buffer.length);
    }
    if (buffer.startsWith(incoming)) {
      return '';
    }
    return '';
  }

  private normalizeChatMessageChunk(chunk: ChatMessage): NormalizedEvent[] {
    const events: NormalizedEvent[] = [];

    if (!chunk.isComplete) {
      // TOOL CALL
      const currentToolCall = chunk.tool_call_current
      if (currentToolCall) {
        events.push({ type: 'function_call.complete', toolCall: [currentToolCall] })
      }
      // TEXT
      if (typeof chunk.content === "string" && chunk.tool_calls?.length == 0) {
        events.push({ type: "text.delta", text: chunk.content });
      }
      // REASONING
      if (chunk.content.length == 0 &&
        chunk.tool_calls?.length == 0 &&
        !chunk.hasToolCalls &&
        !chunk.contentStarted &&
        (chunk.reasoning && chunk.reasoning.length > 0)) {
        events.push({ type: "reasoning.delta", text: chunk.reasoning });
      }
    } else {
      if (chunk.reasoning && chunk.reasoning.length > 0) {
        const reasoningRemainder = this.streamRemainderAfterBuffer(this.reasoningBuffer, chunk.reasoning);
        if (reasoningRemainder) {
          events.push({ type: 'reasoning.delta', text: reasoningRemainder });
        }
      }
      if (typeof chunk.content === 'string' && chunk.content.length > 0) {
        const textRemainder = this.streamRemainderAfterBuffer(this.messageBuffer, chunk.content);
        if (textRemainder) {
          events.push({ type: 'text.delta', text: textRemainder });
        }
      }
      if (chunk.tool_calls && chunk.tool_calls.length > 0) {
        for (const tc of chunk.tool_calls) {
          events.push({ type: 'function_call.complete', toolCall: [tc] });
        }
      }
      events.push({ type: "reasoning.done" });
      events.push({ type: "text.done" });
      events.push({ type: "completed", message: chunk });
    }

    return events;
  }



  // ---------------------------------------------------------------------------
  // Reset
  // ---------------------------------------------------------------------------
  public reset(): void {
    this.messageBuffer = '';
    this.reasoningBuffer = '';
    this.toolArgsBuffer = '';

    this.sawToolCall = false;
    this.sawRefusal = false;

    this.currentMcpCall = null;

    this.completedToolCalls = [];

    this.mode = 'idle';

    this.finalResult = null;
  }


  // ---------------------------------------------------------------------------
  // Final result builder 
  // ---------------------------------------------------------------------------
  public getFinalResult(): ChatMessage {
    // If we already built it once, return cached version
    if (this.finalResult) {
      return this.finalResult;
    }

    // Determine done reason
    let doneReason: ChatMessage['doneReason'] = 'stop';

    if (this.sawRefusal) {
      doneReason = 'content_filter';
    } else if (this.completedToolCalls.length > 0) {
      doneReason = 'tool_calls';
    }

    // Build final result
    this.finalResult = {
      role: 'assistant',
      content: this.messageBuffer,
      reasoning: this.reasoningBuffer,
      toolCalls: this.completedToolCalls,
      doneReason,
    } as ChatMessage;

    return this.finalResult;
  }

  // ---------------------------------------------------------------------------
  // Event emitter system
  // ---------------------------------------------------------------------------
  public on(event: string, handler: (data?: unknown) => void): void {
    if (!this._eventListeners.has(event)) {
      this._eventListeners.set(event, []);
    }
    this._eventListeners.get(event)!.push(handler);
  }

  public off(event: string, handler?: (data?: unknown) => void): void {
    if (!this._eventListeners.has(event)) return;

    if (!handler) {
      // Remove all listeners for this event
      this._eventListeners.delete(event);
      return;
    }

    const list = this._eventListeners.get(event)!;
    const idx = list.indexOf(handler);
    if (idx !== -1) {
      list.splice(idx, 1);
    }

    // If empty, remove the event key entirely
    if (list.length === 0) {
      this._eventListeners.delete(event);
    }
  }

  public emit(event: string, data?: unknown): void {
    const list = this._eventListeners.get(event);
    if (!list || list.length === 0) return;

    // Call listeners in order of registration
    for (const handler of list) {
      try {
        handler(data);
      } catch (err) {
        // We intentionally swallow listener errors
        // to avoid breaking the parser
        console.error(`Error in event listener for "${event}":`, err);
      }
    }
  }

  public getEventListeners(event: string): Array<(data?: unknown) => void> {
    return this._eventListeners.get(event) ?? [];
  }

  public ClearAllListeners(): void {
    this._eventListeners.clear();
  }

}
