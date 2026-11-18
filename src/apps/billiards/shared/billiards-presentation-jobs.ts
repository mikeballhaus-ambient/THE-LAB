import type {
  BilliardsBall,
  BilliardsLastCuePlaceReplay,
  BilliardsLastShotReplay,
  BilliardsMatchState,
} from './billiards-types';
import {
  billiardsOpponentCuePlacePresentationKey,
  billiardsOpponentShotPresentationKey,
} from './billiards-opponent-presentation-defer';

export type BilliardsPresentationJob =
  | {
      kind: 'shot';
      key: string;
      preShotBalls: BilliardsBall[];
      replay: BilliardsLastShotReplay;
    }
  | {
      kind: 'place';
      key: string;
      prePlaceBalls: BilliardsBall[];
      replay: BilliardsLastCuePlaceReplay;
    };

export interface BilliardsSkippedOpponentPresentation {
  summary: string;
  ackedKeys: string[];
  lastConsumedShotReplay: number;
}

/** Opponent stroke keys strictly between last consumed and the incoming replay (exclusive of incoming). */
export function computeSkippedOpponentShots(
  yourSeat: number,
  lastConsumedShotReplay: number,
  _previousPending: BilliardsMatchState,
  incoming: BilliardsMatchState,
): BilliardsSkippedOpponentPresentation | null {
  const incomingReplay = incoming.lastShotReplay;
  if (!incomingReplay || incomingReplay.seat === yourSeat) {
    return null;
  }
  const fromShotsTaken = lastConsumedShotReplay + 1;
  const toShotsTaken = incomingReplay.shotsTaken - 1;
  if (toShotsTaken < fromShotsTaken) {
    return null;
  }
  const ackedKeys: string[] = [];
  for (let shotsTaken = fromShotsTaken; shotsTaken <= toShotsTaken; shotsTaken += 1) {
    ackedKeys.push(`shot:${shotsTaken}`);
  }
  const count = toShotsTaken - fromShotsTaken + 1;
  const summary =
    count === 1
      ? 'Opponent stroke (summarized)'
      : `Opponent — ${count} strokes (summarized)`;
  return {
    summary,
    ackedKeys,
    lastConsumedShotReplay: toShotsTaken,
  };
}

export function shotPresentationJobFromState(
  authoritative: BilliardsMatchState,
  yourSeat: number,
  preShot: BilliardsMatchState | null,
  replay: BilliardsLastShotReplay | null,
): BilliardsPresentationJob | null {
  if (!preShot || !replay) {
    return null;
  }
  const key = billiardsOpponentShotPresentationKey(authoritative, yourSeat);
  if (!key) {
    return null;
  }
  return {
    kind: 'shot',
    key,
    preShotBalls: preShot.balls,
    replay,
  };
}

export function placePresentationJobFromState(
  authoritative: BilliardsMatchState,
  yourSeat: number,
): BilliardsPresentationJob | null {
  const replay = authoritative.lastCuePlaceReplay;
  if (!replay || replay.seat === yourSeat) {
    return null;
  }
  const key = billiardsOpponentCuePlacePresentationKey(authoritative, yourSeat);
  if (!key) {
    return null;
  }
  if (replay.prePlaceBalls?.length) {
    return {
      kind: 'place',
      key,
      prePlaceBalls: replay.prePlaceBalls,
      replay,
    };
  }
  return null;
}
