import { BALL_RADIUS } from './billiards-types';
import {
  tableCushionMaxX,
  tableCushionMaxY,
  tableCushionMinX,
  tableCushionMinY,
} from './table-playfield';
import { tablePocketVisuals } from './table-pocket-visual';
import type { BilliardsBall } from './billiards-types';

const CONTACT_DIST = 2 * BALL_RADIUS;
const RAY_EPS = 1e-4;

export interface ShotHintSegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface ShotHintPathResult {
  /**
   * Cue path: `[0]` = approach to first hit; optional `[1+]` = open-table bank bounces **or** cue path
   * **after** first object contact (equal-mass elastic; see `objectChain`); legacy `cueStroke` = `[0]`.
   */
  cueStrokeSegments: ShotHintSegment[];
  /** @deprecated Use `cueStrokeSegments[0]` — kept for callers that expect one cue segment. */
  cueStroke: ShotHintSegment | null;
  /**
   * After first object contact: each hop assumes the **struck** ball was at rest; outgoing ray follows
   * the contact normal (equal-mass elastic into a stationary ball). Ignores english / spin / friction
   * — Rapier differs.
   */
  objectChain: ShotHintSegment[];
}

function norm(x: number, y: number): number {
  return Math.hypot(x, y);
}

/**
 * Smallest t > minT where |(origin + t*dir) - center|^2 = radius^2, |dir| = 1.
 */
function rayCircleFirstHit(
  origin: { x: number; y: number },
  dir: { x: number; y: number },
  center: { x: number; y: number },
  radius: number,
  minT: number,
): number | null {
  const ox = origin.x - center.x;
  const oy = origin.y - center.y;
  const b = ox * dir.x + oy * dir.y;
  const c = ox * ox + oy * oy - radius * radius;
  const disc = b * b - c;
  if (disc < 0) {
    return null;
  }
  const sqrtD = Math.sqrt(disc);
  const t1 = -b - sqrtD;
  const t2 = -b + sqrtD;
  const out: number[] = [];
  if (t1 > minT + RAY_EPS) {
    out.push(t1);
  }
  if (t2 > minT + RAY_EPS) {
    out.push(t2);
  }
  if (out.length === 0) {
    return null;
  }
  return Math.min(...out);
}

/**
 * First positive t where ray `origin + t*dir` (|dir| = 1) hits the ball-centre playable rectangle,
 * and the inward normal at that rail.
 */
function rayPlayfieldWallHit(
  origin: { x: number; y: number },
  dir: { x: number; y: number },
): { t: number; nx: number; ny: number } | null {
  const minX = tableCushionMinX();
  const maxX = tableCushionMaxX();
  const minY = tableCushionMinY();
  const maxY = tableCushionMaxY();

  const { x: ox, y: oy } = origin;
  const { x: dx, y: dy } = dir;

  let best: { t: number; nx: number; ny: number } | null = null;

  const consider = (t: number, xAtT: number, yAtT: number, nx: number, ny: number): void => {
    if (t <= RAY_EPS || !Number.isFinite(t)) {
      return;
    }
    if (xAtT < minX - RAY_EPS || xAtT > maxX + RAY_EPS || yAtT < minY - RAY_EPS || yAtT > maxY + RAY_EPS) {
      return;
    }
    if (best == null || t < best.t - RAY_EPS) {
      best = { t, nx, ny };
    }
  };

  if (Math.abs(dx) > RAY_EPS) {
    const tMinX = (minX - ox) / dx;
    consider(tMinX, minX, oy + tMinX * dy, 1, 0);
    const tMaxX = (maxX - ox) / dx;
    consider(tMaxX, maxX, oy + tMaxX * dy, -1, 0);
  }
  if (Math.abs(dy) > RAY_EPS) {
    const tMinY = (minY - oy) / dy;
    consider(tMinY, ox + tMinY * dx, minY, 0, 1);
    const tMaxY = (maxY - oy) / dy;
    consider(tMaxY, ox + tMaxY * dx, maxY, 0, -1);
  }

  return best;
}

/**
 * Smallest positive t where ray `origin + t*dir` (|dir| = 1) reaches the boundary of the
 * axis-aligned ball-center playable rectangle (exits the cushion box).
 */
function rayAabbExitT(
  origin: { x: number; y: number },
  dir: { x: number; y: number },
): number | null {
  const hit = rayPlayfieldWallHit(origin, dir);
  return hit?.t ?? null;
}

/** First positive t where the ball centre crosses a pocket mouth circle along `dir`. */
function rayPocketMouthEntry(
  origin: { x: number; y: number },
  dir: { x: number; y: number },
): { t: number; pocketX: number; pocketY: number } | null {
  let best: { t: number; pocketX: number; pocketY: number } | null = null;
  for (const pocket of tablePocketVisuals()) {
    const tHit = rayCircleFirstHit(
      origin,
      dir,
      { x: pocket.simX, y: pocket.simY },
      pocket.r,
      RAY_EPS,
    );
    if (tHit == null) {
      continue;
    }
    if (best == null || tHit < best.t) {
      best = { t: tHit, pocketX: pocket.simX, pocketY: pocket.simY };
    }
  }
  return best;
}

function clipSegmentToBox(seg: ShotHintSegment): ShotHintSegment | null {
  const { x1, y1, x2, y2 } = seg;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = norm(dx, dy);
  if (len < RAY_EPS) {
    return null;
  }
  const dir = { x: dx / len, y: dy / len };
  const tExit = rayAabbExitT({ x: x1, y: y1 }, dir);
  if (tExit == null) {
    return null;
  }
  const tEnd = Math.min(len, tExit);
  if (tEnd <= RAY_EPS) {
    return null;
  }
  return { x1, y1, x2: x1 + dir.x * tEnd, y2: y1 + dir.y * tEnd };
}

/**
 * Leading surface point of ball at `center` in direction `dir` (unit vector of motion).
 */
function leadingSurface(center: { x: number; y: number }, dir: { x: number; y: number }): { x: number; y: number } {
  return { x: center.x + dir.x * BALL_RADIUS, y: center.y + dir.y * BALL_RADIUS };
}

export type FirstContactKind = 'ball' | 'pocket' | 'wall';

export interface FirstContactAlongRay {
  kind: FirstContactKind;
  t: number;
  ball?: Pick<BilliardsBall, 'id' | 'number' | 'x' | 'y'>;
  pocket?: { x: number; y: number };
  wallNormal?: { nx: number; ny: number };
}

/**
 * Nearest positive hit along the cue path: object ball, pocket mouth, or cushion (whichever is first).
 */
export function findFirstContactAlongRay(
  cue: { x: number; y: number },
  angleRad: number,
  balls: readonly Pick<BilliardsBall, 'id' | 'number' | 'x' | 'y' | 'pocketed'>[],
): FirstContactAlongRay | null {
  const dir = { x: Math.cos(angleRad), y: Math.sin(angleRad) };
  const objectBalls = balls.filter((b) => !b.pocketed && b.number > 0);

  let ballBest: { t: number; ball: (typeof objectBalls)[0] } | null = null;
  for (const b of objectBalls) {
    const t = rayCircleFirstHit(cue, dir, { x: b.x, y: b.y }, CONTACT_DIST, RAY_EPS);
    if (t == null) {
      continue;
    }
    if (ballBest == null || t < ballBest.t - RAY_EPS) {
      ballBest = { t, ball: b };
    }
  }

  const wallHit = rayPlayfieldWallHit(cue, dir);
  const pocketHit = rayPocketMouthEntry(cue, dir);

  type Candidate = FirstContactAlongRay;
  const candidates: Candidate[] = [];
  if (ballBest) {
    candidates.push({ kind: 'ball', t: ballBest.t, ball: ballBest.ball });
  }
  if (wallHit && wallHit.t > RAY_EPS) {
    candidates.push({
      kind: 'wall',
      t: wallHit.t,
      wallNormal: { nx: wallHit.nx, ny: wallHit.ny },
    });
  }
  if (pocketHit && pocketHit.t > RAY_EPS) {
    candidates.push({
      kind: 'pocket',
      t: pocketHit.t,
      pocket: { x: pocketHit.pocketX, y: pocketHit.pocketY },
    });
  }
  if (candidates.length === 0) {
    return null;
  }
  candidates.sort((a, b) => a.t - b.t);
  return candidates[0]!;
}

/** After a legal hit, would another ball block the object rolling into this pocket mouth? */
export function objectBallPocketPathBlocker(
  objectBall: Pick<BilliardsBall, 'id' | 'number' | 'x' | 'y'>,
  pocket: { x: number; y: number },
  balls: readonly Pick<BilliardsBall, 'id' | 'number' | 'x' | 'y' | 'pocketed'>[],
): number | null {
  const dx = pocket.x - objectBall.x;
  const dy = pocket.y - objectBall.y;
  const len = Math.hypot(dx, dy);
  if (len < RAY_EPS) {
    return null;
  }
  const dir = { x: dx / len, y: dy / len };
  let ballBest: { t: number; number: number } | null = null;
  for (const b of balls) {
    if (b.pocketed || b.number === 0 || b.id === objectBall.id) {
      continue;
    }
    const t = rayCircleFirstHit(objectBall, dir, { x: b.x, y: b.y }, CONTACT_DIST, RAY_EPS);
    if (t == null) {
      continue;
    }
    if (ballBest == null || t < ballBest.t) {
      ballBest = { t, number: b.number };
    }
  }
  const pocketHit = rayPocketMouthEntry(objectBall, dir);
  if (!pocketHit) {
    return ballBest?.number ?? null;
  }
  if (ballBest != null && ballBest.t < pocketHit.t - RAY_EPS) {
    return ballBest.number;
  }
  return null;
}

export function findFirstContactObjectBall(
  cue: { x: number; y: number },
  angleRad: number,
  balls: readonly Pick<BilliardsBall, 'id' | 'number' | 'x' | 'y' | 'pocketed'>[],
): Pick<BilliardsBall, 'id' | 'number'> | null {
  const first = findFirstContactAlongRay(cue, angleRad, balls);
  if (!first || first.kind !== 'ball' || !first.ball) {
    return null;
  }
  return { id: first.ball.id, number: first.ball.number };
}

/**
 * Cue-ball travel hint along the aim ray only.
 *
 * Previously the line ran to the object-ball surface contact point, which bends on cuts and
 * reads as a broken aim line. Players expect the overlay to match the cue angle; first contact
 * is still determined by the same ray (`contact.t`), only the drawn segment is collinear.
 */
function buildCueAimRaySegment(
  cue: { x: number; y: number },
  dir: { x: number; y: number },
  contactCenterDistance: number,
): ShotHintSegment | null {
  if (contactCenterDistance <= RAY_EPS) {
    return null;
  }
  const contactCenter = {
    x: cue.x + dir.x * contactCenterDistance,
    y: cue.y + dir.y * contactCenterDistance,
  };
  const start = leadingSurface(cue, dir);
  const end = leadingSurface(contactCenter, dir);
  return { x1: start.x, y1: start.y, x2: end.x, y2: end.y };
}

function objectRollDirectionAfterCueHit(
  cue: { x: number; y: number },
  dir: { x: number; y: number },
  contactCenterT: number,
  objectCenter: { x: number; y: number },
): { x: number; y: number } {
  const cueAtContact = {
    x: cue.x + dir.x * contactCenterT,
    y: cue.y + dir.y * contactCenterT,
  };
  const ox = objectCenter.x - cueAtContact.x;
  const oy = objectCenter.y - cueAtContact.y;
  const len = norm(ox, oy);
  if (len < RAY_EPS) {
    return dir;
  }
  return { x: ox / len, y: oy / len };
}

/** Positive t along `objDir` from `origin` to next pocket, cushion, or object ball (centre distance). */
function objectRollTravelAlongRay(
  origin: { x: number; y: number },
  objDir: { x: number; y: number },
  balls: readonly Pick<BilliardsBall, 'id' | 'number' | 'x' | 'y' | 'pocketed'>[],
  excludeBallId: string,
): number | null {
  let best: number | null = null;
  const consider = (t: number | null) => {
    if (t == null || t <= RAY_EPS) {
      return;
    }
    if (best == null || t < best) {
      best = t;
    }
  };
  consider(rayPlayfieldWallHit(origin, objDir)?.t ?? null);
  consider(rayPocketMouthEntry(origin, objDir)?.t ?? null);
  for (const b of balls) {
    if (b.pocketed || b.number === 0 || b.id === excludeBallId) {
      continue;
    }
    consider(rayCircleFirstHit(origin, objDir, { x: b.x, y: b.y }, CONTACT_DIST, RAY_EPS));
  }
  return best;
}

function buildObjectChainAfterBallHit(
  cue: { x: number; y: number },
  dir: { x: number; y: number },
  contact: FirstContactAlongRay,
  balls: readonly Pick<BilliardsBall, 'id' | 'number' | 'x' | 'y' | 'pocketed'>[],
): ShotHintSegment[] {
  if (contact.kind !== 'ball' || !contact.ball) {
    return [];
  }
  const objectCenter = { x: contact.ball.x, y: contact.ball.y };
  const objDir = objectRollDirectionAfterCueHit(cue, dir, contact.t, objectCenter);
  const rollT = objectRollTravelAlongRay(objectCenter, objDir, balls, contact.ball.id);
  if (rollT == null) {
    return [];
  }
  const seg = buildCueAimRaySegment(objectCenter, objDir, rollT);
  if (!seg) {
    return [];
  }
  const clipped = clipSegmentToBox(seg);
  return clipped ? [clipped] : [];
}

function buildCueSegmentToFirstContact(
  cue: { x: number; y: number },
  dir: { x: number; y: number },
  contact: FirstContactAlongRay,
): ShotHintSegment | null {
  if (contact.t <= RAY_EPS) {
    return null;
  }

  const raw = buildCueAimRaySegment(cue, dir, contact.t);
  if (!raw) {
    return null;
  }

  if (contact.kind === 'ball') {
    return clipSegmentToBox(raw);
  }

  return raw;
}

export function computeBilliardsShotHintPaths(
  cue: { x: number; y: number },
  angleRad: number,
  balls: readonly Pick<BilliardsBall, 'id' | 'number' | 'x' | 'y' | 'pocketed'>[],
): ShotHintPathResult {
  const dir = { x: Math.cos(angleRad), y: Math.sin(angleRad) };
  const first = findFirstContactAlongRay(cue, angleRad, balls);

  if (!first) {
    return { cueStrokeSegments: [], cueStroke: null, objectChain: [] };
  }

  const cueStroke = buildCueSegmentToFirstContact(cue, dir, first);
  const cueStrokeSegments = cueStroke ? [cueStroke] : [];
  const objectChain = buildObjectChainAfterBallHit(cue, dir, first, balls);

  return { cueStrokeSegments, cueStroke: cueStrokeSegments[0] ?? null, objectChain };
}
