/**
 * Generic structural-tool agent turn for turn-based catalogue games.
 *
 * Every LLM-backed game shares the same *transport* problem: ask the player's
 * model for a move, get a tool call back, validate it against that game's rules,
 * and if the move is unusable, tell the model **why** and let it try again within
 * the same turn. Only two things differ per game — the prompt and the rules —
 * so both are injected here and everything else lives in one place.
 *
 * **No heuristic fallback.** When retries are exhausted the turn throws. A
 * silently substituted move would look like a legitimate turn and hide a broken
 * provider; retrying the prompt is still the model producing the move, which is
 * allowed.
 *
 * This replaces the kit's earlier `llm-agent-move.ts` shim, which could only
 * take the first integer or first letter in a reply — enough for indexed choice
 * prompts, useless for a game whose move is a structured object.
 */
import { z } from 'zod';
import type { MCPToolCall } from '@/shared/types/mcp-tools';
import type { PlatformAgentTurnDeps } from '@/shared/types/platform-agent-turn';
import type {
  PlatformLlmReasoningEffort,
  PlatformLlmSamplingOptions,
  PlatformLlmToolFeedbackTurn,
} from '@/shared/types/platform-llm-completion';
import { agentTurnPhaseDebug, agentTurnMark } from '@/shared/utils/agent-stream-debug.node';
import { parseMoveJsonFromModelText } from '@/shared/utils/parse-llm-json';

/** Why the model's attempt was unusable. */
export type AgentMoveRetryKind = 'structural' | 'game_rule';

export interface AgentLoopLimits {
  /** Upper bound on provider calls per turn. */
  maxApiRounds: number;
  /** Tool/protocol mistakes (no tool, bad JSON, wrong tool name) before giving up. */
  maxStructuralRounds: number;
  /** Rejected *game-rule* attempts before the loop stops nudging (the game may force a pass). */
  maxRuleRejections: number;
  /** Assistant+tool pairs replayed per request; older ones are summarised in the retry hint. */
  feedbackWindow: number;
}

export const DEFAULT_AGENT_LOOP_LIMITS: AgentLoopLimits = {
  maxApiRounds: 16,
  maxStructuralRounds: 4,
  maxRuleRejections: 8,
  feedbackWindow: 6,
};

/** Retries need sampling variance so the model does not simply repeat itself at temp 0. */
const RETRY_TEMPERATURE_FLOOR = 0.3;
/** Each rule rejection nudges temperature up, capped. */
const RULE_REJECTION_TEMP_BUMP = 0.05;
const RULE_REJECTION_TEMP_CAP = 0.48;
/** Tool JSON only — ample when thinking is off (LM Studio `reasoning_effort: none`). */
const MAX_TOKENS_THINKING_OFF = 768;
/** Reasoning + tool share one bucket on Qwen/LM Studio — 1024 often truncates before tool_calls. */
const MAX_TOKENS_THINKING_ON = 3072;

const EMPTY_TOOL_HINT =
  'No tool call in the API response (often: tool JSON was truncated or malformed — use one compact JSON object in tool arguments, not XML).';

export interface AgentLoopContext<TState> {
  state: TState;
  playerSeat: number;
  /** Difficulty tier as supplied by the catalogue (game narrows the union). */
  difficulty: string;
  attempt: number;
  /** True from the second provider call onward. */
  isRetry: boolean;
  /** Number of game-rule rejections so far this turn. */
  ruleRejections: number;
  /** Set on retries — why the previous attempt failed. */
  lastRejection?: string;
}

export interface AgentLoopRetryContext<TState> extends AgentLoopContext<TState> {
  lastRejection: string;
  priorTurns: readonly PlatformLlmToolFeedbackTurn[];
  omittedFeedbackCount: number;
}

/**
 * Game-supplied behaviour. Everything the loop cannot know on its own.
 */
export interface AgentLoopGame<TState, TMove> {
  /** Audit/log label, e.g. `chess.chess.agent-turn`. */
  purpose: string;
  /**
   * Registered structural tool id the model must call.
   *
   * Omit for **prose-only** games whose move is a single token (an index or a
   * letter). Those still get the retry loop and rejection feedback, but the
   * model answers in assistant text instead of a tool call.
   */
  structuralToolId?: string;
  /** Static system prompt (role + rules + output contract). */
  systemPrompt: string;
  /** Per-turn user prompt describing the position. */
  buildUserPrompt(context: AgentLoopContext<TState>): string;
  /** Base sampling temperature for the difficulty tier. */
  temperatureFor(difficulty: string): number;
  /**
   * Optional per-turn temperature override (e.g. higher when picking a creative
   * secret word). When omitted, {@link temperatureFor} is used.
   */
  resolveTemperature?(context: AgentLoopContext<TState>): number | undefined;
  /** Optional per-turn system prompt override. */
  resolveSystemPrompt?(context: AgentLoopContext<TState>): string | undefined;
  /**
   * Parse **and** rules-validate a raw move payload. Throw an `Error` whose
   * message is shown to the model as the rejection reason.
   */
  parseMove(raw: unknown, state: TState, playerSeat: number): TMove;
  /** Reasoning control. Defaults to `'none'` — thinking on starves the tool budget. */
  reasoningEffort?: PlatformLlmReasoningEffort;
  /** Optional provider sampling (narrow nucleus recommended). */
  sampling?: PlatformLlmSamplingOptions;
  /** Completion budget. Defaults to the reasoning-aware value. */
  maxTokens?: (reasoningEffort: PlatformLlmReasoningEffort) => number;
  /** Optional structural check on the raw payload before schema parsing. Return a message to retry. */
  preflight?(raw: unknown): string | null;
  /** Classify a thrown error. Default: `ZodError` → structural, anything else → game_rule. */
  classifyError?(error: unknown): AgentMoveRetryKind;
  /** Model-facing hint appended to the tool result for a given rejection. */
  toolResultHint?(error: string): string | undefined;
  /** Extra nudge appended to `retryUserHint`. */
  retryUserHint?(context: AgentLoopRetryContext<TState>): string | undefined;
  /**
   * Optional diagnostics sink (prompt dumps, provider payload previews). One hook
   * keeps the loop transport-agnostic while apps keep their debug verbosity.
   */
  debug?(event: string, detail: Record<string, unknown>): void;
  /** Does this rejection consume the game's own "stumped" budget? */
  countsAsStump?(toolArguments: string, retryKind: AgentMoveRetryKind): boolean;
  /**
   * Game-specific abort condition, evaluated after each rejection against the
   * accumulated feedback turns. Returning a message ends the turn with an error.
   * Use for budgets that only some rejection kinds consume (e.g. word-tile's
   * "rejected *placements* this turn" limit).
   */
  abortAfter?(priorTurns: readonly PlatformLlmToolFeedbackTurn[]): string | null;
  /** Human-facing one-liner for the player-turns feed when an attempt is rejected. */
  attemptNote?(toolArguments: string, error: string): string | undefined;
  limits?: Partial<AgentLoopLimits>;
}

interface AttemptResult<TMove> {
  status: 'ok';
  move: TMove;
}

interface AttemptRetry {
  status: 'retry';
  error: string;
  retryKind: AgentMoveRetryKind;
  lastToolArguments?: string;
}

type AttemptOutcome<TMove> = AttemptResult<TMove> | AttemptRetry;

function defaultClassifyError(error: unknown): AgentMoveRetryKind {
  return error instanceof z.ZodError ? 'structural' : 'game_rule';
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'move rejected';
}

/** Window the feedback turns so long retry chains do not blow the context. */
function windowedFeedback(
  allTurns: readonly PlatformLlmToolFeedbackTurn[],
  window: number,
): { turns: PlatformLlmToolFeedbackTurn[]; omittedCount: number } {
  if (allTurns.length <= window) {
    return { turns: [...allTurns], omittedCount: 0 };
  }
  return {
    turns: allTurns.slice(-window),
    omittedCount: allTurns.length - window,
  };
}

function toolArgumentsFor(
  result: { toolCalls?: MCPToolCall[] },
  toolId: string,
): { args?: string; wrongTool?: MCPToolCall } {
  const call = result.toolCalls?.find((tc) => tc.function.name === toolId);
  if (call?.function.arguments?.trim()) {
    return { args: call.function.arguments.trim() };
  }
  const wrongTool = result.toolCalls?.find((tc) => tc.function.name !== toolId);
  return { wrongTool };
}

/**
 * Grade one provider response against the game's rules.
 * Exported for unit tests.
 */
export function evaluateAgentAttempt<TState, TMove>(
  result: { content: string; toolCalls?: MCPToolCall[] },
  state: TState,
  playerSeat: number,
  game: AgentGameEvaluation<TState, TMove>,
): AttemptOutcome<TMove> {
  const classify = game.classifyError ?? defaultClassifyError;

  const fail = (error: string, kind: AgentMoveRetryKind, lastToolArguments?: string): AttemptRetry => ({
    status: 'retry',
    error,
    retryKind: kind,
    ...(lastToolArguments === undefined ? {} : { lastToolArguments }),
  });

  // Prose-only game: the reply itself is the move.
  if (!game.structuralToolId) {
    if (!result.content.trim()) {
      return fail('The model returned no text — reply with your move.', 'structural');
    }
    try {
      return { status: 'ok', move: game.parseMove(result.content, state, playerSeat) };
    } catch (e) {
      return fail(errorMessage(e), classify(e), result.content);
    }
  }

  const toolId = game.structuralToolId;
  const { args, wrongTool } = toolArgumentsFor(result, toolId);

  if (!args) {
    if (wrongTool) {
      return fail(
        `Wrong tool name "${wrongTool.function.name}" — use ${game.structuralToolId}.`,
        'structural',
        wrongTool.function.arguments,
      );
    }
    if (result.toolCalls?.length) {
      return fail(
        `Missing ${game.structuralToolId} tool call — call it with your move.`,
        'structural',
      );
    }
    if (!result.content.trim()) {
      return fail(
        `${EMPTY_TOOL_HINT} Required tool: ${game.structuralToolId}.`,
        'structural',
      );
    }
    // Some providers put the move in assistant text instead of a tool call.
    try {
      const raw = parseMoveJsonFromModelText<unknown>(result.content);
      return { status: 'ok', move: game.parseMove(raw, state, playerSeat) };
    } catch (e) {
      return fail(
        `${errorMessage(e)} (Use ${game.structuralToolId}, not prose.)`,
        classify(e),
      );
    }
  }

  let raw: unknown;
  try {
    raw = JSON.parse(args);
  } catch {
    return fail(
      'Tool arguments were not valid JSON — send one compact object in the tool arguments.',
      'structural',
      args,
    );
  }

  const preflight = game.preflight?.(raw);
  if (preflight) {
    return fail(preflight, 'structural', args);
  }

  try {
    return { status: 'ok', move: game.parseMove(raw, state, playerSeat) };
  } catch (e) {
    return fail(errorMessage(e), classify(e), args);
  }
}

/** The subset of {@link AgentLoopGame} that attempt evaluation needs. */
export interface AgentGameEvaluation<TState, TMove> {
  /** Absent → prose-only game; the reply text itself is the move payload. */
  structuralToolId?: string;
  parseMove(raw: unknown, state: TState, playerSeat: number): TMove;
  preflight?(raw: unknown): string | null;
  classifyError?(error: unknown): AgentMoveRetryKind;
}

/**
 * The agent turn failed after exhausting retries.
 *
 * There is deliberately **no heuristic fallback**: a silently substituted move
 * would look like a legitimate turn and hide a broken provider. Surface the
 * failure so the match errors visibly instead.
 */
export function throwAgentMoveExhausted(lastError: string): never {
  throw new Error(
    `Lab Assistant opponent could not produce a legal move after retries. Last error: ${lastError}`,
  );
}

function toolFeedbackTurn(
  result: { toolCalls?: MCPToolCall[] },
  error: string,
  game: AgentLoopGame<unknown, unknown>,
  fallbackArguments: string | undefined,
  syntheticIdSuffix: string,
): PlatformLlmToolFeedbackTurn | null {
  const toolId = game.structuralToolId;
  // Prose games have no tool. Emitting a `tool_calls`/`role:tool` pair for a tool
  // that was never declared is a false claim about the model's own prior turn —
  // strict OpenAI-compatible providers reject it. Prose retries instead carry the
  // rejection in the user message (see `buildUserPrompt` / `retryUserHint`).
  if (!toolId) {
    return null;
  }
  const call = result.toolCalls?.find((tc) => tc.function.name === toolId);
  const args = call?.function.arguments?.trim() || fallbackArguments?.trim();
  if (!args) {
    return null;
  }
  return {
    toolCallId: call?.id?.trim() || `agent-move-${syntheticIdSuffix}`,
    toolName: toolId,
    arguments: args,
    resultContent: JSON.stringify({
      success: false,
      error,
      ...(game.toolResultHint?.(error) ? { hint: game.toolResultHint(error) } : {}),
    }),
  };
}

/**
 * Run one agent turn: request a move, validate it, feed rejections back, retry.
 *
 * Returns the game's validated move. Throws when the provider fails or the
 * retry budget is exhausted — never substitutes a move.
 */
export async function runAgentMoveLoop<TState, TMove>(
  state: TState,
  difficulty: string,
  playerSeat: number,
  deps: PlatformAgentTurnDeps,
  game: AgentLoopGame<TState, TMove>,
): Promise<TMove> {
  const limits: AgentLoopLimits = { ...DEFAULT_AGENT_LOOP_LIMITS, ...game.limits };
  const reasoningEffort: PlatformLlmReasoningEffort = game.reasoningEffort ?? 'none';
  const maxTokens =
    game.maxTokens?.(reasoningEffort) ??
    (reasoningEffort === 'none' ? MAX_TOKENS_THINKING_OFF : MAX_TOKENS_THINKING_ON);
  const feedbackTurns: PlatformLlmToolFeedbackTurn[] = [];
  let lastRejection = '';
  let ruleRejections = 0;
  let structuralRounds = 0;

  for (let attempt = 1; attempt <= limits.maxApiRounds; attempt += 1) {
    const isRetry = attempt > 1;

    const context: AgentLoopContext<TState> = {
      state,
      playerSeat,
      difficulty,
      attempt,
      isRetry,
      ruleRejections,
      ...(isRetry && lastRejection ? { lastRejection } : {}),
    };

    const baseTemperature =
      game.resolveTemperature?.(context) ?? game.temperatureFor(difficulty);

    let temperature = baseTemperature;
    if (isRetry) {
      temperature = Math.max(baseTemperature, RETRY_TEMPERATURE_FLOOR);
      if (ruleRejections > 0) {
        temperature = Math.min(
          RULE_REJECTION_TEMP_CAP,
          temperature + ruleRejections * RULE_REJECTION_TEMP_BUMP,
        );
      }
    }

    const { turns: feedbackForRequest, omittedCount } = windowedFeedback(
      feedbackTurns,
      limits.feedbackWindow,
    );

    const systemPrompt =
      game.resolveSystemPrompt?.(context) ?? game.systemPrompt;

    // Built whenever there is a prior rejection — not only when a tool-feedback
    // turn exists. Prose games have no tool to replay, so this hint is the *only*
    // channel that tells them why the last reply was rejected.
    const retryHint = isRetry
      ? game.retryUserHint?.({
          ...context,
          lastRejection,
          priorTurns: feedbackForRequest,
          omittedFeedbackCount: omittedCount,
        })
      : undefined;

    game.debug?.('request', {
      attempt,
      temperature,
      isRetry,
      ruleRejections,
      feedbackTurnCount: feedbackForRequest.length,
      hasRetryUserHint: Boolean(retryHint),
      lastRejection: isRetry ? lastRejection : undefined,
    });

    const roundElapsed = agentTurnMark();
    const buildPromptElapsed = agentTurnMark();
    const userPrompt = game.buildUserPrompt(context);
    const buildUserPromptMs = buildPromptElapsed();
    const preLlmMs = roundElapsed();
    agentTurnPhaseDebug('buildUserPrompt', {
      purpose: game.purpose,
      attempt,
      difficulty,
      isRetry,
      systemPromptChars: systemPrompt.length,
      userPromptChars: userPrompt.length,
      buildUserPromptMs,
      preLlmPrepMs: preLlmMs,
    });

    let result: { content: string; toolCalls?: MCPToolCall[] };
    try {
      result = await deps.complete({
        purpose: game.purpose,
        system: systemPrompt,
        user: userPrompt,
        temperature,
        maxTokens,
        reasoningEffort,
        ...(game.sampling ? { sampling: game.sampling } : {}),
        ...(game.structuralToolId ? { structuralTool: game.structuralToolId } : {}),
        ...(feedbackForRequest.length > 0
          ? { toolFeedbackTurns: feedbackForRequest }
          : {}),
        ...(retryHint ? { retryUserHint: retryHint } : {}),
      });
    } catch (e) {
      throw new Error(`Lab Assistant opponent provider error: ${errorMessage(e)}`);
    }

    agentTurnPhaseDebug('providerRound', {
      purpose: game.purpose,
      attempt,
      providerRoundMs: roundElapsed(),
    });

    game.debug?.('response', {
      attempt,
      contentLength: result.content.length,
      toolCallCount: result.toolCalls?.length ?? 0,
      preview: result.content.slice(0, 240),
    });

    const outcome = evaluateAgentAttempt(result, state, playerSeat, game);
    if (outcome.status === 'ok') {
      return outcome.move;
    }

    lastRejection = outcome.error;
    if (outcome.retryKind === 'game_rule') {
      ruleRejections += 1;
    }

    const attemptArguments = outcome.lastToolArguments ?? '';
    if (
      deps.onAgentAttempt &&
      attemptArguments &&
      game.countsAsStump?.(attemptArguments, outcome.retryKind)
    ) {
      const note = game.attemptNote?.(attemptArguments, outcome.error);
      if (note) {
        deps.onAgentAttempt(note);
      }
    }

    if (outcome.retryKind === 'structural') {
      structuralRounds += 1;
      if (structuralRounds >= limits.maxStructuralRounds) {
        return throwAgentMoveExhausted(lastRejection);
      }
    }

    const feedback = toolFeedbackTurn(
      result,
      outcome.error,
      game as AgentLoopGame<unknown, unknown>,
      outcome.lastToolArguments,
      String(attempt),
    );
    if (feedback) {
      feedbackTurns.push(feedback);
    }

    const abortReason = game.abortAfter?.(feedbackTurns);
    if (abortReason) {
      game.debug?.('abort', { attempt, reason: abortReason, lastRejection });
      return throwAgentMoveExhausted(abortReason);
    }
  }

  return throwAgentMoveExhausted(lastRejection);
}
