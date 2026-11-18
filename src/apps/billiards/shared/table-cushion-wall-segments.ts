/**
 * Cushion colliders, as **lines between points**.
 *
 * Rapier gets one narrow cuboid per line, and because each collider is shifted outward by its own
 * half-thickness the **inboard face sits exactly on the line** — so the points below are the real playing
 * surface, and the collider thickness only affects how thick the debug overlay looks.
 *
 * Each rail is a 4-point polyline: **angled stub → straight run → angled stub**.
 *
 * The visual bumpers are extruded from these same points (`tableRailBumperBands`), so the art and the
 * physics can never drift apart.
 *
 * The stub angles are mirrored about each corner diagonal: a top rail's stub and its side rail's stub add
 * up to 90°, so the two jaws of a pocket open symmetrically. Each straight run is then carried as close to
 * its pocket as the stub allows.
 *
 * Coordinates are table space: `x` across 0…1000, `y` down 0…500.
 */

import { TABLE_BUMPER_POCKET_CUT_PAD } from './billiards-types';
import { tablePocketVisuals } from './table-pocket-visual';

export type CushionWallSegmentRole = 'rail' | 'jaw';

export interface CushionWallSegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  /** `rail` for the straight run, `jaw` for an angled end toward a pocket. */
  role?: CushionWallSegmentRole;
}

export type CushionPoint = readonly [x: number, y: number];

/**
 * Every cushion polyline — **consecutive points become one collider each**.
 *
 * Order: left rail, right rail, then the four corner-to-middle halves (top-left, top-right, bottom-left,
 * bottom-right).
 */
export const CUSHION_POLYLINES: ReadonlyArray<ReadonlyArray<CushionPoint>> = [
  /*
   * Left/right rails. Stub tips must clear the **pocket mask**, not just the mouth radius: the bumper art is
   * masked by circles of `p.r + TABLE_BUMPER_POCKET_CUT_PAD` (29 at a corner). A tip inside that circle has
   * its rubber cut away while the collider line still draws, so it reads as a bare spike poking out of the
   * cushion. These tips sit at 30.4 from the pocket centre — 1.4 clear of the mask.
   */
  [
    [27.2, 62.2],
    [36.2, 72.6],
    [36.2, 427.4],
    [27.2, 437.8],
  ],
  [
    [972.8, 62.2],
    [963.8, 72.6],
    [963.8, 427.4],
    [972.8, 437.8],
  ],
  /*
   * Every stub on the table uses the side rails' shape: **9.1 along the rail, 7.6 off the nose** (11.9 long).
   * Keeping one edge length everywhere is what makes the four rails read as the same cushion; letting the
   * corner stubs stretch to reach the mouth made them noticeably longer than the side ones.
   */
  /* Top rail, left half — TL pocket to the middle pocket. */
  [
    [63.5, 30.4],
    [72.6, 38],
    [463.6, 38],
    [472.7, 30.4],
  ],
  /* Top rail, right half — middle pocket to the TR pocket. */
  [
    [527.3, 30.4],
    [536.4, 38],
    [927.4, 38],
    [936.5, 30.4],
  ],
  /* Bottom rail, left half — exact mirror of the top-left in y. */
  [
    [63.5, 469.6],
    [72.6, 462],
    [463.6, 462],
    [472.7, 469.6],
  ],
  /* Bottom rail, right half. */
  [
    [527.3, 469.6],
    [536.4, 462],
    [927.4, 462],
    [936.5, 469.6],
  ],
];

/**
 * Trim a segment so it stops at the pocket **mask** circle rather than running inside it.
 *
 * The bumper art is rendered through a mask of `p.r + TABLE_BUMPER_POCKET_CUT_PAD` around every pocket, so
 * rubber does not paint into the hole. The collider has no such mask, which meant any stub tip a unit or
 * two inside that circle drew a bare line where the rubber had been cut away — the spike at each pocket.
 * Trimming the collider to the same circle makes the two agree exactly: what you see is what collides.
 */
function clipSegmentToPocketMask(
  a: CushionPoint,
  b: CushionPoint,
  pockets: ReturnType<typeof tablePocketVisuals>,
): Array<{ a: CushionPoint; b: CushionPoint }> {
  let pieces: Array<{ a: CushionPoint; b: CushionPoint }> = [{ a, b }];
  for (const p of pockets) {
    const R = p.r + TABLE_BUMPER_POCKET_CUT_PAD;
    const next: typeof pieces = [];
    for (const piece of pieces) {
      const dx = piece.b[0] - piece.a[0];
      const dy = piece.b[1] - piece.a[1];
      const fx = piece.a[0] - p.cx;
      const fy = piece.a[1] - p.cy;
      const A = dx * dx + dy * dy;
      const B = 2 * (fx * dx + fy * dy);
      const C = fx * fx + fy * fy - R * R;
      const disc = B * B - 4 * A * C;
      if (A < 1e-12 || disc < 0) {
        /** No intersection — keep the piece only if it is entirely outside the circle. */
        const mid = { x: piece.a[0] + dx / 2, y: piece.a[1] + dy / 2 };
        if (Math.hypot(mid.x - p.cx, mid.y - p.cy) >= R) {
          next.push(piece);
        }
        continue;
      }
      const s = Math.sqrt(disc);
      const t0 = (-B - s) / (2 * A);
      const t1 = (-B + s) / (2 * A);
      const cuts = [0, 1, ...(t0 > 0 && t0 < 1 ? [t0] : []), ...(t1 > 0 && t1 < 1 ? [t1] : [])].sort(
        (u, v) => u - v,
      );
      for (let k = 0; k < cuts.length - 1; k += 1) {
        const ta = cuts[k]!;
        const tb = cuts[k + 1]!;
        if (tb - ta < 1e-9) {
          continue;
        }
        const tm = (ta + tb) / 2;
        if (Math.hypot(piece.a[0] + dx * tm - p.cx, piece.a[1] + dy * tm - p.cy) < R) {
          continue;
        }
        next.push({
          a: [piece.a[0] + dx * ta, piece.a[1] + dy * ta],
          b: [piece.a[0] + dx * tb, piece.a[1] + dy * tb],
        });
      }
    }
    pieces = next;
  }
  return pieces.filter((s) => Math.hypot(s.b[0] - s.a[0], s.b[1] - s.a[1]) >= 0.35);
}

/**
 * Cushion wall segments for Rapier — one cuboid per consecutive pair in `CUSHION_POLYLINES`, trimmed to the
 * pocket mask so the collision surface stops exactly where the visible rubber stops.
 *
 * Built by `billiards-rapier-cushions`; the collider debug overlay draws those boxes.
 */
export function buildCushionWallSegments(): CushionWallSegment[] {
  const pockets = tablePocketVisuals();
  const out: CushionWallSegment[] = [];
  for (const polyline of CUSHION_POLYLINES) {
    for (let i = 0; i < polyline.length - 1; i += 1) {
      const a = polyline[i]!;
      const b = polyline[i + 1]!;
      if (Math.hypot(b[0] - a[0], b[1] - a[1]) < 1e-3) {
        continue;
      }
      /** An angled end changes both coordinates materially. */
      const dx = Math.abs(b[0] - a[0]);
      const dy = Math.abs(b[1] - a[1]);
      const angled = Math.min(dx, dy) > Math.max(dx, dy) * 0.1;
      for (const piece of clipSegmentToPocketMask(a, b, pockets)) {
        out.push({
          x1: piece.a[0],
          y1: piece.a[1],
          x2: piece.b[0],
          y2: piece.b[1],
          role: angled ? 'jaw' : 'rail',
        });
      }
    }
  }
  return out;
}
