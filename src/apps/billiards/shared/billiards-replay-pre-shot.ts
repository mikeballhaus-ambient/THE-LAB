import type { BilliardsBall, BilliardsLastShotReplay, BilliardsMatchState } from './billiards-types';
import { OPEN_BILLIARDS_SEAT_GROUPS } from './billiards-types';

function cloneBalls(balls: BilliardsBall[]): BilliardsBall[] {
  return balls.map((b) => ({ ...b }));
}

export function matchStateFromPreShotBalls(
  authoritative: BilliardsMatchState,
  preShotBalls: BilliardsBall[],
  shotsTakenBeforeShot: number,
): BilliardsMatchState {
  return {
    ...authoritative,
    phase: 'aim',
    balls: cloneBalls(preShotBalls),
    shotsTaken: shotsTakenBeforeShot,
    lastShotReplay: null,
    lastCuePlaceReplay: null,
    resultMessage: null,
    winnerSeat: null,
    ballInHand: false,
    ballInHandSeat: null,
    seatGroups: authoritative.seatGroups ?? { ...OPEN_BILLIARDS_SEAT_GROUPS },
  };
}

/**
 * Pre-shot layout for opponent replay: server `preShotBalls`, then optional human-preview
 * `baseline`, else unavailable.
 */
export function resolveOpponentReplayPreShot(
  baseline: BilliardsMatchState | null,
  authoritative: BilliardsMatchState,
  replay: BilliardsLastShotReplay | null | undefined,
): BilliardsMatchState | null {
  if (replay?.preShotBalls?.length) {
    const shotsBefore =
      replay.shotsTaken > 0 ? replay.shotsTaken - 1 : authoritative.shotsTaken;
    return matchStateFromPreShotBalls(authoritative, replay.preShotBalls, shotsBefore);
  }
  if (baseline) {
    return baseline;
  }
  return null;
}
