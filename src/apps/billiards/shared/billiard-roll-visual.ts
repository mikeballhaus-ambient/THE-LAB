import { BALL_RADIUS } from './billiards-types';

/** Convert table-unit travel distance to roll angle (degrees) for 2D rolling without slip. */
export function billiardRollDegreesFromTableDistance(tableUnits: number): number {
  if (tableUnits <= 0) {
    return 0;
  }
  return (tableUnits / BALL_RADIUS) * (180 / Math.PI);
}

/**
 * Pocket-return tray: horizontal travel in **pixels** with ball radius in **pixels**.
 * Same no-slip relation as the table (`arc / radius`), without table-unit coupling.
 *
 * Positive `deltaPx` = centre moves toward the **closed (right)** end of the tray. Pair that
 * with **positive** `rotateZ` on the ball chrome so the shell rolls the same way as a real
 * ball viewed from above (CSS: positive Z = clockwise on screen).
 */
export function billiardTrayRollDegreesFromDeltaPx(deltaPx: number, ballRadiusPx: number): number {
  if (!(ballRadiusPx > 0) || deltaPx === 0) {
    return 0;
  }
  return (deltaPx / ballRadiusPx) * (180 / Math.PI);
}
