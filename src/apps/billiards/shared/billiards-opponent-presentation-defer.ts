import { isBilliardsPendingOpponentShotReplay } from './billiards-opponent-replay-sync';
import type { BilliardsMatchState } from './billiards-types';

export type BilliardsOpponentShotPresentationPhase = 'idle' | 'queued' | 'aim_pull' | 'rolling';
export type BilliardsOpponentPlacePresentationPhase = 'idle' | 'animating';

/** Stable id for “client has finished showing this opponent shot replay”. */
export function billiardsOpponentShotPresentationKey(
  state: BilliardsMatchState,
  yourSeat: number,
): string | null {
  const replay = state.lastShotReplay;
  if (!replay || replay.seat === yourSeat || replay.shotsTaken !== state.shotsTaken) {
    return null;
  }
  return `shot:${replay.shotsTaken}`;
}

export function billiardsOpponentCuePlacePresentationKey(
  state: BilliardsMatchState,
  yourSeat: number,
): string | null {
  const replay = state.lastCuePlaceReplay;
  if (!replay || replay.seat === yourSeat || replay.historyIndex !== state.turnHistory.length) {
    return null;
  }
  return `place:${replay.historyIndex}`;
}

export function billiardsOpponentPresentationKey(
  state: BilliardsMatchState,
  yourSeat: number,
): string | null {
  return (
    billiardsOpponentShotPresentationKey(state, yourSeat) ??
    billiardsOpponentCuePlacePresentationKey(state, yourSeat)
  );
}

export function billiardsShouldDeferBanterForPresentation(
  state: BilliardsMatchState,
  yourSeat: number,
  presentedKeys: ReadonlySet<string>,
): boolean {
  const key = billiardsOpponentPresentationKey(state, yourSeat);
  return key != null && !presentedKeys.has(key);
}

/** Live match state + consumption markers — do not read stale presentation-store authoritative only. */
export function shouldDeferBilliardsResultModal(input: {
  practiceMode: boolean;
  yourSeat: number;
  state: BilliardsMatchState;
  lastConsumedShotReplay: number;
  lastConsumedCuePlaceIndex: number;
  presentedKeys: ReadonlySet<string>;
  opponentShotPhase: BilliardsOpponentShotPresentationPhase;
  opponentPlacePhase: BilliardsOpponentPlacePresentationPhase;
  presentationExecutorBusy: boolean;
  shotInteractionBusy: boolean;
  opponentPresentationBusy: boolean;
}): boolean {
  if (input.practiceMode) {
    return false;
  }
  if (
    input.shotInteractionBusy ||
    input.opponentPresentationBusy ||
    input.presentationExecutorBusy
  ) {
    return true;
  }
  if (input.opponentShotPhase === 'queued' || input.opponentPlacePhase === 'animating') {
    return true;
  }
  if (
    isBilliardsPendingOpponentShotReplay({
      practiceMode: false,
      yourSeat: input.yourSeat,
      state: input.state,
      lastConsumedReplayShots: input.lastConsumedShotReplay,
      opponentReplayBusy: false,
      isRolling: false,
    })
  ) {
    return true;
  }
  const placeReplay = input.state.lastCuePlaceReplay;
  if (
    placeReplay &&
    placeReplay.seat !== input.yourSeat &&
    placeReplay.historyIndex === input.state.turnHistory.length &&
    placeReplay.historyIndex !== input.lastConsumedCuePlaceIndex
  ) {
    return true;
  }
  return billiardsShouldDeferBanterForPresentation(
    input.state,
    input.yourSeat,
    input.presentedKeys,
  );
}
