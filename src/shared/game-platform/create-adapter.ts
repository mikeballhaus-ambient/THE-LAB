/**
 * Adapter factory for turn-based catalog games.
 *
 * Every game differs only in its *rules* and its *agent prompt*; the
 * `GameServerAdapter` plumbing around them is identical. This factory keeps that
 * plumbing in one place so each app's `adapter.ts` is a thin rules binding.
 *
 * **No heuristic fallback:** when the model returns something unusable,
 * `agentMoveAsync` throws. A silently substituted move would look like a
 * legitimate turn and hide a broken provider.
 */
import type { PlatformAgentTurnDeps } from '@/shared/types/platform-agent-turn';
import type {
  PlatformLlmReasoningEffort,
  PlatformLlmSamplingOptions,
  PlatformLlmToolFeedbackTurn,
} from '@/shared/types/platform-llm-completion';
import { runAgentMoveLoop, type AgentLoopRetryContext } from './agent-loop';
import type {
  GameDifficulty,
  GameServerAdapter,
  MatchCreateConfig,
  ValidateMoveResult,
} from './types';

export interface TurnBasedAdapterRules<TState, TMove> {
  /** Fresh state for a new match. */
  createInitialState(config: MatchCreateConfig): TState;
  /** Parse an untrusted wire payload into a move, or `null` when malformed. */
  parseMove(move: unknown): TMove | null;
  /** Rules validation for the seat attempting the move. */
  validate(state: TState, move: TMove, playerSeat: number): ValidateMoveResult;
  /** Apply an already-validated move. */
  apply(state: TState, move: TMove, playerSeat: number): TState;
  scores(state: TState): Record<number, number>;
  isFinished(state: TState): boolean;
  winnerSeat(state: TState): number | null;
  /** Fallback action when a turn times out (a legal, non-agent move). */
  onTimeout(state: TState, playerSeat: number): TState;
  /** One-line description for the player-turns panel. */
  summarizeMove?(move: TMove): string;
}

/**
 * Structured-tool agent config.
 *
 * Declaring this turns the game from a **prose** agent (the reply text *is* the
 * move) into a **structural-tool** agent: the model must call `id`, and its
 * arguments are graded by `grade`. Everything else about the loop — retries,
 * rejection feedback, temperature escalation, throwing on exhaustion — is the
 * kit's, so a structured game needs no bespoke module.
 */
export interface TurnBasedAdapterStructuralTool<TState, TMove> {
  /** Registered platform structural tool id (see `platform-structural-tool-registry`). */
  id: string;
  /**
   * Parse **and** rules-validate the tool arguments, returning the game's move.
   * Throw an `Error` whose message is fed back to the model as the rejection
   * reason. Must return the normalised move — the tool payload is not the move.
   */
  grade?(raw: unknown, state: TState, playerSeat: number): TMove;
  /** Structural check before grading; return a message to retry. */
  preflight?(raw: unknown): string | null;
  /** Model-facing hint appended to the rejection result. */
  toolResultHint?(error: string): string | undefined;
  /** Extra nudge appended to the retry user message. */
  retryUserHint?(context: AgentLoopRetryContext<TState>): string | undefined;
  /** Does this rejection consume the game's own "stumped" budget? */
  countsAsStump?(toolArguments: string, retryKind: 'structural' | 'game_rule'): boolean;
  /** End the turn early on the game's own stuck-detection. */
  abortAfter?(priorTurns: readonly PlatformLlmToolFeedbackTurn[]): string | null;
  /** Player-facing line when an attempt is rejected. */
  attemptNote?(toolArguments: string, error: string): string | undefined;
  /** Completion budget. Defaults to the reasoning-aware value. */
  maxTokens?: (reasoningEffort: PlatformLlmReasoningEffort) => number;
  /** Provider sampling. */
  sampling?: PlatformLlmSamplingOptions;
  /** Loop budgets. */
  limits?: {
    maxApiRounds?: number;
    maxStructuralRounds?: number;
    feedbackWindow?: number;
  };
  /** Diagnostics sink. */
  debug?(event: string, detail: Record<string, unknown>): void;
}

export interface TurnBasedAdapterAgentConfig<TState, TMove> {
  /** LLM `purpose`, e.g. `chess.chess.agent-turn`. */
  purpose: string;
  /** Static system prompt for the game. */
  systemPrompt: string;
  /**
   * Per-difficulty system prompt. Takes precedence over {@link systemPrompt} when
   * present — games whose persona changes by tier (Word Tile) use this.
   */
  systemPromptFor?(difficulty: GameDifficulty): string;
  /**
   * Per-difficulty user prompt describing the current position.
   *
   * `retry` is present from the second attempt onward and carries the last
   * rejection, so the prompt can state exactly what was wrong rather than leaving
   * the model to infer it.
   */
  buildUserPrompt(
    state: TState,
    playerSeat: number,
    difficulty: GameDifficulty,
    retry?: { lastRejection: string; attempt: number },
  ): string;
  /** Parse the model's raw reply into a legal move, or `null` when unusable. */
  parseAgentReply(content: string, state: TState, playerSeat: number): TMove | null;
  /** Optional per-tier temperature override. */
  temperatureFor?(difficulty: GameDifficulty): number;
  /**
   * Optional per-turn temperature (return `undefined` to use {@link temperatureFor}).
   */
  resolveTemperature?(
    state: TState,
    playerSeat: number,
    difficulty: GameDifficulty,
    context: { isRetry: boolean; ruleRejections: number; attempt: number },
  ): number | undefined;
  /** Optional per-turn system prompt override. */
  resolveSystemPrompt?(
    state: TState,
    playerSeat: number,
    difficulty: GameDifficulty,
  ): string | undefined;
  /**
   * Optional engine override: when this returns a move, the LLM is skipped for that turn.
   * Catalog turn-based games normally inject ranked search hints into {@link buildUserPrompt}
   * instead so the configured provider still chooses the move. Use this hook for benchmarks
   * or scripted opponents only. Return `null` to use the LLM path.
   */
  chooseSearchMove?(
    state: TState,
    playerSeat: number,
    difficulty: GameDifficulty,
  ): TMove | null | Promise<TMove | null>;
  /**
   * Structural tool the model must call instead of replying in prose.
   * When present, `parseAgentReply` is unused for the tool path.
   */
  structuralTool?: TurnBasedAdapterStructuralTool<TState, TMove>;
}

export interface CreateTurnBasedAdapterOptions<TState, TMove> {
  gameId: string;
  rules: TurnBasedAdapterRules<TState, TMove>;
  agent: TurnBasedAdapterAgentConfig<TState, TMove>;
}

const DEFAULT_MAX_TOKENS = 32;
/** Short answers (an index or a letter) need far fewer retries than a structured move. */
const PROSE_MAX_STRUCTURAL_ROUNDS = 3;

export function createTurnBasedAdapter<TState, TMove>(
  options: CreateTurnBasedAdapterOptions<TState, TMove>,
): GameServerAdapter {
  const { gameId, rules, agent } = options;

  return {
    gameId,

    createInitialState(config) {
      return rules.createInitialState(config);
    },

    validateMove(state, move, playerSeat): ValidateMoveResult {
      const parsed = rules.parseMove(move);
      if (!parsed) return { ok: false, error: 'Malformed move payload' };
      return rules.validate(state as TState, parsed, playerSeat);
    },

    applyMove(state, move, playerSeat) {
      const parsed = rules.parseMove(move);
      if (!parsed) {
        throw new Error('applyMove received an unparseable move');
      }
      return rules.apply(state as TState, parsed, playerSeat);
    },

    scores(state) {
      return rules.scores(state as TState);
    },

    isFinished(state) {
      return rules.isFinished(state as TState);
    },

    winnerSeat(state) {
      return rules.winnerSeat(state as TState);
    },

    onTurnTimeout(state, playerSeat) {
      return rules.onTimeout(state as TState, playerSeat);
    },

    ...(rules.summarizeMove
      ? {
          summarizeMove(move: unknown) {
            const parsed = rules.parseMove(move);
            return parsed && rules.summarizeMove ? rules.summarizeMove(parsed) : 'Moved';
          },
        }
      : {}),

    async agentMoveAsync(
      state,
      difficulty: GameDifficulty,
      playerSeat: number,
      deps: PlatformAgentTurnDeps,
    ) {
      const typed = state as TState;
      if (agent.chooseSearchMove) {
        const searched = await agent.chooseSearchMove(typed, playerSeat, difficulty);
        if (searched != null) {
          return searched;
        }
      }
      const tool = agent.structuralTool;

      // Same retry-and-feedback engine for both shapes; only how the model is
      // asked, and how its answer is graded, differ.
      return runAgentMoveLoop<TState, TMove>(
        typed,
        difficulty,
        playerSeat,
        deps,
        {
          purpose: agent.purpose,
          systemPrompt:
            agent.systemPromptFor?.(difficulty as GameDifficulty) ?? agent.systemPrompt,
          temperatureFor: (tier) => agent.temperatureFor?.(tier as GameDifficulty) ?? 0.3,
          ...(agent.resolveTemperature
            ? {
                resolveTemperature: (context) =>
                  agent.resolveTemperature!(
                    context.state,
                    context.playerSeat,
                    context.difficulty as GameDifficulty,
                    {
                      isRetry: context.isRetry,
                      ruleRejections: context.ruleRejections,
                      attempt: context.attempt,
                    },
                  ),
              }
            : {}),
          ...(agent.resolveSystemPrompt
            ? {
                resolveSystemPrompt: (context) =>
                  agent.resolveSystemPrompt!(
                    context.state,
                    context.playerSeat,
                    context.difficulty as GameDifficulty,
                  ),
              }
            : {}),
          buildUserPrompt: (context) => {
            // The rejection reason reaches the model two ways: the `role:tool`
            // result for structured games, and `retryUserHint` for all games.
            const base = agent.buildUserPrompt(
              context.state,
              context.playerSeat,
              context.difficulty as GameDifficulty,
              context.isRetry
                ? { lastRejection: context.lastRejection ?? '', attempt: context.attempt }
                : undefined,
            );
            if (!tool && context.isRetry) {
              return `${base}\n\nPrior attempt was rejected - do not repeat it.`;
            }
            return base;
          },
          ...(tool
            ? {
                structuralToolId: tool.id,
                reasoningEffort: 'none' as PlatformLlmReasoningEffort,
                ...(tool.sampling ? { sampling: tool.sampling as PlatformLlmSamplingOptions } : {}),
                ...(tool.maxTokens ? { maxTokens: tool.maxTokens } : {}),
                ...(tool.preflight ? { preflight: tool.preflight } : {}),
                ...(tool.toolResultHint ? { toolResultHint: tool.toolResultHint } : {}),
                ...(tool.countsAsStump ? { countsAsStump: tool.countsAsStump } : {}),
                ...(tool.abortAfter ? { abortAfter: tool.abortAfter } : {}),
                ...(tool.attemptNote ? { attemptNote: tool.attemptNote } : {}),
                ...(tool.debug ? { debug: tool.debug } : {}),
                ...(tool.retryUserHint ? { retryUserHint: tool.retryUserHint } : {}),
                limits: { ...tool.limits },
                parseMove: (raw, s, seat) => {
                  if (!tool.grade) {
                    throw new Error(
                      `Game "${gameId}" declares a structural tool but no grade(); cannot validate the move.`,
                    );
                  }
                  // The graded move is the game's move — the raw tool payload
                  // (e.g. `{index: 4}`) is not a `TicTacToeMove`.
                  return tool.grade(raw, s, seat);
                },
              }
            : {
                maxTokens: () => DEFAULT_MAX_TOKENS,
                limits: { maxStructuralRounds: PROSE_MAX_STRUCTURAL_ROUNDS },
                parseMove: (raw, s, seat) => {
                  const move = agent.parseAgentReply(String(raw), s, seat);
                  if (!move) {
                    throw new Error(
                      `Reply did not contain a legal move: "${String(raw).slice(0, 120)}"`,
                    );
                  }
                  return move;
                },
              }),
        },
      );
    },
  };
}
