/** Moment kinds for Sidecar table talk (not in-game move execution). */
export type LabAssistantBanterKind =
  | 'capture'
  | 'check'
  | 'block'
  | 'hit'
  | 'highlight'
  | 'pocket'
  | 'scratch'
  | 'eight_ball_foul'
  | 'match_win'
  | 'match_loss'
  | 'match_draw'
  | 'slow_turn';

export interface LabAssistantBanterMoment {
  kind: LabAssistantBanterKind;
  /** Who just moved (1 | 2), when relevant. */
  moverSeat?: number;
  /** Optional detail for templates (e.g. "queen"). */
  detail?: string;
}

export interface LabAssistantBanterRequest {
  gameId: string;
  matchId: string;
  yourSeat: number;
  moment: LabAssistantBanterMoment;
  /** Lab profile display name for the human player (Sidecar table talk). */
  humanDisplayName?: string;
}

export type DetectBanterMomentFn = (
  prev: import('../types').MatchView | null,
  next: import('../types').MatchView,
) => LabAssistantBanterMoment | null;
