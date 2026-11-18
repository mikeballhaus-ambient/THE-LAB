import { TABLE_HEIGHT, TABLE_RAIL_INSET, TABLE_WIDTH } from './billiards-types';
import type { TablePocketVisual } from './table-pocket-visual';

/**
 * Legacy tuning for quadratic jaw helpers (kept for API compatibility). Jaws use **straight**
 * segments (~45° chamfers into corner pockets; polylines on side pockets).
 */
export const POCKET_JAW_CURVE_PULL = 0.58;

/** Quadratic Bézier: one control at chord mid shifted toward pocket — simpler than cubic, smooth jaws. */
export function quadraticControlTowardPocket(
  p0: { x: number; y: number },
  p2: { x: number; y: number },
  cx: number,
  cy: number,
  pull: number = POCKET_JAW_CURVE_PULL,
): { x: number; y: number } {
  const midX = (p0.x + p2.x) / 2;
  const midY = (p0.y + p2.y) / 2;
  return {
    x: midX + (cx - midX) * pull,
    y: midY + (cy - midY) * pull,
  };
}

export function quadraticBezierPoint(
  p0: { x: number; y: number },
  c1: { x: number; y: number },
  p2: { x: number; y: number },
  t: number,
): { x: number; y: number } {
  const omt = 1 - t;
  const a = omt * omt;
  const b = 2 * omt * t;
  const c = t * t;
  return {
    x: a * p0.x + b * c1.x + c * p2.x,
    y: a * p0.y + b * c1.y + c * p2.y,
  };
}

/** Polyline p0→p2 — sample for Rapier jaw segments (fewer points than old cubic, one control each). */
export function sampleQuadraticJawChain(
  p0: { x: number; y: number },
  p2: { x: number; y: number },
  cx: number,
  cy: number,
  steps: number,
  pull: number = POCKET_JAW_CURVE_PULL,
): Array<{ x: number; y: number }> {
  const c1 = quadraticControlTowardPocket(p0, p2, cx, cy, pull);
  const pts: Array<{ x: number; y: number }> = [];
  const n = Math.max(1, steps);
  for (let i = 0; i <= n; i += 1) {
    const t = i / n;
    pts.push(quadraticBezierPoint(p0, c1, p2, t));
  }
  return pts;
}

/**
 * Quadratic control for a jaw curve whose **end** is tangent to the straight **nose rail**
 * (horizontal on top/bottom edges, vertical on left/right). Avoids a sharp kink where the jaw
 * polyline meets the long rail segments — Rapier cuboid chains read smoother at pocket entries.
 *
 * At `t=1`, `B'(1) = 2(p2 - c1)`; matching rail tangent forces `c1.y = p2.y` (horizontal nose) or
 * `c1.x = p2.x` (vertical nose). The free coordinate keeps the chord-mid bias toward the pocket.
 */
export function quadraticControlJawG1TowardPocket(
  p0: { x: number; y: number },
  p2: { x: number; y: number },
  cx: number,
  cy: number,
  tangentAtNoseEnd: 'horizontal' | 'vertical',
  pull: number = POCKET_JAW_CURVE_PULL,
): { x: number; y: number } {
  const midX = (p0.x + p2.x) / 2;
  const midY = (p0.y + p2.y) / 2;
  if (tangentAtNoseEnd === 'horizontal') {
    return {
      x: midX + (cx - midX) * pull,
      y: p2.y,
    };
  }
  return {
    x: p2.x,
    y: midY + (cy - midY) * pull,
  };
}

/** Same as `sampleQuadraticJawChain` but uses `quadraticControlJawG1TowardPocket` for the control point. */
export function sampleQuadraticJawChainG1(
  p0: { x: number; y: number },
  p2: { x: number; y: number },
  cx: number,
  cy: number,
  steps: number,
  tangentAtNoseEnd: 'horizontal' | 'vertical',
  pull: number = POCKET_JAW_CURVE_PULL,
): Array<{ x: number; y: number }> {
  const c1 = quadraticControlJawG1TowardPocket(p0, p2, cx, cy, tangentAtNoseEnd, pull);
  const pts: Array<{ x: number; y: number }> = [];
  const n = Math.max(1, steps);
  for (let i = 0; i <= n; i += 1) {
    const t = i / n;
    pts.push(quadraticBezierPoint(p0, c1, p2, t));
  }
  return pts;
}

const CLOTH = TABLE_RAIL_INSET;

function outsetCornerPoint(
  x: number,
  y: number,
  kind: 'corner-tl' | 'corner-tr' | 'corner-bl' | 'corner-br',
  t: number,
): { x: number; y: number } {
  /** Stronger outset keeps rubber/colliders slightly shallower in the well vs raw anchors. */
  const s = t * 0.2;
  switch (kind) {
    case 'corner-tl':
      return { x: x + s, y: y + s };
    case 'corner-tr':
      return { x: x - s, y: y + s };
    case 'corner-bl':
      return { x: x + s, y: y - s };
    case 'corner-br':
      return { x: x - s, y: y - s };
    default:
      return { x, y };
  }
}

function outsetSidePoint(
  x: number,
  y: number,
  pocketKind: 'side-top' | 'side-bottom',
  t: number,
): { x: number; y: number } {
  const midX = TABLE_WIDTH / 2;
  const midY = TABLE_HEIGHT / 2;
  const s = t * 0.12;
  const vx = midX - x;
  const vy = midY - y;
  const len = Math.hypot(vx, vy) || 1;
  return { x: x + (vx / len) * s, y: y + (vy / len) * s };
}

/**
 * Raw jaw anchor points (before outset) — shared with physics in `table-cushion-wall-segments.ts`.
 */
export function cornerPocketJawAnchorsRaw(
  cx: number,
  cy: number,
  r: number,
  kind: 'corner-tl' | 'corner-tr' | 'corner-bl' | 'corner-br',
): { B: { x: number; y: number }; C: { x: number; y: number }; D: { x: number; y: number }; G: { x: number; y: number } } {
  const t = r * 0.92;
  switch (kind) {
    case 'corner-tl':
      return {
        B: { x: cx - t * 0.28, y: CLOTH },
        C: { x: cx - t * 0.62, y: cy - t * 0.52 },
        D: { x: CLOTH, y: cy - t * 0.28 },
        G: { x: cx - t * 0.52, y: cy - t * 0.62 },
      };
    case 'corner-tr':
      return {
        B: { x: cx + t * 0.28, y: CLOTH },
        C: { x: cx + t * 0.62, y: cy - t * 0.52 },
        D: { x: TABLE_WIDTH - CLOTH, y: cy - t * 0.28 },
        G: { x: cx + t * 0.52, y: cy - t * 0.62 },
      };
    case 'corner-bl':
      return {
        B: { x: cx - t * 0.28, y: TABLE_HEIGHT - CLOTH },
        C: { x: cx - t * 0.62, y: cy + t * 0.52 },
        D: { x: CLOTH, y: cy + t * 0.28 },
        G: { x: cx - t * 0.52, y: cy + t * 0.62 },
      };
    case 'corner-br':
      return {
        B: { x: cx + t * 0.28, y: TABLE_HEIGHT - CLOTH },
        C: { x: cx + t * 0.62, y: cy + t * 0.52 },
        D: { x: TABLE_WIDTH - CLOTH, y: cy + t * 0.28 },
        G: { x: cx + t * 0.52, y: cy + t * 0.62 },
      };
    default:
      return { B: { x: cx, y: cy }, C: { x: cx, y: cy }, D: { x: cx, y: cy }, G: { x: cx, y: cy } };
  }
}

/**
 * Physics / Rapier jaw vertices — outset from raw anchors (matches previous sim, slightly pulled toward playfield).
 */
export function cornerPocketJawAnchorsPhysics(
  cx: number,
  cy: number,
  r: number,
  kind: 'corner-tl' | 'corner-tr' | 'corner-bl' | 'corner-br',
): { B: { x: number; y: number }; C: { x: number; y: number }; D: { x: number; y: number }; G: { x: number; y: number } } {
  const raw = cornerPocketJawAnchorsRaw(cx, cy, r, kind);
  const t = r * 0.92;
  return {
    B: outsetCornerPoint(raw.B.x, raw.B.y, kind, t),
    C: outsetCornerPoint(raw.C.x, raw.C.y, kind, t),
    D: outsetCornerPoint(raw.D.x, raw.D.y, kind, t),
    G: outsetCornerPoint(raw.G.x, raw.G.y, kind, t),
  };
}

/**
 * Closed SVG paths for inset bumper chrome at a corner (two strips).
 * Simplified **45°** throat: each strip is a triangle with one **diagonal** `B`↔`D` (nose toward the pocket).
 */
export function pocketInsetCornerJawSvgPaths(p: TablePocketVisual): string[] {
  if (!p.kind.startsWith('corner-')) {
    return [];
  }
  const kind = p.kind as 'corner-tl' | 'corner-tr' | 'corner-bl' | 'corner-br';
  const { cx, cy, r } = p;
  const t = r * 0.92;
  const lip = CLOTH + 2;

  const raw = cornerPocketJawAnchorsRaw(cx, cy, r, kind);
  const B = outsetCornerPoint(raw.B.x, raw.B.y, kind, t);
  const D = outsetCornerPoint(raw.D.x, raw.D.y, kind, t);

  switch (kind) {
    case 'corner-tl': {
      const p0 = { x: lip + 6, y: CLOTH };
      const q0 = { x: CLOTH, y: lip + 6 };
      const pathH = [`M ${p0.x} ${p0.y}`, `L ${B.x} ${B.y}`, `L ${D.x} ${D.y}`, `L ${p0.x} ${p0.y}`, 'Z'].join(' ');
      const pathV = [`M ${q0.x} ${q0.y}`, `L ${D.x} ${D.y}`, `L ${B.x} ${B.y}`, `L ${q0.x} ${q0.y}`, 'Z'].join(' ');
      return [pathH, pathV];
    }
    case 'corner-tr': {
      const p0 = { x: TABLE_WIDTH - lip - 6, y: CLOTH };
      const q0 = { x: TABLE_WIDTH - CLOTH, y: lip + 6 };
      const pathH = [`M ${p0.x} ${p0.y}`, `L ${B.x} ${B.y}`, `L ${D.x} ${D.y}`, `L ${p0.x} ${p0.y}`, 'Z'].join(' ');
      const pathV = [`M ${q0.x} ${q0.y}`, `L ${D.x} ${D.y}`, `L ${B.x} ${B.y}`, `L ${q0.x} ${q0.y}`, 'Z'].join(' ');
      return [pathH, pathV];
    }
    case 'corner-bl': {
      const p0 = { x: lip + 6, y: TABLE_HEIGHT - CLOTH };
      const q0 = { x: CLOTH, y: TABLE_HEIGHT - lip - 6 };
      const pathH = [`M ${p0.x} ${p0.y}`, `L ${B.x} ${B.y}`, `L ${D.x} ${D.y}`, `L ${p0.x} ${p0.y}`, 'Z'].join(' ');
      const pathV = [`M ${q0.x} ${q0.y}`, `L ${D.x} ${D.y}`, `L ${B.x} ${B.y}`, `L ${q0.x} ${q0.y}`, 'Z'].join(' ');
      return [pathH, pathV];
    }
    case 'corner-br': {
      const p0 = { x: TABLE_WIDTH - lip - 6, y: TABLE_HEIGHT - CLOTH };
      const q0 = { x: TABLE_WIDTH - CLOTH, y: TABLE_HEIGHT - lip - 6 };
      const pathH = [`M ${p0.x} ${p0.y}`, `L ${B.x} ${B.y}`, `L ${D.x} ${D.y}`, `L ${p0.x} ${p0.y}`, 'Z'].join(' ');
      const pathV = [`M ${q0.x} ${q0.y}`, `L ${D.x} ${D.y}`, `L ${B.x} ${B.y}`, `L ${q0.x} ${q0.y}`, 'Z'].join(' ');
      return [pathH, pathV];
    }
    default:
      return [];
  }
}

/** Side inset quads as **straight** SVG paths (pair per pocket). */
export function pocketInsetSideJawSvgPaths(p: TablePocketVisual): string[] {
  const { cx, cy, r, kind } = p;
  if (kind !== 'side-top' && kind !== 'side-bottom') {
    return [];
  }
  const t = r * 0.92;
  const sk = kind;

  if (kind === 'side-top') {
    const L0o = { x: cx - t * 1.15, y: CLOTH };
    const L1o = { x: cx - t * 0.42, y: CLOTH };
    const L2o = { x: cx - t * 0.38, y: cy + t * 0.35 };
    const L3o = { x: cx - t * 0.95, y: cy + t * 0.12 };
    const L0 = outsetSidePoint(L0o.x, L0o.y, sk, t);
    const L1 = outsetSidePoint(L1o.x, L1o.y, sk, t);
    const L2 = outsetSidePoint(L2o.x, L2o.y, sk, t);
    const L3 = outsetSidePoint(L3o.x, L3o.y, sk, t);

    const R0o = { x: cx + t * 0.42, y: CLOTH };
    const R1o = { x: cx + t * 1.15, y: CLOTH };
    const R2o = { x: cx + t * 0.95, y: cy + t * 0.12 };
    const R3o = { x: cx + t * 0.38, y: cy + t * 0.35 };
    const R0 = outsetSidePoint(R0o.x, R0o.y, sk, t);
    const R1 = outsetSidePoint(R1o.x, R1o.y, sk, t);
    const R2 = outsetSidePoint(R2o.x, R2o.y, sk, t);
    const R3 = outsetSidePoint(R3o.x, R3o.y, sk, t);

    const left = [`M ${L0.x} ${L0.y}`, `L ${L1.x} ${L1.y}`, `L ${L2.x} ${L2.y}`, `L ${L3.x} ${L3.y}`, `L ${L0.x} ${L0.y}`, 'Z'].join(' ');
    const right = [`M ${R0.x} ${R0.y}`, `L ${R1.x} ${R1.y}`, `L ${R2.x} ${R2.y}`, `L ${R3.x} ${R3.y}`, `L ${R0.x} ${R0.y}`, 'Z'].join(' ');
    return [left, right];
  }

  const L0o = { x: cx - t * 1.15, y: TABLE_HEIGHT - CLOTH };
  const L1o = { x: cx - t * 0.42, y: TABLE_HEIGHT - CLOTH };
  const L2o = { x: cx - t * 0.38, y: cy - t * 0.35 };
  const L3o = { x: cx - t * 0.95, y: cy - t * 0.12 };
  const L0 = outsetSidePoint(L0o.x, L0o.y, sk, t);
  const L1 = outsetSidePoint(L1o.x, L1o.y, sk, t);
  const L2 = outsetSidePoint(L2o.x, L2o.y, sk, t);
  const L3 = outsetSidePoint(L3o.x, L3o.y, sk, t);

  const R0o = { x: cx + t * 0.42, y: TABLE_HEIGHT - CLOTH };
  const R1o = { x: cx + t * 1.15, y: TABLE_HEIGHT - CLOTH };
  const R2o = { x: cx + t * 0.95, y: cy - t * 0.12 };
  const R3o = { x: cx + t * 0.38, y: cy - t * 0.35 };
  const R0 = outsetSidePoint(R0o.x, R0o.y, sk, t);
  const R1 = outsetSidePoint(R1o.x, R1o.y, sk, t);
  const R2 = outsetSidePoint(R2o.x, R2o.y, sk, t);
  const R3 = outsetSidePoint(R3o.x, R3o.y, sk, t);

  const left = [`M ${L0.x} ${L0.y}`, `L ${L1.x} ${L1.y}`, `L ${L2.x} ${L2.y}`, `L ${L3.x} ${L3.y}`, `L ${L0.x} ${L0.y}`, 'Z'].join(' ');
  const right = [`M ${R0.x} ${R0.y}`, `L ${R1.x} ${R1.y}`, `L ${R2.x} ${R2.y}`, `L ${R3.x} ${R3.y}`, `L ${R0.x} ${R0.y}`, 'Z'].join(' ');
  return [left, right];
}

export interface SidePocketJawQuadPoints {
  L0: { x: number; y: number };
  L1: { x: number; y: number };
  L2: { x: number; y: number };
  L3: { x: number; y: number };
  R0: { x: number; y: number };
  R1: { x: number; y: number };
  R2: { x: number; y: number };
  R3: { x: number; y: number };
}

/** Physics anchors for side-pocket jaw quads (matches SVG outset points). */
export function sidePocketJawAnchorsPhysics(cx: number, cy: number, r: number, kind: 'side-top' | 'side-bottom'): SidePocketJawQuadPoints {
  const t = r * 0.92;

  if (kind === 'side-top') {
    const L0o = { x: cx - t * 1.15, y: CLOTH };
    const L1o = { x: cx - t * 0.42, y: CLOTH };
    const L2o = { x: cx - t * 0.38, y: cy + t * 0.35 };
    const L3o = { x: cx - t * 0.95, y: cy + t * 0.12 };
    const R0o = { x: cx + t * 0.42, y: CLOTH };
    const R1o = { x: cx + t * 1.15, y: CLOTH };
    const R2o = { x: cx + t * 0.95, y: cy + t * 0.12 };
    const R3o = { x: cx + t * 0.38, y: cy + t * 0.35 };
    return {
      L0: outsetSidePoint(L0o.x, L0o.y, kind, t),
      L1: outsetSidePoint(L1o.x, L1o.y, kind, t),
      L2: outsetSidePoint(L2o.x, L2o.y, kind, t),
      L3: outsetSidePoint(L3o.x, L3o.y, kind, t),
      R0: outsetSidePoint(R0o.x, R0o.y, kind, t),
      R1: outsetSidePoint(R1o.x, R1o.y, kind, t),
      R2: outsetSidePoint(R2o.x, R2o.y, kind, t),
      R3: outsetSidePoint(R3o.x, R3o.y, kind, t),
    };
  }

  const L0o = { x: cx - t * 1.15, y: TABLE_HEIGHT - CLOTH };
  const L1o = { x: cx - t * 0.42, y: TABLE_HEIGHT - CLOTH };
  const L2o = { x: cx - t * 0.38, y: cy - t * 0.35 };
  const L3o = { x: cx - t * 0.95, y: cy - t * 0.12 };
  const R0o = { x: cx + t * 0.42, y: TABLE_HEIGHT - CLOTH };
  const R1o = { x: cx + t * 1.15, y: TABLE_HEIGHT - CLOTH };
  const R2o = { x: cx + t * 0.95, y: cy - t * 0.12 };
  const R3o = { x: cx + t * 0.38, y: cy - t * 0.35 };
  return {
    L0: outsetSidePoint(L0o.x, L0o.y, kind, t),
    L1: outsetSidePoint(L1o.x, L1o.y, kind, t),
    L2: outsetSidePoint(L2o.x, L2o.y, kind, t),
    L3: outsetSidePoint(L3o.x, L3o.y, kind, t),
    R0: outsetSidePoint(R0o.x, R0o.y, kind, t),
    R1: outsetSidePoint(R1o.x, R1o.y, kind, t),
    R2: outsetSidePoint(R2o.x, R2o.y, kind, t),
    R3: outsetSidePoint(R3o.x, R3o.y, kind, t),
  };
}

/** Inset bumper paths for all pockets — straight-segment jaws (shared with Rapier sampling). */
export function pocketInsetBumperPathsFromKind(p: TablePocketVisual): string[] {
  if (p.kind.startsWith('corner-')) {
    return pocketInsetCornerJawSvgPaths(p);
  }
  if (p.kind === 'side-top' || p.kind === 'side-bottom') {
    return pocketInsetSideJawSvgPaths(p);
  }
  return [];
}

export interface JawSampleSegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

function pushLineSeg(out: JawSampleSegment[], a: { x: number; y: number }, b: { x: number; y: number }): void {
  out.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y });
}

/** Corner pocket jaw outline — matches SVG `pocketInsetCornerJawSvgPaths` (45° diagonal `B`↔`D`). */
export function sampleCornerPocketJawSegments(
  cx: number,
  cy: number,
  r: number,
  kind: 'corner-tl' | 'corner-tr' | 'corner-bl' | 'corner-br',
): JawSampleSegment[] {
  const lip = CLOTH + 2;
  const { B, D } = cornerPocketJawAnchorsPhysics(cx, cy, r, kind);
  const out: JawSampleSegment[] = [];

  switch (kind) {
    case 'corner-tl': {
      const p0 = { x: lip + 6, y: CLOTH };
      const q0 = { x: CLOTH, y: lip + 6 };
      pushLineSeg(out, p0, B);
      pushLineSeg(out, B, D);
      pushLineSeg(out, D, p0);
      pushLineSeg(out, q0, D);
      pushLineSeg(out, D, B);
      pushLineSeg(out, B, q0);
      break;
    }
    case 'corner-tr': {
      const p0 = { x: TABLE_WIDTH - lip - 6, y: CLOTH };
      const q0 = { x: TABLE_WIDTH - CLOTH, y: lip + 6 };
      pushLineSeg(out, p0, B);
      pushLineSeg(out, B, D);
      pushLineSeg(out, D, p0);
      pushLineSeg(out, q0, D);
      pushLineSeg(out, D, B);
      pushLineSeg(out, B, q0);
      break;
    }
    case 'corner-bl': {
      const p0 = { x: lip + 6, y: TABLE_HEIGHT - CLOTH };
      const q0 = { x: CLOTH, y: TABLE_HEIGHT - lip - 6 };
      pushLineSeg(out, p0, B);
      pushLineSeg(out, B, D);
      pushLineSeg(out, D, p0);
      pushLineSeg(out, q0, D);
      pushLineSeg(out, D, B);
      pushLineSeg(out, B, q0);
      break;
    }
    case 'corner-br': {
      const p0 = { x: TABLE_WIDTH - lip - 6, y: TABLE_HEIGHT - CLOTH };
      const q0 = { x: TABLE_WIDTH - CLOTH, y: TABLE_HEIGHT - lip - 6 };
      pushLineSeg(out, p0, B);
      pushLineSeg(out, B, D);
      pushLineSeg(out, D, p0);
      pushLineSeg(out, q0, D);
      pushLineSeg(out, D, B);
      pushLineSeg(out, B, q0);
      break;
    }
    default:
      break;
  }
  return out;
}

export function sampleSidePocketJawSegments(cx: number, cy: number, r: number, kind: 'side-top' | 'side-bottom'): JawSampleSegment[] {
  const q = sidePocketJawAnchorsPhysics(cx, cy, r, kind);
  const out: JawSampleSegment[] = [];
  pushLineSeg(out, q.L0, q.L1);
  pushLineSeg(out, q.L1, q.L2);
  pushLineSeg(out, q.L2, q.L3);
  pushLineSeg(out, q.L3, q.L0);
  pushLineSeg(out, q.R0, q.R1);
  pushLineSeg(out, q.R1, q.R2);
  pushLineSeg(out, q.R2, q.R3);
  pushLineSeg(out, q.R3, q.R0);
  return out;
}
