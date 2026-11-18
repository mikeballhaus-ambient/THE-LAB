import { BALL_RADIUS, TABLE_POCKET_CENTERS } from './billiards-types';
import { tableBallCenterOnNoseLimits } from './table-bumper-physics';
import { tablePocketVisuals } from './table-pocket-visual';

/** Reserved — limits are derived exactly from bumper nose geometry. */
const CUSHION_CONTACT_SLOP = 0;

/** Ball-center limit when the ball rests on the visible bumper nose. */
export function tableCushionMinX(): number {
  return tableBallCenterOnNoseLimits().minX - CUSHION_CONTACT_SLOP;
}

export function tableCushionMaxX(): number {
  return tableBallCenterOnNoseLimits().maxX + CUSHION_CONTACT_SLOP;
}

export function tableCushionMinY(): number {
  return tableBallCenterOnNoseLimits().minY - CUSHION_CONTACT_SLOP;
}

export function tableCushionMaxY(): number {
  return tableBallCenterOnNoseLimits().maxY + CUSHION_CONTACT_SLOP;
}

function pocketMouthReachForCenter(px: number, py: number): number {
  const visuals = tablePocketVisuals();
  const pocket = visuals.find((p) => p.simX === px && p.simY === py);
  const mouthR = pocket?.r ?? BALL_RADIUS + 8;
  return mouthR + BALL_RADIUS * 0.82;
}

/** Near a pocket opening — skip cushion reflection so the ball can drop. */
export function isInPocketMouth(x: number, y: number): boolean {
  for (const pocket of TABLE_POCKET_CENTERS) {
    const reach = pocketMouthReachForCenter(pocket.x, pocket.y);
    if (Math.hypot(x - pocket.x, y - pocket.y) <= reach) {
      return true;
    }
  }
  return false;
}

/** Outer lip — ball center entered the visual pocket; start sink toward center. */
export function pocketSinkZoneRadius(): number {
  const mouths = tablePocketVisuals().map((p) => p.r);
  const maxMouth = Math.max(...mouths, BALL_RADIUS + 8);
  return maxMouth + BALL_RADIUS * 0.08;
}

export function pocketSinkZoneRadiusAt(px: number, py: number): number {
  const pocket = tablePocketVisuals().find((p) => p.simX === px && p.simY === py);
  const mouthR = pocket?.r ?? BALL_RADIUS + 8;
  return mouthR + BALL_RADIUS * 0.08;
}

export function pocketMouthRadiusAt(px: number, py: number): number {
  const pocket = tablePocketVisuals().find((p) => p.simX === px && p.simY === py);
  return pocket?.r ?? BALL_RADIUS * 2;
}

/**
 * Fast shots can cross the lip in one or two steps — half-mouth capture alone lets jaw
 * bounces spit them out. Commit when the centre is inside the mouth and still driving in.
 */
export function shouldCommitFastPocketCapture(
  dist: number,
  mouthR: number,
  captureR: number,
  inwardSpeed: number,
  planarSpeed: number,
): boolean {
  if (dist <= captureR) {
    return true;
  }
  if (inwardSpeed < 90 || planarSpeed < 1) {
    return false;
  }
  if (inwardSpeed < planarSpeed * 0.28) {
    return false;
  }
  return dist <= mouthR * 0.9;
}

/** Inner capture — ball center this close to pocket center counts as pocketed. */
export function pocketCaptureCenterRadius(): number {
  return BALL_RADIUS * 0.42;
}

/**
 * Radius at which a ball is considered pocketed: the pocket **mouth**.
 *
 * This must be at least as large as the closest a ball centre can physically get to the
 * pocket centre, or the pocket is unreachable and balls can never drop.
 *
 * The cushion colliders stop a ball centre at `tableCushionMinX/MinY` (51.75). Against a
 * corner pocket centred at (36, 36) the closest achievable distance is therefore
 * `hypot(51.75-36, 51.75-36) ≈ 22.3`, and against a side pocket at (500, 32) it is
 * `51.75 - 32 ≈ 19.75`.
 *
 * The previous formula (`mouthR - BALL_RADIUS * 0.55`) yielded 15.6 / 12.6 — *smaller than
 * the closest reachable distance for every pocket on the table*, so nothing could ever be
 * pocketed. Capturing at the mouth radius is both reachable and physically sensible: once
 * the ball's centre is inside the mouth circle it is over the hole.
 */
export function pocketCaptureCenterRadiusAt(px: number, py: number): number {
  const pocket = tablePocketVisuals().find((p) => p.simX === px && p.simY === py);
  const mouthR = pocket?.r ?? BALL_RADIUS + 8;

  /**
   * Capture at roughly half the mouth radius.
   *
   * The earlier version of this function carried a `BALL_RADIUS * 1.4 = 23.8` floor, added
   * because balls could not physically reach the pockets. That floor was a symptom pushed
   * downstream: the *real* fault was the cushion throat being narrower than the ball, so a
   * ball was being captured the instant it grazed the jaw — it would vanish while still
   * visibly outside the hole, which is what made pockets feel wrong.
   *
   * With cushion segments aligned to bumper nose chords (`table-rail-bumpers`), a
   * ball can travel to a centre distance of ~3.95 (side) / ~21.74 (corner). Capturing at
   * half the mouth means it must be properly inside the pocket before dropping:
   *
   *   corner: 25 * 0.5 = 12.5   mouth is 25, so ~half-way in
   *   side:   23 * 0.5 = 11.5   mouth is 23, so ~half-way in
   */
  return mouthR * 0.5;
}

/**
 * Ball centre in the **throat**: inside the sink lip but not yet past capture.
 * Used to avoid treating the throat like “full cloth” for the hard `FELT_STOP_SPEED` snap.
 */
export function isBallCenterInPocketThroat(x: number, y: number): boolean {
  for (const p of TABLE_POCKET_CENTERS) {
    const dist = Math.hypot(x - p.x, y - p.y);
    const sinkR = pocketSinkZoneRadiusAt(p.x, p.y);
    if (dist > sinkR) {
      continue;
    }
    const captureR = pocketCaptureCenterRadiusAt(p.x, p.y);
    if (dist > captureR) {
      return true;
    }
  }
  return false;
}

/** Keep ball centers inside the playfield unless entering a pocket throat. */
export function clampBallCenterToPlayfield(x: number, y: number): { x: number; y: number } {
  if (isInPocketMouth(x, y)) {
    return { x, y };
  }

  const px = Math.max(tableCushionMinX(), Math.min(tableCushionMaxX(), x));
  const py = Math.max(tableCushionMinY(), Math.min(tableCushionMaxY(), y));

  return { x: px, y: py };
}

export function clampBallCenterToCushions(x: number, y: number): { x: number; y: number } {
  return clampBallCenterToPlayfield(x, y);
}

export function isBallCenterInPlayfield(x: number, y: number): boolean {
  const c = clampBallCenterToPlayfield(x, y);
  return Math.abs(c.x - x) < 0.01 && Math.abs(c.y - y) < 0.01;
}
