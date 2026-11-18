import {
  BALL_RADIUS,
  CUE_POWER_GRIP_MAX_FROM_TIP_PX,
  CUE_POWER_GRIP_MIN_FROM_TIP_PX,
  CUE_VISUAL_LENGTH_PX,
  TABLE_HEIGHT,
  TABLE_WIDTH,
} from './billiards-types';

export function cuePullDirection(angleRad: number): { x: number; y: number } {
  return { x: -Math.cos(angleRad), y: -Math.sin(angleRad) };
}

export function cueTipFromBall(cue: { x: number; y: number }, angleRad: number): { x: number; y: number } {
  const dir = cuePullDirection(angleRad);
  return {
    x: cue.x + dir.x * (BALL_RADIUS + 3),
    y: cue.y + dir.y * (BALL_RADIUS + 3),
  };
}

/** Furthest pull (table px) along the cue before leaving the expanded playfield. */
export function maxCuePullAlongFromTip(
  tip: { x: number; y: number },
  dir: { x: number; y: number },
  marginPx: number = CUE_VISUAL_LENGTH_PX,
): number {
  let tMax = CUE_POWER_GRIP_MAX_FROM_TIP_PX;
  const minX = -marginPx;
  const maxX = TABLE_WIDTH + marginPx;
  const minY = -marginPx;
  const maxY = TABLE_HEIGHT + marginPx;

  if (Math.abs(dir.x) > 1e-6) {
    if (dir.x < 0) {
      tMax = Math.min(tMax, (minX - tip.x) / dir.x);
    } else {
      tMax = Math.min(tMax, (maxX - tip.x) / dir.x);
    }
  }
  if (Math.abs(dir.y) > 1e-6) {
    if (dir.y < 0) {
      tMax = Math.min(tMax, (minY - tip.y) / dir.y);
    } else {
      tMax = Math.min(tMax, (maxY - tip.y) / dir.y);
    }
  }
  return Math.max(CUE_POWER_GRIP_MIN_FROM_TIP_PX + 16, tMax);
}

export function cuePullPowerSpan(
  cue: { x: number; y: number },
  angleRad: number,
): number {
  const tip = cueTipFromBall(cue, angleRad);
  const dir = cuePullDirection(angleRad);
  const maxAlong = Math.min(
    CUE_POWER_GRIP_MAX_FROM_TIP_PX,
    maxCuePullAlongFromTip(tip, dir),
  );
  return Math.max(20, maxAlong - CUE_POWER_GRIP_MIN_FROM_TIP_PX);
}

export function powerGripDistanceFromTip(
  pullPower: number,
  cue: { x: number; y: number },
  angleRad: number,
): number {
  const span = cuePullPowerSpan(cue, angleRad);
  return CUE_POWER_GRIP_MIN_FROM_TIP_PX + pullPower * span;
}

export function powerGripPoint(
  cue: { x: number; y: number },
  angleRad: number,
  pullPower: number,
): { x: number; y: number } {
  const tip = cueTipFromBall(cue, angleRad);
  const dir = cuePullDirection(angleRad);
  const along = powerGripDistanceFromTip(pullPower, cue, angleRad);
  return { x: tip.x + dir.x * along, y: tip.y + dir.y * along };
}

export function pullPowerFromGripPoint(
  point: { x: number; y: number },
  cue: { x: number; y: number },
  angleRad: number,
): number {
  const tip = cueTipFromBall(cue, angleRad);
  const dir = cuePullDirection(angleRad);
  const along = (point.x - tip.x) * dir.x + (point.y - tip.y) * dir.y;
  const span = cuePullPowerSpan(cue, angleRad);
  const power = (along - CUE_POWER_GRIP_MIN_FROM_TIP_PX) / span;
  /** 0% is valid — releasing at minimum pull cancels the shot (see `BilliardsTable.onCuePowerRelease`). */
  return Math.max(0, Math.min(1, power));
}
