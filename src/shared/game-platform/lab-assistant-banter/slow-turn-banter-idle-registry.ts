/** Per-match callback to restart slow-turn banter idle countdown (Sidecar user chat). */
type SlowTurnIdleBumpFn = () => void;

const bumpByMatchId = new Map<string, SlowTurnIdleBumpFn>();

export function registerSlowTurnBanterIdleBump(matchId: string, bump: SlowTurnIdleBumpFn): () => void {
  const trimmed = matchId.trim();
  if (!trimmed) {
    return () => undefined;
  }
  bumpByMatchId.set(trimmed, bump);
  return () => {
    if (bumpByMatchId.get(trimmed) === bump) {
      bumpByMatchId.delete(trimmed);
    }
  };
}

/** User sent Sidecar chat during this match — defer "long think" banter until idle again. */
export function bumpSlowTurnBanterIdleTimer(matchId: string): void {
  const trimmed = matchId.trim();
  if (!trimmed) {
    return;
  }
  bumpByMatchId.get(trimmed)?.();
}
