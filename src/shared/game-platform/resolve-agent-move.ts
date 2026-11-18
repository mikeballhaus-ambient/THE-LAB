/**
 * Generic agent-move resolver.
 *
 * Uses the platform-LLM path (`adapter.agentMoveAsync`) when the game's catalog
 * entry declares `agentMode: 'llm'`.
 *
 * **`agentMode: 'scripted'`** — same {@link GameServerAdapter.agentMoveAsync} hook, but the
 * adapter returns a deterministic move (no provider call). Used when seat 2 should feel like
 * an AI tablemate without LLM latency or cost.
 *
 * There is deliberately **no heuristic fallback**: a silently substituted move
 * would look like a legitimate turn and hide a broken provider. If the game has
 * no LLM agent, or adapter resolution fails, the turn errors.
 */
import { createPlatformAgentTurnDeps } from '@/shared/services/platform-llm-client.node';
import type { PlatformAgentTurnDeps } from '@/shared/types/platform-agent-turn';
import type { PlatformLlmStreamDeltaPayload } from '@/shared/types/platform-llm-completion';
import { getGameAdapter } from './adapter-registry';
import type { GameDifficulty, GamePlatformConfig } from './types';

export async function resolveAgentMove(
  config: GamePlatformConfig,
  gameId: string,
  state: unknown,
  difficulty: GameDifficulty,
  playerSeat: number,
  humanUserId: number,
  options?: { onAgentDelta?: (payload: PlatformLlmStreamDeltaPayload) => void },
): Promise<unknown> {
  const adapter = getGameAdapter(gameId);
  if (!adapter) {
    throw new Error(`No game adapter registered for "${gameId}"`);
  }

  const meta = config.catalog.find((g) => g.id === gameId);
  const baseDeps = createPlatformAgentTurnDeps(humanUserId, config.appSlug);
  const deps: PlatformAgentTurnDeps = {
    complete: baseDeps.complete,
    completeWithStream: baseDeps.completeWithStream,
    onAgentAttempt: options?.onAgentDelta
      ? (note) => options.onAgentDelta!({ agentAttemptNote: note })
      : undefined,
  };

  if (meta?.agentMode === 'scripted') {
    if (!adapter.agentMoveAsync) {
      throw new Error(`Game "${gameId}" declares agentMode: 'scripted' but has no agentMoveAsync`);
    }
    return adapter.agentMoveAsync(state, difficulty, playerSeat, deps);
  }

  if (meta?.agentMode !== 'llm') {
    throw new Error(`Game "${gameId}" does not declare agentMode: 'llm' or 'scripted'`);
  }
  if (!adapter.agentMoveAsync) {
    throw new Error(`Game "${gameId}" declares agentMode: 'llm' but has no agentMoveAsync`);
  }
  return adapter.agentMoveAsync(state, difficulty, playerSeat, deps);
}
