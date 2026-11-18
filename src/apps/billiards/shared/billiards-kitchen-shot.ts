import { findFirstContactAlongRay } from './billiard-shot-hint-paths';
import type { BilliardsBall, BilliardsMatchState } from './billiards-types';
import { HEAD_STRING_Y } from './billiards-types';

const RAY_EPS = 1e-4;

/** Cue center is on the shooting side of the table (past the head string). */
export function isCueCenterPastHeadString(y: number): boolean {
  return y > HEAD_STRING_Y;
}

/** Cue-center travel along the aim ray until `y > HEAD_STRING_Y`. `null` if the ray never crosses. */
export function cueCenterTravelToCrossHeadString(
  cue: { x: number; y: number },
  angleRad: number,
): number | null {
  if (isCueCenterPastHeadString(cue.y)) {
    return 0;
  }
  const dy = Math.sin(angleRad);
  if (dy <= RAY_EPS) {
    return null;
  }
  const t = (HEAD_STRING_Y - cue.y) / dy;
  return t > RAY_EPS ? t : null;
}

type AimBall = Pick<BilliardsBall, 'id' | 'number' | 'x' | 'y' | 'pocketed'>;

/**
 * Aim preview: first object-ball contact would occur before the cue center crosses the head string.
 */
export function isKitchenAimHeadStringFoul(
  state: BilliardsMatchState,
  cue: { x: number; y: number },
  angleRad: number,
  balls: readonly AimBall[],
): boolean {
  if (!shotRequiresKitchenHeadStringCross(state)) {
    return false;
  }
  const first = findFirstContactAlongRay(cue, angleRad, balls);
  if (!first || first.kind !== 'ball') {
    return false;
  }
  const tCross = cueCenterTravelToCrossHeadString(cue, angleRad);
  if (tCross == null) {
    return true;
  }
  if (tCross <= RAY_EPS) {
    return false;
  }
  return first.t + RAY_EPS < tCross;
}

/** First object ball along aim when a kitchen head-string foul is predicted. */
export function kitchenAimFoulTargetBall(
  state: BilliardsMatchState,
  cue: { x: number; y: number },
  angleRad: number,
  balls: readonly AimBall[],
): Pick<BilliardsBall, 'id' | 'number' | 'x' | 'y'> | null {
  if (!isKitchenAimHeadStringFoul(state, cue, angleRad, balls)) {
    return null;
  }
  const first = findFirstContactAlongRay(cue, angleRad, balls);
  if (!first || first.kind !== 'ball' || !first.ball) {
    return null;
  }
  return first.ball;
}

/**
 * Kitchen ball-in-hand: the shot after placing in the kitchen must cross the head string before
 * first object contact. A cue that merely *stopped* in the kitchen on a prior legal table shot
 * does not re-trigger this rule (`placementZone` is reset to `table` after a legal stroke).
 */
export function shotRequiresKitchenHeadStringCross(state: BilliardsMatchState): boolean {
  return state.placementZone === 'kitchen';
}
