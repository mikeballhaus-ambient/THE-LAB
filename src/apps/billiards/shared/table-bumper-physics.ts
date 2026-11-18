import {
  BALL_RADIUS,
  TABLE_BUMPER_BAND_INSET_TOWARD_CENTER,
  TABLE_BUMPER_NOSE,
  TABLE_HEIGHT,
  TABLE_RAIL_INSET,
  TABLE_WIDTH,
} from './billiards-types';
import { leftRailOutwardShift, rightRailOutwardShift } from './table-rail-bumpers';
import { tablePocketVisuals } from './table-pocket-visual';

/** Cushion collider thickness (half of segment height in table units). */
export const CUSHION_WALL_HALF = 2;
/**
 * Rapier cushion cuboid half-extent along the inward normal (table XZ). The body is shifted outward by this
 * amount so the **inboard face sits exactly on the cushion line** — the line is the playing surface, and this
 * value only decides how thick the rubber behind it is.
 *
 * Kept thin (1) so the collider reads as the drawn line in the debug overlay rather than a fat slab. It was
 * 5, which drew chunky boxes that visibly disagreed with the cushion art and, worse, made the pocket throat
 * gap unstable because every collider extended 5 units into the mouth.
 */
export const CUSHION_COLLIDER_HALF_THICK = 1;

/**
 * Extra reach into the drawn rubber (table units). Collider boxes align with the SVG nose;
 * a small positive value lets centers sit slightly deeper into the cushion band.
 */
export const CUSHION_FACE_TOWARD_CLOTH = 1.75;

/**
 * Inner cloth rectangle (same as `BilliardsTableChrome` / `table-rail-bumpers.ts`).
 */
export function tableClothRect(): { x: number; y: number; w: number; h: number; right: number; bottom: number } {
  const x = TABLE_RAIL_INSET;
  const y = TABLE_RAIL_INSET;
  const w = TABLE_WIDTH - TABLE_RAIL_INSET * 2;
  const h = TABLE_HEIGHT - TABLE_RAIL_INSET * 2;
  return { x, y, w, h, right: x + w, bottom: y + h };
}

/** Bumper nose polylines in table coordinates (contact surface on the cloth side). */
export function tableBumperNoseLines(): { top: number; bottom: number; left: number; right: number } {
  const cloth = tableClothRect();
  const inb = TABLE_BUMPER_BAND_INSET_TOWARD_CENTER;
  const pockets = tablePocketVisuals();
  const leftRaw = cloth.x + TABLE_BUMPER_NOSE + inb;
  const rightRaw = cloth.right - TABLE_BUMPER_NOSE - inb;
  const sideOutL = leftRailOutwardShift(pockets, leftRaw);
  const sideOutR = rightRailOutwardShift(pockets, rightRaw);
  return {
    top: cloth.y + TABLE_BUMPER_NOSE + inb,
    bottom: cloth.bottom - TABLE_BUMPER_NOSE - inb,
    left: leftRaw - sideOutL,
    right: rightRaw + sideOutR,
  };
}

/**
 * Ball-center limits when the ball rests on the bumper nose (edge on nose, center one radius inward on cloth).
 */
export function tableBallCenterOnNoseLimits(): {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
} {
  const nose = tableBumperNoseLines();
  const r = BALL_RADIUS;
  const inset = CUSHION_FACE_TOWARD_CLOTH;
  return {
    minX: nose.left + inset + r,
    maxX: nose.right - inset - r,
    minY: nose.top + inset + r,
    maxY: nose.bottom - inset - r,
  };
}

/**
 * Axis-aligned reference lines for ball-centre limits when **resting** on cushions (nose + inset toward cloth).
 * Rapier/debug cushion segments use `tableRailBumperNoseStrips()` plus `tableRailBumperJawStrips()` in
 * `table-cushion-wall-segments.ts` so colliders align with nose lines + outer→nose jaw chamfers (straight ~45°).
 */
export function cushionWallContactCenters(): { topY: number; bottomY: number; leftX: number; rightX: number } {
  const nose = tableBumperNoseLines();
  const h = CUSHION_WALL_HALF;
  const inset = CUSHION_FACE_TOWARD_CLOTH;
  const topFace = nose.top + inset;
  const bottomFace = nose.bottom - inset;
  const leftFace = nose.left + inset;
  const rightFace = nose.right - inset;
  return {
    topY: topFace - h,
    bottomY: bottomFace + h,
    leftX: leftFace - h,
    rightX: rightFace + h,
  };
}
