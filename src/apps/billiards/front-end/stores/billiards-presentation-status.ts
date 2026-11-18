import type { BilliardsPresentationModel } from './billiardsPresentation';
import type { BilliardsOpponentShotPresentationPhase } from './billiardsPresentation';

export type BilliardsPresentationStatus =
  | 'idle'
  | 'awaitingServerAck'
  | 'queued'
  | 'aiming'
  | 'rolling'
  | 'placing'
  | 'presenting'
  | 'stalled';

export interface BilliardsPresentationStatusInput {
  practiceMode: boolean;
  opponentShotPhase: BilliardsOpponentShotPresentationPhase;
  opponentPlacePhase: 'idle' | 'animating';
  awaitingShotAck: boolean;
  isRolling: boolean;
  pendingOpponentShotReplay: boolean;
  presentationExecutorBusy: boolean;
}

export function deriveBilliardsPresentationStatus(
  input: BilliardsPresentationStatusInput,
): BilliardsPresentationStatus {
  if (input.awaitingShotAck) {
    return 'awaitingServerAck';
  }
  if (input.opponentPlacePhase === 'animating') {
    return 'placing';
  }
  if (input.opponentShotPhase === 'aim_pull') {
    return 'aiming';
  }
  if (input.opponentShotPhase === 'rolling' || input.isRolling) {
    return 'rolling';
  }
  if (input.presentationExecutorBusy && input.pendingOpponentShotReplay) {
    return 'presenting';
  }
  if (input.opponentShotPhase === 'queued') {
    return 'queued';
  }
  return 'idle';
}

export function billiardsCanShootFromStatus(status: BilliardsPresentationStatus): boolean {
  return status === 'idle';
}

export function billiardsTableDisabledFromStatus(status: BilliardsPresentationStatus): boolean {
  return status !== 'idle';
}

export function buildPresentationStatusInputFromModel(
  model: BilliardsPresentationModel,
  extras: Pick<BilliardsPresentationStatusInput, 'awaitingShotAck' | 'isRolling' | 'pendingOpponentShotReplay'>,
): BilliardsPresentationStatusInput {
  return {
    practiceMode: model.practiceMode,
    opponentShotPhase: model.opponentShotPhase,
    opponentPlacePhase: model.opponentPlacePhase,
    awaitingShotAck: extras.awaitingShotAck,
    isRolling: extras.isRolling,
    pendingOpponentShotReplay: extras.pendingOpponentShotReplay,
    presentationExecutorBusy: model.presentationExecutorBusy,
  };
}
