import { isBilliardsPendingOpponentShotReplay } from './billiards-opponent-replay-sync';
import type { BilliardsMatchState } from './billiards-types';

export function isBilliardsPendingOpponentPresentation(options: {
  practiceMode: boolean;
  yourSeat: number;
  state: BilliardsMatchState;
  lastConsumedShotReplay: number;
  lastConsumedCuePlaceIndex: number;
  opponentPlacePhase: 'idle' | 'animating';
}): boolean {
  if (options.practiceMode) {
    return false;
  }
  if (
    isBilliardsPendingOpponentShotReplay({
      practiceMode: false,
      yourSeat: options.yourSeat,
      state: options.state,
      lastConsumedReplayShots: options.lastConsumedShotReplay,
      opponentReplayBusy: false,
      isRolling: false,
    })
  ) {
    return true;
  }
  return isBilliardsPendingOpponentCuePlacePresentation({
    practiceMode: false,
    yourSeat: options.yourSeat,
    state: options.state,
    lastConsumedCuePlaceIndex: options.lastConsumedCuePlaceIndex,
    opponentPlacePhase: options.opponentPlacePhase,
  });
}

export function isBilliardsPendingOpponentCuePlacePresentation(options: {
  practiceMode: boolean;
  yourSeat: number;
  state: BilliardsMatchState;
  lastConsumedCuePlaceIndex: number;
  opponentPlacePhase: 'idle' | 'animating';
}): boolean {
  if (options.practiceMode) {
    return false;
  }
  if (options.opponentPlacePhase === 'animating') {
    return true;
  }
  const placeReplay = options.state.lastCuePlaceReplay;
  if (!placeReplay || placeReplay.seat === options.yourSeat) {
    return false;
  }
  if (placeReplay.historyIndex !== options.state.turnHistory.length) {
    return false;
  }
  return placeReplay.historyIndex !== options.lastConsumedCuePlaceIndex;
}

/** Turn feed, match trays, and agent gating — live match state, not stale store authoritative. */
export function shouldDeferBilliardsOpponentPresentationUi(options: {
  practiceMode: boolean;
  yourSeat: number;
  state: BilliardsMatchState;
  lastConsumedShotReplay: number;
  lastConsumedCuePlaceIndex: number;
  opponentShotPhase: 'idle' | 'queued' | 'aim_pull' | 'rolling';
  opponentPlacePhase: 'idle' | 'animating';
  presentationExecutorBusy: boolean;
}): boolean {
  if (options.practiceMode) {
    return false;
  }
  const pendingShot = isBilliardsPendingOpponentShotReplay({
    practiceMode: false,
    yourSeat: options.yourSeat,
    state: options.state,
    lastConsumedReplayShots: options.lastConsumedShotReplay,
    opponentReplayBusy: false,
    isRolling: false,
  });
  const pendingPlace = isBilliardsPendingOpponentCuePlacePresentation({
    practiceMode: false,
    yourSeat: options.yourSeat,
    state: options.state,
    lastConsumedCuePlaceIndex: options.lastConsumedCuePlaceIndex,
    opponentPlacePhase: options.opponentPlacePhase,
  });
  return shouldDeferBilliardsPlayerTurnFeed({
    practiceMode: false,
    opponentShotPhase: options.opponentShotPhase,
    opponentPlacePhase: options.opponentPlacePhase,
    presentationExecutorBusy: options.presentationExecutorBusy,
    pendingOpponentShotReplay: pendingShot || pendingPlace,
  });
}

/** Hide newest feed rows until opponent shot/place presentation finishes (incl. queued + pending replay). */
export function shouldDeferBilliardsPlayerTurnFeed(options: {
  practiceMode: boolean;
  opponentShotPhase: 'idle' | 'queued' | 'aim_pull' | 'rolling';
  opponentPlacePhase: 'idle' | 'animating';
  /** Presentation pipeline draining a queued opponent job. */
  presentationExecutorBusy?: boolean;
  /** Server sent an opponent stroke the client has not finished presenting. */
  pendingOpponentShotReplay?: boolean;
}): boolean {
  if (options.practiceMode) {
    return false;
  }
  if (options.pendingOpponentShotReplay) {
    return true;
  }
  if (options.presentationExecutorBusy) {
    return true;
  }
  return (
    options.opponentShotPhase === 'queued' ||
    options.opponentShotPhase === 'aim_pull' ||
    options.opponentShotPhase === 'rolling' ||
    options.opponentPlacePhase === 'animating'
  );
}

/** Raw history growth since baseline (includes human strokes — do not use alone for feed slice). */
export function countBilliardsTurnsHiddenDuringPresentation(
  authoritative: BilliardsMatchState,
  baseline: BilliardsMatchState | null,
): number {
  if (!baseline) {
    return 0;
  }
  return Math.max(0, authoritative.turnHistory.length - baseline.turnHistory.length);
}

/** Opponent-authored history rows since baseline (human pockets stay visible during replay defer). */
export function countOpponentTurnsHiddenSinceBaseline(
  authoritative: BilliardsMatchState,
  baseline: BilliardsMatchState | null,
  yourSeat: number,
): number {
  const start = baseline?.turnHistory.length ?? 0;
  let count = 0;
  for (let i = start; i < authoritative.turnHistory.length; i++) {
    if (authoritative.turnHistory[i]?.seat !== yourSeat) {
      count++;
    }
  }
  return count;
}

/** Baseline opponent delta, or one opponent row when baseline has not caught up yet. */
export function billiardsOpponentTurnsHiddenForFeed(
  authoritative: BilliardsMatchState,
  baseline: BilliardsMatchState | null,
  yourSeat: number,
): number {
  if (!baseline) {
    const last = authoritative.turnHistory.at(-1);
    if (last && last.seat !== yourSeat) {
      return 1;
    }
    return 0;
  }
  const fromBaseline = countOpponentTurnsHiddenSinceBaseline(authoritative, baseline, yourSeat);
  if (fromBaseline > 0) {
    return fromBaseline;
  }
  const last = authoritative.turnHistory.at(-1);
  if (last && last.seat !== yourSeat) {
    return 1;
  }
  return 0;
}

/** Trailing opponent rows in the already-filtered player-turns feed. */
export function countHiddenOpponentTailPlayerTurns(
  turns: readonly { seat: number }[],
  yourSeat: number,
): number {
  const oppSeat = yourSeat === 1 ? 2 : 1;
  let hidden = 0;
  for (let i = turns.length - 1; i >= 0; i--) {
    if (turns[i]?.seat === oppSeat) {
      hidden++;
    } else {
      break;
    }
  }
  return hidden;
}

/**
 * While opponent presentation is deferring the feed, hide only unpresented opponent
 * strokes at the tail — never human moves.
 */
export function playerTurnFeedRowsToHideDuringDefer(
  turns: readonly { seat: number }[],
  yourSeat: number,
  options: { pendingOpponentPresentation: boolean },
): number {
  if (!options.pendingOpponentPresentation) {
    return 0;
  }
  const tailOpponent = countHiddenOpponentTailPlayerTurns(turns, yourSeat);
  return tailOpponent > 0 ? Math.min(tailOpponent, 1) : 0;
}

export function slicePlayerTurnsForPresentation<T>(
  turns: readonly T[],
  hiddenTailCount: number,
): T[] {
  if (hiddenTailCount <= 0 || turns.length === 0) {
    return [...turns];
  }
  const visible = Math.max(0, turns.length - hiddenTailCount);
  return turns.slice(0, visible);
}
