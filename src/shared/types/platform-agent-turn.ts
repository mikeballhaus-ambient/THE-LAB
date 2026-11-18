import type {
  PlatformLlmCompletionRequest,
  PlatformLlmCompletionResult,
  PlatformLlmStreamDelta,
} from './platform-llm-completion';

/**
 * Injected into game adapters for async agent turns (any hybrid app on THE-LAB).
 * Implementations call the platform completion API with the human player's provider config.
 */
export interface PlatformAgentTurnDeps {
  complete: (request: PlatformLlmCompletionRequest) => Promise<PlatformLlmCompletionResult>;
  /** When supported, streams token deltas then resolves with full content (same as batch complete). */
  completeWithStream?: (
    request: PlatformLlmCompletionRequest,
    onDelta: (delta: PlatformLlmStreamDelta) => void,
  ) => Promise<PlatformLlmCompletionResult>;
  /** Rejected in-turn attempt (valid tool call, game server said no) — for player-turn UI. */
  onAgentAttempt?: (note: string) => void;
}
