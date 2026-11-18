import type { BilliardsBall, BilliardsMatchState, BilliardsShotPayload } from './billiards-types';
import { runRapierShotToCompletion } from './billiards-rapier-sim';

export interface ShotSimResult {
  balls: BilliardsBall[];
  cueScratch: boolean;
  firstHitNumber: number | null;
  pocketedNumbers: number[];
  powerUsed: number;
  /** First object contact before cue center crossed `HEAD_STRING_Y` (kitchen shot). */
  kitchenHeadStringFoul?: boolean;
}

export function simulateShot(
  state: BilliardsMatchState,
  shot: BilliardsShotPayload,
): ShotSimResult {
  return runRapierShotToCompletion(state, shot);
}

export type { RapierShotSession } from './billiards-rapier-sim';
export {
  buildShotResultFromSession,
  createRapierShotSession,
  destroyRapierShotSession,
  isRapierShotAtRest,
  readBilliardsBallPoses,
  readBilliardsBallPositions,
  readBilliardsRollFrame,
  stepRapierShotSession,
  PHYSICS_STEP_MS,
} from './billiards-rapier-sim';
