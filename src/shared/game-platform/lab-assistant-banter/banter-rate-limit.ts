import type { LabAssistantBanterKind } from './types';

const lastSlowTurnByMatch = new Map<string, number>();

/** Minimum gap between slow-turn nudges only (captures/checks are not throttled). */
const SLOW_TURN_MIN_GAP_MS = 60_000;

export function shouldEmitBanter(matchId: string, kind: LabAssistantBanterKind): boolean {
  if (kind !== 'slow_turn') {
    return true;
  }
  const now = Date.now();
  const prev = lastSlowTurnByMatch.get(matchId);
  if (prev != null && now - prev < SLOW_TURN_MIN_GAP_MS) {
    return false;
  }
  lastSlowTurnByMatch.set(matchId, now);
  return true;
}

export function clearBanterRateLimit(matchId: string): void {
  lastSlowTurnByMatch.delete(matchId);
}
