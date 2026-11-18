import {
  TABLE_BUMPER_BAND_INSET_TOWARD_CENTER,
  TABLE_BUMPER_NOSE,
  TABLE_BUMPER_OUTSET,
  TABLE_BUMPER_SIDE_RAIL_OUTER_SHIFT,
  TABLE_HEIGHT,
  TABLE_WIDTH,
} from './billiards-types';
import type { PocketVisualKind, TablePocketVisual } from './table-pocket-visual';
import { CUSHION_POLYLINES } from './table-cushion-wall-segments';

export type RailEdge = 'top' | 'bottom' | 'left' | 'right';

export interface TableRailBumperBand {
  edge: RailEdge;
  d: string;
  /** Inner nose line (cushion edge over the cloth). */
  noseD: string;
}

/**
 * Straight **nose-line** chord for one cushion strip — same endpoints as the SVG `noseD` polyline.
 * Physics colliders reuse this so Rapier/debug segments match visible bumpers (length + position along the rail).
 */
export interface TableRailBumperNoseStrip {
  edge: RailEdge;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/** Distance from cloth line toward wood (outer bumper edge) — keep in sync with `billiards-types`. */
const BUMPER_OUTSET = TABLE_BUMPER_OUTSET;
/** Cushion nose overhang onto playing cloth — keep in sync with `billiards-types`. */
const BUMPER_NOSE = TABLE_BUMPER_NOSE;
/**
 * Extra radius on pocket mouth when carving **where** a rail strip breaks (chord on cushion nose line).
 * Independent of total strip length — use `RAIL_SEGMENT_INBOARD_TRIM` for that.
 */
/** Widen pocket chord on nose lines — lower values let rail strips extend closer to the hole (corner/side read less “stubby”). */
const RAIL_SVG_POCKET_CUT_PAD = 1;
/** Gap from cloth corner before first bumper segment (along rail) — lower extends corner legs toward pocket. */
const END_PAD = 8;
/**
 * Pull strip endpoints **inboard** (away from pocket) — use `0` so rails run full chord-to-chord length;
 * a positive value shortens rails and reads as a gap at corners/sides.
 */
const RAIL_SEGMENT_INBOARD_TRIM = 0;
/** Shift entire bumper band toward table center — `billiards-types` (`TABLE_BUMPER_BAND_INSET_TOWARD_CENTER`). */
const BUMPER_BAND_INSET_TOWARD_CENTER = TABLE_BUMPER_BAND_INSET_TOWARD_CENTER;
/** Miter reach along the rail at segment ends (outer → nose on nose line); SVG uses straight miters; physics jaws curve toward pocket. */
const BUMPER_END_CHAMFER = 4;
const EDGE_EPS = 1.5;
/**
 * Left/right **vertical** nose line at corner pockets: sample the pocket mouth **circle** (same R as cutouts)
 * so Rapier rail segments hug the curved throat instead of a straight vertical + chamfer tip.
 */
const VERTICAL_CORNER_POCKET_HOOK_STEPS = 10;
/**
 * Left/right rails only — shift nose + outer edge outward toward wood (`TABLE_BUMPER_SIDE_RAIL_OUTER_SHIFT`),
 * clamped so the vertical nose line stays off corner pocket centres (else pocket cutouts degenerate).
 */
export function leftRailOutwardShift(pockets: TablePocketVisual[], leftNoseRaw: number): number {
  let m = TABLE_BUMPER_SIDE_RAIL_OUTER_SHIFT;
  for (const p of pockets) {
    if (p.kind === 'corner-tl' || p.kind === 'corner-bl') {
      m = Math.min(m, leftNoseRaw - p.cx - 0.25);
    }
  }
  return Math.max(0, m);
}

export function rightRailOutwardShift(pockets: TablePocketVisual[], rightNoseRaw: number): number {
  let m = TABLE_BUMPER_SIDE_RAIL_OUTER_SHIFT;
  for (const p of pockets) {
    if (p.kind === 'corner-tr' || p.kind === 'corner-br') {
      m = Math.min(m, p.cx - rightNoseRaw - 0.25);
    }
  }
  return Math.max(0, m);
}

/**
 * Physics jaw only: single straight segment from outer bumper corner `p0` to nose-line endpoint `p2`
 * (~45° chamfer into the pocket — matches simplified jaw geometry in `table-pocket-jaw-geometry`).
 */
function pushStraightJawSegment(
  jaws: TableRailBumperNoseStrip[],
  edge: RailEdge,
  p0: { x: number; y: number },
  p2: { x: number; y: number },
): void {
  jaws.push({ edge, x1: p0.x, y1: p0.y, x2: p2.x, y2: p2.y });
}

function circleSpanOnHorizontalLine(
  cx: number,
  cy: number,
  r: number,
  y: number,
): [number, number] | null {
  const R = r + RAIL_SVG_POCKET_CUT_PAD;
  const dy = y - cy;
  if (Math.abs(dy) >= R) {
    return null;
  }
  const dx = Math.sqrt(R * R - dy * dy);
  return [cx - dx, cx + dx];
}

function circleSpanOnVerticalLine(
  cx: number,
  cy: number,
  r: number,
  x: number,
): [number, number] | null {
  const R = r + RAIL_SVG_POCKET_CUT_PAD;
  const dx = x - cx;
  if (Math.abs(dx) >= R) {
    return null;
  }
  const dy = Math.sqrt(R * R - dx * dx);
  return [cy - dy, cy + dy];
}

/** Pocket mouth radius on nose lines / cutouts — matches `circleSpanOnVerticalLine` / horizontal variants. */
function pocketNoseArcRadius(p: TablePocketVisual): number {
  return p.r + RAIL_SVG_POCKET_CUT_PAD;
}

/**
 * Replace one vertical nose strip with a **polyline on the pocket mouth circle** (same R as cutouts) so Rapier rails
 * hook around the corner throat like the hand-drawn reference — avoids a long vertical + sharp miter gap at the hole.
 */
function pushVerticalCornerPocketHookStrips(
  strips: TableRailBumperNoseStrip[],
  edge: 'left' | 'right',
  xNose: number,
  yTop: number,
  yBottom: number,
  pocket: TablePocketVisual,
): void {
  const R = pocketNoseArcRadius(pocket);
  const { cx, cy } = pocket;
  let θ0 = Math.atan2(yTop - cy, xNose - cx);
  let θ1 = Math.atan2(yBottom - cy, xNose - cx);
  if (θ1 < θ0) {
    const t = θ0;
    θ0 = θ1;
    θ1 = t;
  }
  const arc = θ1 - θ0;
  if (arc <= 1e-6) {
    return;
  }
  const steps = VERTICAL_CORNER_POCKET_HOOK_STEPS;
  let prevX = cx + R * Math.cos(θ0);
  let prevY = cy + R * Math.sin(θ0);
  for (let i = 1; i <= steps; i += 1) {
    const u = i / steps;
    const θ = θ0 + arc * u;
    const qx = cx + R * Math.cos(θ);
    const qy = cy + R * Math.sin(θ);
    strips.push({ edge, x1: prevX, y1: prevY, x2: qx, y2: qy });
    prevX = qx;
    prevY = qy;
  }
}

function pushSpan(cuts: Array<[number, number]>, span: [number, number] | null): void {
  if (!span) {
    return;
  }
  const [a, b] = span;
  if (b > a + 0.5) {
    cuts.push([a, b]);
  }
}

function clampSpan(span: [number, number], min: number, max: number): [number, number] | null {
  const a = Math.max(min, span[0]);
  const b = Math.min(max, span[1]);
  if (b <= a + 0.5) {
    return null;
  }
  return [a, b];
}

function mergeIntervals(intervals: Array<[number, number]>): Array<[number, number]> {
  if (intervals.length === 0) {
    return [];
  }
  const sorted = [...intervals].sort((a, b) => a[0] - b[0]);
  const merged: Array<[number, number]> = [sorted[0]!];
  for (let i = 1; i < sorted.length; i += 1) {
    const prev = merged[merged.length - 1]!;
    const cur = sorted[i]!;
    if (cur[0] <= prev[1] + 1) {
      prev[1] = Math.max(prev[1], cur[1]);
    } else {
      merged.push(cur);
    }
  }
  return merged;
}

function segmentsBetween(
  start: number,
  end: number,
  cuts: Array<[number, number]>,
): Array<[number, number]> {
  const segs: Array<[number, number]> = [];
  let x = start;
  for (const [a, b] of cuts) {
    if (a > x + 1) {
      segs.push([x, a]);
    }
    x = Math.max(x, b);
  }
  if (end > x + 1) {
    segs.push([x, end]);
  }
  return segs;
}

function topCutouts(
  pockets: TablePocketVisual[],
  clothX: number,
  clothW: number,
  sampleY: number,
): Array<[number, number]> {
  const right = clothX + clothW;
  const cuts: Array<[number, number]> = [];
  for (const p of pockets) {
    const span = circleSpanOnHorizontalLine(p.cx, p.cy, p.r, sampleY);
    if (!span) {
      continue;
    }
    switch (p.kind) {
      case 'corner-tl':
      case 'corner-tr':
      case 'side-top':
        pushSpan(cuts, clampSpan(span, clothX, right));
        break;
      default:
        break;
    }
  }
  return mergeIntervals(cuts);
}

function bottomCutouts(
  pockets: TablePocketVisual[],
  clothX: number,
  clothW: number,
  sampleY: number,
): Array<[number, number]> {
  const right = clothX + clothW;
  const cuts: Array<[number, number]> = [];
  for (const p of pockets) {
    const span = circleSpanOnHorizontalLine(p.cx, p.cy, p.r, sampleY);
    if (!span) {
      continue;
    }
    switch (p.kind) {
      case 'corner-bl':
      case 'corner-br':
      case 'side-bottom':
        pushSpan(cuts, clampSpan(span, clothX, right));
        break;
      default:
        break;
    }
  }
  return mergeIntervals(cuts);
}

function leftCutouts(
  pockets: TablePocketVisual[],
  clothY: number,
  clothH: number,
  sampleX: number,
): Array<[number, number]> {
  const bottom = clothY + clothH;
  const cuts: Array<[number, number]> = [];
  for (const p of pockets) {
    const span = circleSpanOnVerticalLine(p.cx, p.cy, p.r, sampleX);
    if (!span) {
      continue;
    }
    switch (p.kind) {
      case 'corner-tl':
      case 'corner-bl':
        pushSpan(cuts, clampSpan(span, clothY, bottom));
        break;
      default:
        break;
    }
  }
  return mergeIntervals(cuts);
}

function rightCutouts(
  pockets: TablePocketVisual[],
  clothY: number,
  clothH: number,
  sampleX: number,
): Array<[number, number]> {
  const bottom = clothY + clothH;
  const cuts: Array<[number, number]> = [];
  for (const p of pockets) {
    const span = circleSpanOnVerticalLine(p.cx, p.cy, p.r, sampleX);
    if (!span) {
      continue;
    }
    switch (p.kind) {
      case 'corner-tr':
      case 'corner-br':
        pushSpan(cuts, clampSpan(span, clothY, bottom));
        break;
      default:
        break;
    }
  }
  return mergeIntervals(cuts);
}

function clampChamfer(requested: number, span: number): number {
  if (span <= 0) {
    return 0;
  }
  return Math.min(requested, Math.max(0, span * 0.48 - 0.5));
}

/** Shorten strip toward pocket throat; leave corner-adjacent ends (rail start/end) full length. */
function trimHorizontalSegmentEndpoints(a: number, b: number, lineStart: number, lineEnd: number): [number, number] {
  const trim = RAIL_SEGMENT_INBOARD_TRIM;
  let al = a;
  let br = b;
  if (al > lineStart + EDGE_EPS) {
    al += trim;
  }
  if (br < lineEnd - EDGE_EPS) {
    br -= trim;
  }
  if (br - al < 2) {
    return [a, b];
  }
  return [al, br];
}

function trimVerticalSegmentEndpoints(yTop: number, yBot: number, lineStart: number, lineEnd: number): [number, number] {
  const trim = RAIL_SEGMENT_INBOARD_TRIM;
  let yt = yTop;
  let yb = yBot;
  if (yt > lineStart + EDGE_EPS) {
    yt += trim;
  }
  if (yb < lineEnd - EDGE_EPS) {
    yb -= trim;
  }
  if (yb - yt < 2) {
    return [yTop, yBot];
  }
  return [yt, yb];
}

const TOP_ROW_KINDS = new Set<PocketVisualKind>(['corner-tl', 'corner-tr', 'side-top']);
const BOTTOM_ROW_KINDS = new Set<PocketVisualKind>(['corner-bl', 'corner-br', 'side-bottom']);
const LEFT_COL_KINDS = new Set<PocketVisualKind>(['corner-tl', 'corner-bl']);
const RIGHT_COL_KINDS = new Set<PocketVisualKind>(['corner-tr', 'corner-br']);

function horizontalCutSpan(
  p: TablePocketVisual,
  clothX: number,
  clothW: number,
  sampleY: number,
): [number, number] | null {
  const span = circleSpanOnHorizontalLine(p.cx, p.cy, p.r, sampleY);
  if (!span) {
    return null;
  }
  return clampSpan(span, clothX, clothX + clothW);
}

function verticalCutSpan(
  p: TablePocketVisual,
  clothY: number,
  clothH: number,
  sampleX: number,
): [number, number] | null {
  const span = circleSpanOnVerticalLine(p.cx, p.cy, p.r, sampleX);
  if (!span) {
    return null;
  }
  return clampSpan(span, clothY, clothY + clothH);
}

/** Pocket whose cutout right edge (span[1]) meets segment left `xCoord`. */
function pocketAtHorizontalSegmentLeft(
  pockets: TablePocketVisual[],
  clothX: number,
  clothW: number,
  sampleY: number,
  xCoord: number,
  kinds: ReadonlySet<PocketVisualKind>,
): TablePocketVisual | null {
  for (const p of pockets) {
    if (!kinds.has(p.kind)) {
      continue;
    }
    const s = horizontalCutSpan(p, clothX, clothW, sampleY);
    if (!s) {
      continue;
    }
    if (Math.abs(xCoord - s[1]) <= EDGE_EPS) {
      return p;
    }
  }
  return null;
}

/** Pocket whose cutout left edge (span[0]) meets segment right `xCoord`. */
function pocketAtHorizontalSegmentRight(
  pockets: TablePocketVisual[],
  clothX: number,
  clothW: number,
  sampleY: number,
  xCoord: number,
  kinds: ReadonlySet<PocketVisualKind>,
): TablePocketVisual | null {
  for (const p of pockets) {
    if (!kinds.has(p.kind)) {
      continue;
    }
    const s = horizontalCutSpan(p, clothX, clothW, sampleY);
    if (!s) {
      continue;
    }
    if (Math.abs(xCoord - s[0]) <= EDGE_EPS) {
      return p;
    }
  }
  return null;
}

/** Segment **top** `yCoord` meets the **bottom** of a pocket cutout (chord span max y). */
function pocketAtVerticalCutBottom(
  pockets: TablePocketVisual[],
  clothY: number,
  clothH: number,
  sampleX: number,
  yCoord: number,
  kinds: ReadonlySet<PocketVisualKind>,
): TablePocketVisual | null {
  for (const p of pockets) {
    if (!kinds.has(p.kind)) {
      continue;
    }
    const s = verticalCutSpan(p, clothY, clothH, sampleX);
    if (!s) {
      continue;
    }
    if (Math.abs(yCoord - s[1]) <= EDGE_EPS) {
      return p;
    }
  }
  return null;
}

/** Segment **bottom** `yCoord` meets the **top** of a pocket cutout (chord span min y). */
function pocketAtVerticalCutTop(
  pockets: TablePocketVisual[],
  clothY: number,
  clothH: number,
  sampleX: number,
  yCoord: number,
  kinds: ReadonlySet<PocketVisualKind>,
): TablePocketVisual | null {
  for (const p of pockets) {
    if (!kinds.has(p.kind)) {
      continue;
    }
    const s = verticalCutSpan(p, clothY, clothH, sampleX);
    if (!s) {
      continue;
    }
    if (Math.abs(yCoord - s[0]) <= EDGE_EPS) {
      return p;
    }
  }
  return null;
}

/**
 * Nose-line strip segments — legacy chord model, kept for the pocket-cutout helpers.
 *
 * The `SVG` bumper art and the Rapier colliders are **both** generated from `CUSHION_POLYLINES` now, so this
 * function no longer feeds either; it remains because the pocket span helpers below still build on it.
 */
export function tableRailBumperNoseStrips(
  pockets: TablePocketVisual[],
  clothX: number,
  clothY: number,
  clothW: number,
  clothH: number,
  clothCornerRadius: number,
): TableRailBumperNoseStrip[] {
  const strips: TableRailBumperNoseStrip[] = [];
  const right = clothX + clothW;
  const bottom = clothY + clothH;
  const xStart = clothX + END_PAD + clothCornerRadius * 0.35;
  const xEnd = right - END_PAD - clothCornerRadius * 0.35;
  const yStart = clothY + END_PAD + clothCornerRadius * 0.35;
  const yEnd = bottom - END_PAD - clothCornerRadius * 0.35;

  const inY = BUMPER_BAND_INSET_TOWARD_CENTER;
  const topNose = clothY + BUMPER_NOSE + inY;
  const topCuts = topCutouts(pockets, clothX, clothW, topNose);
  const topSegs = segmentsBetween(xStart, xEnd, topCuts);
  for (const [a, b] of topSegs) {
    const [aa, bb] = trimHorizontalSegmentEndpoints(a, b, xStart, xEnd);
    const chamferLeft = aa > xStart + EDGE_EPS && pocketAtHorizontalSegmentLeft(pockets, clothX, clothW, topNose, a, TOP_ROW_KINDS) != null;
    const chamferRight = bb < xEnd - EDGE_EPS && pocketAtHorizontalSegmentRight(pockets, clothX, clothW, topNose, b, TOP_ROW_KINDS) != null;
    const span = bb - aa;
    const chL = chamferLeft ? clampChamfer(BUMPER_END_CHAMFER, span) : 0;
    const chR = chamferRight ? clampChamfer(BUMPER_END_CHAMFER, span) : 0;
    const x0 = chL > 0 ? aa + chL : aa;
    const x1 = chR > 0 ? bb - chR : bb;
    strips.push({ edge: 'top', x1: x0, y1: topNose, x2: x1, y2: topNose });
  }

  const botNose = bottom - BUMPER_NOSE - inY;
  const botCuts = bottomCutouts(pockets, clothX, clothW, botNose);
  const botSegs = segmentsBetween(xStart, xEnd, botCuts);
  for (const [a, b] of botSegs) {
    const [aa, bb] = trimHorizontalSegmentEndpoints(a, b, xStart, xEnd);
    const chamferLeft = aa > xStart + EDGE_EPS && pocketAtHorizontalSegmentLeft(pockets, clothX, clothW, botNose, a, BOTTOM_ROW_KINDS) != null;
    const chamferRight = bb < xEnd - EDGE_EPS && pocketAtHorizontalSegmentRight(pockets, clothX, clothW, botNose, b, BOTTOM_ROW_KINDS) != null;
    const span = bb - aa;
    const chL = chamferLeft ? clampChamfer(BUMPER_END_CHAMFER, span) : 0;
    const chR = chamferRight ? clampChamfer(BUMPER_END_CHAMFER, span) : 0;
    const x0 = chL > 0 ? aa + chL : aa;
    const x1 = chR > 0 ? bb - chR : bb;
    strips.push({ edge: 'bottom', x1: x0, y1: botNose, x2: x1, y2: botNose });
  }

  const inX = BUMPER_BAND_INSET_TOWARD_CENTER;
  const leftNoseRaw = clothX + BUMPER_NOSE + inX;
  const sideOutL = leftRailOutwardShift(pockets, leftNoseRaw);
  const leftNose = leftNoseRaw - sideOutL;
  const leftCuts = leftCutouts(pockets, clothY, clothH, leftNose);
  const leftSegs = segmentsBetween(yStart, yEnd, leftCuts);
  for (const [ya, yb] of leftSegs) {
    const [y0, y1] = trimVerticalSegmentEndpoints(ya, yb, yStart, yEnd);
    const pAtTop = pocketAtVerticalCutBottom(pockets, clothY, clothH, leftNose, ya, LEFT_COL_KINDS);
    const pAtBot = pocketAtVerticalCutTop(pockets, clothY, clothH, leftNose, yb, LEFT_COL_KINDS);
    const chamferHigh = y0 > yStart + EDGE_EPS && pAtTop != null;
    const chamferLow = y1 < yEnd - EDGE_EPS && pAtBot != null;
    const span = y1 - y0;
    const chLo = chamferLow ? clampChamfer(BUMPER_END_CHAMFER, span) : 0;
    const chHi = chamferHigh ? clampChamfer(BUMPER_END_CHAMFER, span) : 0;
    const ya0 = chHi > 0 ? y0 + chHi : y0;
    const ya1 = chLo > 0 ? y1 - chLo : y1;

    /**
     * Long runs between TL and BL have **both** chamfers — keep a **straight** vertical nose (same as before).
     * Single-chamfer strips use a **circular hook** on the mouth from `pocketAtVerticalCutBottom(ya)` or `pocketAtVerticalCutTop(yb)`.
     */
    if (chamferHigh && !chamferLow) {
      const pHigh = pocketAtVerticalCutBottom(pockets, clothY, clothH, leftNose, ya, LEFT_COL_KINDS);
      if (pHigh?.kind === 'corner-tl' || pHigh?.kind === 'corner-bl') {
        pushVerticalCornerPocketHookStrips(strips, 'left', leftNose, ya0, ya1, pHigh);
        continue;
      }
    }
    if (chamferLow && !chamferHigh) {
      const pLow = pocketAtVerticalCutTop(pockets, clothY, clothH, leftNose, yb, LEFT_COL_KINDS);
      if (pLow?.kind === 'corner-tl' || pLow?.kind === 'corner-bl') {
        pushVerticalCornerPocketHookStrips(strips, 'left', leftNose, ya0, ya1, pLow);
        continue;
      }
    }

    strips.push({ edge: 'left', x1: leftNose, y1: ya0, x2: leftNose, y2: ya1 });
  }

  const rightNoseRaw = right - BUMPER_NOSE - inX;
  const sideOutR = rightRailOutwardShift(pockets, rightNoseRaw);
  const rightNose = rightNoseRaw + sideOutR;
  const rightCuts = rightCutouts(pockets, clothY, clothH, rightNose);
  const rightSegs = segmentsBetween(yStart, yEnd, rightCuts);
  for (const [ya, yb] of rightSegs) {
    const [y0, y1] = trimVerticalSegmentEndpoints(ya, yb, yStart, yEnd);
    const pAtTop = pocketAtVerticalCutBottom(pockets, clothY, clothH, rightNose, ya, RIGHT_COL_KINDS);
    const pAtBot = pocketAtVerticalCutTop(pockets, clothY, clothH, rightNose, yb, RIGHT_COL_KINDS);
    const chamferHigh = y0 > yStart + EDGE_EPS && pAtTop != null;
    const chamferLow = y1 < yEnd - EDGE_EPS && pAtBot != null;
    const span = y1 - y0;
    const chLo = chamferLow ? clampChamfer(BUMPER_END_CHAMFER, span) : 0;
    const chHi = chamferHigh ? clampChamfer(BUMPER_END_CHAMFER, span) : 0;
    const ya0 = chHi > 0 ? y0 + chHi : y0;
    const ya1 = chLo > 0 ? y1 - chLo : y1;

    if (chamferHigh && !chamferLow) {
      const pHigh = pocketAtVerticalCutBottom(pockets, clothY, clothH, rightNose, ya, RIGHT_COL_KINDS);
      if (pHigh?.kind === 'corner-tr' || pHigh?.kind === 'corner-br') {
        pushVerticalCornerPocketHookStrips(strips, 'right', rightNose, ya0, ya1, pHigh);
        continue;
      }
    }
    if (chamferLow && !chamferHigh) {
      const pLow = pocketAtVerticalCutTop(pockets, clothY, clothH, rightNose, yb, RIGHT_COL_KINDS);
      if (pLow?.kind === 'corner-tr' || pLow?.kind === 'corner-br') {
        pushVerticalCornerPocketHookStrips(strips, 'right', rightNose, ya0, ya1, pLow);
        continue;
      }
    }

    strips.push({ edge: 'right', x1: rightNose, y1: ya0, x2: rightNose, y2: ya1 });
  }

  return strips;
}

/**
 * Pocket-jaw facets for Rapier — single **straight** outer→nose segments (~45° chamfer into the pocket;
 * matches simplified jaws in `table-pocket-jaw-geometry`). **Visual** bumper fills stay straight miters (`horizontalBumperPath`).
 */
export function tableRailBumperJawStrips(
  pockets: TablePocketVisual[],
  clothX: number,
  clothY: number,
  clothW: number,
  clothH: number,
  clothCornerRadius: number,
): TableRailBumperNoseStrip[] {
  const jaws: TableRailBumperNoseStrip[] = [];
  const right = clothX + clothW;
  const bottom = clothY + clothH;
  const xStart = clothX + END_PAD + clothCornerRadius * 0.35;
  const xEnd = right - END_PAD - clothCornerRadius * 0.35;
  const yStart = clothY + END_PAD + clothCornerRadius * 0.35;
  const yEnd = bottom - END_PAD - clothCornerRadius * 0.35;

  const inY = BUMPER_BAND_INSET_TOWARD_CENTER;
  const topOut = clothY - BUMPER_OUTSET + inY;
  const topNose = clothY + BUMPER_NOSE + inY;
  const topCuts = topCutouts(pockets, clothX, clothW, topNose);
  const topSegs = segmentsBetween(xStart, xEnd, topCuts);
  for (const [a, b] of topSegs) {
    const [aa, bb] = trimHorizontalSegmentEndpoints(a, b, xStart, xEnd);
    const pLeft = pocketAtHorizontalSegmentLeft(pockets, clothX, clothW, topNose, a, TOP_ROW_KINDS);
    const pRight = pocketAtHorizontalSegmentRight(pockets, clothX, clothW, topNose, b, TOP_ROW_KINDS);
    const chamferLeft = aa > xStart + EDGE_EPS && pLeft != null;
    const chamferRight = bb < xEnd - EDGE_EPS && pRight != null;
    const span = bb - aa;
    const chL = chamferLeft ? clampChamfer(BUMPER_END_CHAMFER, span) : 0;
    const chR = chamferRight ? clampChamfer(BUMPER_END_CHAMFER, span) : 0;
    if (chL > 0 && pLeft) {
      pushStraightJawSegment(jaws, 'top', { x: aa, y: topOut }, { x: aa + chL, y: topNose });
    }
    if (chR > 0 && pRight) {
      pushStraightJawSegment(jaws, 'top', { x: bb, y: topOut }, { x: bb - chR, y: topNose });
    }
  }

  const botOut = bottom + BUMPER_OUTSET - inY;
  const botNose = bottom - BUMPER_NOSE - inY;
  const botCuts = bottomCutouts(pockets, clothX, clothW, botNose);
  const botSegs = segmentsBetween(xStart, xEnd, botCuts);
  for (const [a, b] of botSegs) {
    const [aa, bb] = trimHorizontalSegmentEndpoints(a, b, xStart, xEnd);
    const pLeft = pocketAtHorizontalSegmentLeft(pockets, clothX, clothW, botNose, a, BOTTOM_ROW_KINDS);
    const pRight = pocketAtHorizontalSegmentRight(pockets, clothX, clothW, botNose, b, BOTTOM_ROW_KINDS);
    const chamferLeft = aa > xStart + EDGE_EPS && pLeft != null;
    const chamferRight = bb < xEnd - EDGE_EPS && pRight != null;
    const span = bb - aa;
    const chL = chamferLeft ? clampChamfer(BUMPER_END_CHAMFER, span) : 0;
    const chR = chamferRight ? clampChamfer(BUMPER_END_CHAMFER, span) : 0;
    if (chL > 0 && pLeft) {
      pushStraightJawSegment(jaws, 'bottom', { x: aa, y: botOut }, { x: aa + chL, y: botNose });
    }
    if (chR > 0 && pRight) {
      pushStraightJawSegment(jaws, 'bottom', { x: bb, y: botOut }, { x: bb - chR, y: botNose });
    }
  }

  const inX = BUMPER_BAND_INSET_TOWARD_CENTER;
  const leftNoseRawJ = clothX + BUMPER_NOSE + inX;
  const rightNoseRawJ = right - BUMPER_NOSE - inX;
  const sideOutLj = leftRailOutwardShift(pockets, leftNoseRawJ);
  const sideOutRj = rightRailOutwardShift(pockets, rightNoseRawJ);
  const leftOut = clothX - BUMPER_OUTSET + inX - sideOutLj;
  const leftNose = leftNoseRawJ - sideOutLj;
  const leftCuts = leftCutouts(pockets, clothY, clothH, leftNose);
  const leftSegs = segmentsBetween(yStart, yEnd, leftCuts);
  for (const [ya, yb] of leftSegs) {
    const [y0, y1] = trimVerticalSegmentEndpoints(ya, yb, yStart, yEnd);
    const pHigh = pocketAtVerticalCutBottom(pockets, clothY, clothH, leftNose, ya, LEFT_COL_KINDS);
    const pLow = pocketAtVerticalCutTop(pockets, clothY, clothH, leftNose, yb, LEFT_COL_KINDS);
    const chamferHigh = y0 > yStart + EDGE_EPS && pHigh != null;
    const chamferLow = y1 < yEnd - EDGE_EPS && pLow != null;
    const span = y1 - y0;
    const chLo = chamferLow ? clampChamfer(BUMPER_END_CHAMFER, span) : 0;
    const chHi = chamferHigh ? clampChamfer(BUMPER_END_CHAMFER, span) : 0;
    if (chHi > 0 && pHigh) {
      pushStraightJawSegment(jaws, 'left', { x: leftOut, y: y0 }, { x: leftNose, y: y0 + chHi });
    }
    if (chLo > 0 && pLow) {
      pushStraightJawSegment(jaws, 'left', { x: leftOut, y: y1 }, { x: leftNose, y: y1 - chLo });
    }
  }

  const rightOut = right + BUMPER_OUTSET - inX + sideOutRj;
  const rightNose = rightNoseRawJ + sideOutRj;
  const rightCuts = rightCutouts(pockets, clothY, clothH, rightNose);
  const rightSegs = segmentsBetween(yStart, yEnd, rightCuts);
  for (const [ya, yb] of rightSegs) {
    const [y0, y1] = trimVerticalSegmentEndpoints(ya, yb, yStart, yEnd);
    const pHigh = pocketAtVerticalCutBottom(pockets, clothY, clothH, rightNose, ya, RIGHT_COL_KINDS);
    const pLow = pocketAtVerticalCutTop(pockets, clothY, clothH, rightNose, yb, RIGHT_COL_KINDS);
    const chamferHigh = y0 > yStart + EDGE_EPS && pHigh != null;
    const chamferLow = y1 < yEnd - EDGE_EPS && pLow != null;
    const span = y1 - y0;
    const chLo = chamferLow ? clampChamfer(BUMPER_END_CHAMFER, span) : 0;
    const chHi = chamferHigh ? clampChamfer(BUMPER_END_CHAMFER, span) : 0;
    if (chHi > 0 && pHigh) {
      pushStraightJawSegment(jaws, 'right', { x: rightOut, y: y0 }, { x: rightNose, y: y0 + chHi });
    }
    if (chLo > 0 && pLow) {
      pushStraightJawSegment(jaws, 'right', { x: rightOut, y: y1 }, { x: rightNose, y: y1 - chLo });
    }
  }

  return jaws;
}

/**
 * Classify a polyline by which table edge it hugs, for the gradient/paint choice in the chrome.
 * Works off the nose line the run sits on, so the angled stubs do not confuse it.
 */
function railEdgeForPolyline(polyline: ReadonlyArray<readonly [number, number]>): RailEdge {
  /** Longest segment decides the edge — the straight run, not a stub. */
  let bestLen = -1;
  let edge: RailEdge = 'top';
  for (let i = 0; i < polyline.length - 1; i += 1) {
    const a = polyline[i]!;
    const b = polyline[i + 1]!;
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const len = Math.hypot(dx, dy);
    if (len <= bestLen) {
      continue;
    }
    bestLen = len;
    const midX = (a[0] + b[0]) / 2;
    const midY = (a[1] + b[1]) / 2;
    if (Math.abs(dx) >= Math.abs(dy)) {
      edge = midY < TABLE_HEIGHT / 2 ? 'top' : 'bottom';
    } else {
      edge = midX < TABLE_WIDTH / 2 ? 'left' : 'right';
    }
  }
  return edge;
}

/**
 * Offset a polyline **perpendicular to itself**, into the wood, by `amount`.
 *
 * This is what makes the rubber a constant-width strip. An axis-aligned offset (shift `x` and `y` by
 * `amount` each) is only correct for the straight runs — on the pocket stubs it would push the edge
 * diagonally, making the strip wider there than along the rail.
 *
 * **Orientation is decided once per polyline, not per segment.** Picking each segment's normal with an
 * "away from the table centre" dot test looks right but is not consistent: on a rail with pocket stubs the
 * test flips some segments and not others, so adjacent normals come out **opposed** — the miter term
 * `nx·before.nx + ny·before.ny` collapses toward zero, the offset degenerates, and the band renders as a
 * flat line instead of a strip. One signed area up front gives every segment the same handedness.
 */
function offsetPerpendicular(
  polyline: ReadonlyArray<readonly [number, number]>,
  amount: number,
): Array<{ x: number; y: number }> {
  const n = polyline.length;

  /** Consistent sign for the whole polyline: +1 if its signed area is positive. */
  let signed = 0;
  for (let i = 0; i < n; i += 1) {
    const a = polyline[i]!;
    const b = polyline[(i + 1) % n]!;
    signed += a[0] * b[1] - b[0] * a[1];
  }
  const hand = signed >= 0 ? 1 : -1;

  /** Unit normal of segment `i`, with the polyline's consistent handedness. */
  const segmentNormal = (i: number): { x: number; y: number } => {
    const a = polyline[i]!;
    const b = polyline[i + 1]!;
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const len = Math.hypot(dx, dy) || 1;
    return { x: (-dy / len) * hand, y: (dx / len) * hand };
  };

  return polyline.map(([x, y], i) => {
    const before = i > 0 ? segmentNormal(i - 1) : null;
    const after = i < n - 1 ? segmentNormal(i) : null;
    let nx = 0;
    let ny = 0;
    let scale = 1;
    if (before && after) {
      nx = before.x + after.x;
      ny = before.y + after.y;
      const len = Math.hypot(nx, ny) || 1;
      nx /= len;
      ny /= len;
      /** Miter stretch keeps the offset edge a constant distance from the nose. */
      const cos = nx * before.x + ny * before.y;
      scale = 1 / Math.max(0.5, cos);
    } else {
      const only = (after ?? before)!;
      nx = only.x;
      ny = only.y;
    }
    return { x: x + nx * amount * scale, y: y + ny * amount * scale };
  });
}

function pointsToPath(points: ReadonlyArray<{ x: number; y: number }>): string {
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
}

/**
 * Force a polygon into **counter-clockwise** winding.
 *
 * Building the strip as `woodSide + reversed(nose)` gives opposite winding depending on which way the
 * source polyline runs — the left rail came out clockwise and the right counter-clockwise. Under SVG's
 * default `fill-rule: nonzero` a reversed subpath can render as a **hole** rather than a fill, which is
 * why one side showed a solid box and the other only its outline. Normalising the direction fixes it.
 */
function ensureCounterClockwise(
  points: ReadonlyArray<{ x: number; y: number }>,
): Array<{ x: number; y: number }> {
  let signed = 0;
  for (let i = 0; i < points.length; i += 1) {
    const a = points[i]!;
    const b = points[(i + 1) % points.length]!;
    signed += a.x * b.y - b.x * a.y;
  }
  return signed < 0 ? [...points].reverse() : [...points];
}

/**
 * Visual cushion bands, **built from `CUSHION_POLYLINES`** — the same point list the Rapier colliders use.
 *
 * Each band is the cushion's nose polyline with the nose overhang added on the cloth side and the bumper
 * outset added on the wood side, so the rubber is a constant-width strip that follows every stub. Painting
 * the art from the collider geometry is what keeps them in agreement: previously the art came from one
 * chamfer/miter model and the physics from another, and the two silently disagreed at every pocket.
 *
 * The `pockets`, `cloth*` and `clothCornerRadius` arguments are no longer needed to *derive* the geometry —
 * the shapes already stop at their pocket mouths — but are kept so existing callers are unaffected.
 */
export function tableRailBumperBands(
  pockets: TablePocketVisual[],
  clothX: number,
  clothY: number,
  clothW: number,
  clothH: number,
  clothCornerRadius: number,
): TableRailBumperBand[] {
  void pockets;
  void clothX;
  void clothY;
  void clothW;
  void clothH;
  void clothCornerRadius;

  /** Distance from the nose line out to the visible rubber edge. */
  const outer = TABLE_BUMPER_OUTSET;

  return CUSHION_POLYLINES.map((polyline) => {
    const nose = polyline.map(([x, y]) => ({ x, y }));
    const woodSide = offsetPerpendicular(polyline, outer);
    /**
     * Close the strip by retracing the nose edge backwards.
     *
     * The two closing chords are the **caps** at each end of the rail, and they are the only part of the
     * outline that is not rubber. Keeping them as single straight chords (rather than inserting extra
     * corners) is what stops the end from growing a spur.
     */
    const strip = [...woodSide, ...nose.slice().reverse()];
    return {
      edge: railEdgeForPolyline(polyline),
      d: `${pointsToPath(ensureCounterClockwise(strip))} Z`,
      noseD: pointsToPath(nose),
    } satisfies TableRailBumperBand;
  });
}
