import {
  BALL_RADIUS,
  CORNER_POCKET_CENTER_AXIS,
  SIDE_POCKET_CENTER_AXIS,
  TABLE_APRON_SIGHT_OFFSET,
  TABLE_BUMPER_POCKET_CUT_PAD,
  TABLE_CORNER_RADIUS,
  TABLE_HEIGHT,
  TABLE_POCKET_CENTERS,
  TABLE_WIDTH,
} from './billiards-types';
import { pocketInsetBumperPathsFromKind } from './table-pocket-jaw-geometry';

export type PocketVisualKind = 'corner-tl' | 'corner-tr' | 'corner-bl' | 'corner-br' | 'side-top' | 'side-bottom';

/** Simulation pocket center → geometry drawn inside the table. */
export interface TablePocketVisual {
  simX: number;
  simY: number;
  kind: PocketVisualKind;
  cx: number;
  cy: number;
  r: number;
  lipR: number;
}

/**
 * Cutout radius at a pocket mouth, defined **in ball-diameters** so it stays correct if `BALL_RADIUS` changes.
 *
 * Real pockets (WPA): corner mouth 4.5"–4.625" and side mouth 5"–5.125" against a 2.25" ball — so
 * **≈2.0 balls across the corner and ≈2.25 across the side**. A radius of `1.0 × dia` gives a 2-ball corner
 * mouth; `1.125 × dia` gives a 2.25-ball side mouth.
 *
 * The previous values were absolute (`BALL_RADIUS + 8` / `+ 6`), which drifted the moment the ball size
 * changed — at the old radius 17 that made the corner 1.47 balls wide, punishingly tight versus real tables.
 *
 * Capture range is handled separately in `pocketCaptureCenterRadiusAt`.
 */
const CORNER_MOUTH_R = BALL_RADIUS * 2;
const SIDE_MOUTH_R = BALL_RADIUS * 2.25;
const LIP_PAD = 3;

/**
 * How far the visible well and its trim ring extend past the mouth radius.
 *
 * Single source of truth. The Three.js well disc and the SVG trim circle both read this,
 * so they are concentric and identical in size by construction — previously each rounded
 * its own pad by hand (`p.r` vs `p.r + TABLE_BUMPER_POCKET_CUT_PAD` vs `p.r + 3`) and they
 * drifted, leaving a visible annulus between the hole and its surround.
 */
export const POCKET_WELL_PAD = 4;
/** Wood apron wraps outside corner pocket mouths (table units). */
const CORNER_WOOD_WRAP_PAD = 22;

const CENTER_EPS = 6;

function pocketKindFromCenter(x: number, y: number): PocketVisualKind {
  const c = CORNER_POCKET_CENTER_AXIS;
  const s = SIDE_POCKET_CENTER_AXIS;
  if (x <= c + CENTER_EPS && y <= c + CENTER_EPS) {
    return 'corner-tl';
  }
  if (x >= TABLE_WIDTH - c - CENTER_EPS && y <= c + CENTER_EPS) {
    return 'corner-tr';
  }
  if (x <= c + CENTER_EPS && y >= TABLE_HEIGHT - c - CENTER_EPS) {
    return 'corner-bl';
  }
  if (x >= TABLE_WIDTH - c - CENTER_EPS && y >= TABLE_HEIGHT - c - CENTER_EPS) {
    return 'corner-br';
  }
  if (Math.abs(x - TABLE_WIDTH / 2) <= CENTER_EPS && y <= s + CENTER_EPS) {
    return 'side-top';
  }
  return 'side-bottom';
}

export function tablePocketVisuals(): TablePocketVisual[] {
  return TABLE_POCKET_CENTERS.map((center) => {
    const kind = pocketKindFromCenter(center.x, center.y);
    const r = kind.startsWith('corner-') ? CORNER_MOUTH_R : SIDE_MOUTH_R;
    return {
      simX: center.x,
      simY: center.y,
      kind,
      cx: center.x,
      cy: center.y,
      r,
      lipR: r + LIP_PAD,
    };
  });
}

function sightsBetween(start: number, end: number, count: number): number[] {
  if (count <= 0 || end <= start) {
    return [];
  }
  const step = (end - start) / (count + 1);
  return Array.from({ length: count }, (_, i) => start + step * (i + 1));
}

/** Apron diamond sight centers (table coordinates) — evenly spaced between pocket mouths. */
export function tableRailSightPoints(): Array<{ cx: number; cy: number }> {
  const dots: Array<{ cx: number; cy: number }> = [];
  const inset = TABLE_APRON_SIGHT_OFFSET;
  const yTop = inset;
  const yBottom = TABLE_HEIGHT - inset;
  const xLeft = inset;
  const xRight = TABLE_WIDTH - inset;

  const corner = CORNER_POCKET_CENTER_AXIS;
  const midX = TABLE_WIDTH / 2;

  for (const x of [
    ...sightsBetween(corner, midX, 3),
    ...sightsBetween(midX, TABLE_WIDTH - corner, 3),
  ]) {
    dots.push({ cx: x, cy: yTop });
  }
  for (const x of [
    ...sightsBetween(corner, midX, 3),
    ...sightsBetween(midX, TABLE_WIDTH - corner, 3),
  ]) {
    dots.push({ cx: x, cy: yBottom });
  }
  for (const y of sightsBetween(corner, TABLE_HEIGHT - corner, 3)) {
    dots.push({ cx: xLeft, cy: y }, { cx: xRight, cy: y });
  }
  return dots;
}

/** Mask cutouts — cushion slightly wider than cloth so rails curve into the throat. */
export function pocketMaskCircles(
  pockets: TablePocketVisual[],
  layer: 'cushion' | 'cloth',
): Array<{ cx: number; cy: number; r: number }> {
  const pad = layer === 'cushion' ? 3 : 1;
  return pockets.map((p) => ({ cx: p.cx, cy: p.cy, r: p.r + pad }));
}

function cornerWoodWrapRadius(p: TablePocketVisual): number {
  const target = p.r + CORNER_WOOD_WRAP_PAD;
  const { cx, cy, kind } = p;
  const margin = 4;
  switch (kind) {
    case 'corner-tl':
      return Math.min(target, cx - margin, cy - margin);
    case 'corner-tr':
      return Math.min(target, TABLE_WIDTH - cx - margin, cy - margin);
    case 'corner-bl':
      return Math.min(target, cx - margin, TABLE_HEIGHT - cy - margin);
    case 'corner-br':
      return Math.min(target, TABLE_WIDTH - cx - margin, TABLE_HEIGHT - cy - margin);
    default:
      return target;
  }
}

function cornerPocketCutRadius(p: TablePocketVisual): number {
  return p.r + TABLE_BUMPER_POCKET_CUT_PAD;
}

/** Degrees added each side beyond a 90° apron quarter on pocket circle (all corners). */
const CORNER_APRON_ARC_EXT_DEG = 75;

type CornerApronKind = 'corner-tl' | 'corner-tr' | 'corner-bl' | 'corner-br';

function cornerApronChromeArcD(cx: number, cy: number, radius: number, corner: CornerApronKind): string {
  const ext = (CORNER_APRON_ARC_EXT_DEG * Math.PI) / 180;
  let t0: number;
  let t1: number;
  let sweep: 0 | 1;
  switch (corner) {
    case 'corner-tl':
      t0 = Math.PI - ext;
      t1 = -Math.PI / 2 + ext;
      sweep = 1;
      break;
    case 'corner-tr':
      t0 = -Math.PI / 2 - ext;
      t1 = ext;
      sweep = 1;
      break;
    case 'corner-bl':
      t0 = Math.PI + ext;
      t1 = Math.PI / 2 - ext;
      sweep = 0;
      break;
    case 'corner-br':
      t0 = -ext;
      t1 = Math.PI / 2 + ext;
      sweep = 1;
      break;
  }
  const x0 = cx + radius * Math.cos(t0);
  const y0 = cy + radius * Math.sin(t0);
  const x1 = cx + radius * Math.cos(t1);
  const y1 = cy + radius * Math.sin(t1);
  const span = Math.PI / 2 + 2 * ext;
  const large = span > Math.PI ? 1 : 0;
  return `M ${x0} ${y0} A ${radius} ${radius} 0 ${large} ${sweep} ${x1} ${y1}`;
}

/**
 * Quarter-arc on the pocket mouth where bumpers meet (same circle as bumper cutouts).
 */
export function cornerPocketWoodFramePath(p: TablePocketVisual): string {
  if (!isCornerPocketKind(p.kind)) {
    return '';
  }
  const cutR = cornerPocketCutRadius(p);
  const { cx, cy, kind } = p;

  switch (kind) {
    case 'corner-tl':
    case 'corner-tr':
    case 'corner-bl':
    case 'corner-br':
      return cornerApronChromeArcD(cx, cy, cutR, kind);
    default:
      return '';
  }
}

/** Outer apron arc (larger radius) tracing the same bumper anchor lines. */
export function cornerPocketExteriorWoodFramePath(p: TablePocketVisual): string {
  if (!isCornerPocketKind(p.kind)) {
    return '';
  }
  const extR = Math.min(cornerWoodWrapRadius(p), cornerPocketCutRadius(p) + 12);
  const { cx, cy, kind } = p;

  switch (kind) {
    case 'corner-tl':
    case 'corner-tr':
    case 'corner-bl':
    case 'corner-br':
      return cornerApronChromeArcD(cx, cy, extR, kind);
    default:
      return '';
  }
}

function cornerWoodEarOuterPath(p: TablePocketVisual): string {
  const R = TABLE_CORNER_RADIUS;
  const W = TABLE_WIDTH;
  const H = TABLE_HEIGHT;
  const { cx, cy, kind } = p;
  const cutR = cornerPocketCutRadius(p);
  const extR = Math.min(cornerWoodWrapRadius(p), cutR + 10);

  switch (kind) {
    case 'corner-tl': {
      const xEdge = Math.max(0, cx - extR);
      const yEdge = Math.max(0, cy - extR);
      return `M 0 ${R} A ${R} ${R} 0 0 1 ${R} 0 L ${xEdge} 0 L ${xEdge} ${cy} A ${extR} ${extR} 0 0 1 ${cx} ${yEdge} L 0 ${yEdge} L 0 ${R} Z`;
    }
    case 'corner-tr': {
      const xEdge = Math.min(W, cx + extR);
      const yEdge = Math.max(0, cy - extR);
      return `M ${W} ${R} A ${R} ${R} 0 0 1 ${W - R} 0 L ${xEdge} 0 L ${xEdge} ${cy} A ${extR} ${extR} 0 0 1 ${cx} ${yEdge} L ${W} ${yEdge} L ${W} ${R} Z`;
    }
    case 'corner-bl': {
      const xEdge = Math.max(0, cx - extR);
      const yEdge = Math.min(H, cy + extR);
      return `M 0 ${H - R} A ${R} ${R} 0 0 1 ${R} ${H} L ${xEdge} ${H} L ${xEdge} ${cy} A ${extR} ${extR} 0 0 0 ${cx} ${yEdge} L 0 ${yEdge} L 0 ${H - R} Z`;
    }
    case 'corner-br': {
      const xEdge = Math.min(W, cx + extR);
      const yEdge = Math.min(H, cy + extR);
      return `M ${W} ${H - R} A ${R} ${R} 0 0 1 ${W - R} ${H} L ${xEdge} ${H} L ${xEdge} ${cy} A ${extR} ${extR} 0 0 0 ${cx} ${yEdge} L ${W} ${yEdge} L ${W} ${H - R} Z`;
    }
    default:
      return '';
  }
}

/**
 * Wood apron fill at corners; pocket hole is covered later by pocket depth circles.
 */
export function cornerWoodEarFillPaths(pockets: TablePocketVisual[]): string[] {
  const paths: string[] = [];
  for (const p of pockets) {
    if (!isCornerPocketKind(p.kind)) {
      continue;
    }
    const outer = cornerWoodEarOuterPath(p);
    if (outer) {
      paths.push(outer);
    }
  }
  return paths;
}

/** Mask-only ears (outer ring without pocket hole). */
export function cornerWoodEarMaskPaths(pockets: TablePocketVisual[]): string[] {
  const paths: string[] = [];
  for (const p of pockets) {
    if (!isCornerPocketKind(p.kind)) {
      continue;
    }
    const outer = cornerWoodEarOuterPath(p);
    if (outer) {
      paths.push(outer);
    }
  }
  return paths;
}

/**
 * Outer wood corner cap (~90° on the rail side). Stays outside the playing cloth.
 */
export function pocketRailLipPath(p: TablePocketVisual): string {
  const { cx, cy, lipR, kind } = p;
  switch (kind) {
    case 'corner-tl':
      return `M ${cx - lipR} ${cy} A ${lipR} ${lipR} 0 0 1 ${cx} ${cy - lipR}`;
    case 'corner-tr':
      return `M ${cx} ${cy - lipR} A ${lipR} ${lipR} 0 0 1 ${cx + lipR} ${cy}`;
    case 'corner-bl':
      return `M ${cx - lipR} ${cy} A ${lipR} ${lipR} 0 0 0 ${cx} ${cy + lipR}`;
    case 'corner-br':
      return `M ${cx} ${cy + lipR} A ${lipR} ${lipR} 0 0 0 ${cx + lipR} ${cy}`;
    case 'side-top':
      return `M ${cx - lipR} ${cy} A ${lipR} ${lipR} 0 0 1 ${cx + lipR} ${cy}`;
    case 'side-bottom':
      return `M ${cx - lipR} ${cy} A ${lipR} ${lipR} 0 0 0 ${cx + lipR} ${cy}`;
    default:
      return '';
  }
}

/** Dark edge where cushion meets pocket (jaw shadow) — same rail side as lip. */
export function pocketJawPath(p: TablePocketVisual): string {
  const { cx, cy, r, kind } = p;
  const jawR = r + 1.5;
  switch (kind) {
    case 'corner-tl':
      return `M ${cx - jawR} ${cy} A ${jawR} ${jawR} 0 0 1 ${cx} ${cy - jawR}`;
    case 'corner-tr':
      return `M ${cx} ${cy - jawR} A ${jawR} ${jawR} 0 0 1 ${cx + jawR} ${cy}`;
    case 'corner-bl':
      return `M ${cx - jawR} ${cy} A ${jawR} ${jawR} 0 0 0 ${cx} ${cy + jawR}`;
    case 'corner-br':
      return `M ${cx} ${cy + jawR} A ${jawR} ${jawR} 0 0 0 ${cx + jawR} ${cy}`;
    case 'side-top':
      return `M ${cx - jawR} ${cy} A ${jawR} ${jawR} 0 0 1 ${cx + jawR} ${cy}`;
    case 'side-bottom':
      return `M ${cx - jawR} ${cy} A ${jawR} ${jawR} 0 0 0 ${cx + jawR} ${cy}`;
    default:
      return '';
  }
}

export function isCornerPocketKind(kind: PocketVisualKind): boolean {
  return kind.startsWith('corner-');
}

/**
 * Cushion facings where rail meets pocket throat (inset bumpers).
 * Straight-segment jaw geometry (~45° chamfers at corners) — shared with Rapier (`table-pocket-jaw-geometry` / `table-cushion-wall-segments`).
 */
export function pocketInsetBumperPaths(p: TablePocketVisual): string[] {
  return pocketInsetBumperPathsFromKind(p);
}
