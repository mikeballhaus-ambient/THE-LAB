/**
 * One row in the shared player-turns feed.
 *
 * The kit's `useTurnBasedMatch` derives these from `state.turnHistory`. Richer
 * apps (Word Tile, whose agent streams tokens and can be rejected mid-turn) opt
 * into the extra fields; simple games leave them undefined.
 */
export interface PlayerTurn {
  id: string;
  seat: number;
  playerLabel: string;
  isYou: boolean;
  /**
   * Fallback line. Optional because apps that track their own `moveSummary`
   * (Word Tile uses `text`) need not duplicate it.
   */
  summary?: string;
  /** True while the opponent's tokens are still arriving. */
  streaming?: boolean;
  /** Rejected in-turn attempts — rendered dashed, not as a committed move. */
  rejectedAttemptNotes?: string;
  /** Committed move line from turn history / agent summary. */
  moveSummary?: string;
  /** Word Tile legacy alias; prefer `summary` / `moveSummary`. */
  text?: string;
  /** @deprecated use rejectedAttemptNotes */
  isAttempt?: boolean;
}
