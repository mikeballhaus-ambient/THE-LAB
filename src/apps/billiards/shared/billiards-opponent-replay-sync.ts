import type { BilliardsMatchState } from './billiards-types';
import {
  billiardsOpponentShotPresentationKey,
} from './billiards-opponent-presentation-defer';

/** Server sent an opponent shot the client has not finished presenting. */
export function isBilliardsPendingOpponentShotReplay(options: {
  practiceMode: boolean;
  yourSeat: number;
  state: BilliardsMatchState;
  lastConsumedReplayShots: number;
  opponentReplayBusy: boolean;
  isRolling: boolean;
}): boolean {
  if (options.practiceMode || options.opponentReplayBusy || options.isRolling) {
    return false;
  }
  const replay = options.state.lastShotReplay;
  if (!replay || replay.seat === options.yourSeat) {
    return false;
  }
  if (replay.shotsTaken !== options.state.shotsTaken) {
    return false;
  }
  if (replay.shotsTaken === options.lastConsumedReplayShots) {
    return false;
  }
  return billiardsOpponentShotPresentationKey(options.state, options.yourSeat) != null;
}

export function shouldBilliardsReplayOpponentShot(options: {
  practiceMode: boolean;
  yourSeat: number;
  state: BilliardsMatchState;
  preShot: BilliardsMatchState | null;
  lastConsumedReplayShots: number;
  opponentReplayBusy: boolean;
  opponentPlacementBusy: boolean;
  isRolling: boolean;
}): boolean {
  if (!isBilliardsPendingOpponentShotReplay(options)) {
    return false;
  }
  if (!options.preShot) {
    return false;
  }
  if (options.opponentReplayBusy || options.opponentPlacementBusy || options.isRolling) {
    return false;
  }
  return true;
}

