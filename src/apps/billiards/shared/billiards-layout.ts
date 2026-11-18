import {
  BALL_RADIUS,
  HEAD_STRING_Y,
  OPEN_BILLIARDS_SEAT_GROUPS,
  TABLE_HEIGHT,
  TABLE_WIDTH,
  type BilliardsBall,
  type BilliardsMatchState,
  type BilliardsPlacementZone,
  type BilliardsRulesProfile,
} from './billiards-types';
import {
  isBallCenterInPlayfield,
  isInPocketMouth,
  tableCushionMaxX,
  tableCushionMinX,
} from './table-playfield';

/** Minimum center–center for drag/drop placement and `findOpenPlacement` (unchanged from product feel). */
const MIN_DIST = BALL_RADIUS * 2 + 0.5;
/**
 * **Auto rack only**: slightly looser triangle than `MIN_DIST` so the pack has more air between
 * balls so breaks scatter instead of frozen stacks — does not affect manual placement rules.
 */
const AUTO_RACK_MIN_DIST = BALL_RADIUS * 2 + 4.25;

function cueBall(): BilliardsBall {
  return {
    id: 'cue',
    number: 0,
    x: TABLE_WIDTH * 0.25,
    y: TABLE_HEIGHT * 0.5,
    pocketed: false,
  };
}

export function createEmptyPracticeState(rulesProfile: BilliardsMatchState['rulesProfile']): BilliardsMatchState {
  return {
    phase: 'setup',
    layoutLocked: false,
    rulesProfile,
    balls: [cueBall()],
    ballInHand: false,
    ballInHandSeat: null,
    placementZone: 'table',
    turnHistory: [],
    shotsTaken: 0,
    seatGroups: { ...OPEN_BILLIARDS_SEAT_GROUPS },
    resultMessage: null,
    winnerSeat: null,
  };
}

export function objectBall(id: string, number: number, x: number, y: number): BilliardsBall {
  return { id, number, x, y, pocketed: false };
}

/** Standard 8-ball triangle (approximate positions). */
export function buildAutoRackBalls(): BilliardsBall[] {
  const rowGap = AUTO_RACK_MIN_DIST * 0.866;
  const backRow = 4;
  /** Keep the deep row (row index `backRow`) inside cushion limits. */
  const apexXPreferred = TABLE_WIDTH * 0.72;
  const apexXMaxFromFoot = tableCushionMaxX() - backRow * rowGap;
  const apexX = Math.max(tableCushionMinX(), Math.min(apexXPreferred, apexXMaxFromFoot));
  const apexY = TABLE_HEIGHT * 0.5;
  const balls: BilliardsBall[] = [cueBall()];
  const order = [1, 9, 2, 10, 8, 3, 11, 4, 12, 5, 13, 6, 14, 7, 15];
  let idx = 0;
  for (let row = 0; row < 5; row += 1) {
    for (let col = 0; col <= row; col += 1) {
      const number = order[idx];
      if (number == null) {
        break;
      }
      const x = apexX + row * rowGap;
      const y = apexY + (col - row / 2) * AUTO_RACK_MIN_DIST;
      balls.push(objectBall(`ball-${number}`, number, x, y));
      idx += 1;
    }
  }
  return balls;
}

/** Nine-ball diamond: 1 on the foot spot (apex), 9 in the center (WPA-style). */
export function buildNineBallRackBalls(): BilliardsBall[] {
  const rowGap = AUTO_RACK_MIN_DIST * 0.866;
  const backRow = 3;
  const apexXPreferred = TABLE_WIDTH * 0.72;
  const apexXMaxFromFoot = tableCushionMaxX() - backRow * rowGap;
  const apexX = Math.max(tableCushionMinX(), Math.min(apexXPreferred, apexXMaxFromFoot));
  const apexY = TABLE_HEIGHT * 0.5;
  const balls: BilliardsBall[] = [cueBall()];
  const diamondOrder = [1, 2, 3, 4, 9, 5, 6, 7, 8];
  const rowCounts = [1, 2, 3, 3];
  let idx = 0;
  for (let row = 0; row < rowCounts.length; row += 1) {
    const count = rowCounts[row] ?? 0;
    for (let col = 0; col < count; col += 1) {
      const number = diamondOrder[idx];
      if (number == null) {
        break;
      }
      const x = apexX + row * rowGap;
      const y = apexY + (col - (count - 1) / 2) * AUTO_RACK_MIN_DIST;
      balls.push(objectBall(`ball-${number}`, number, x, y));
      idx += 1;
    }
  }
  return balls;
}

export function buildRackForRulesProfile(profile: BilliardsRulesProfile): BilliardsBall[] {
  if (profile === 'nine-ball') {
    return buildNineBallRackBalls();
  }
  return buildAutoRackBalls();
}

export function clearObjectBalls(state: BilliardsMatchState): BilliardsBall[] {
  const cue = state.balls.find((b) => b.number === 0 && !b.pocketed) ?? cueBall();
  return [{ ...cue, pocketed: false }];
}

/**
 * Placement bounds.
 *
 * `isBallCenterInPlayfield` deliberately returns **true inside a pocket mouth** — `clampBallCenterToPlayfield`
 * leaves those coordinates alone so a ball can travel into the throat during a shot. That is correct for
 * simulation but wrong for placement: it let a ball be set down *inside the hole*, where it sits outside the
 * cushion and cannot be shot out.
 *
 * Placement therefore checks the pocket mouths itself and rejects them.
 */
function inTableBounds(x: number, y: number): boolean {
  if (isInPocketMouth(x, y)) {
    return false;
  }
  return isBallCenterInPlayfield(x, y);
}

function inKitchen(x: number, y: number): boolean {
  return inTableBounds(x, y) && y <= HEAD_STRING_Y - BALL_RADIUS;
}

/**
 * Treat a missing/unknown zone as `table`.
 *
 * Both bounds checks used to be `zone === '…'` guards, so `undefined` skipped **both** and
 * every coordinate — including off the felt — validated as legal. Any caller that receives
 * a partially-populated state (optimistic client payload, legacy match row) hit that.
 */
function normalizePlacementZone(zone: BilliardsPlacementZone | null | undefined): BilliardsPlacementZone {
  return zone === 'kitchen' ? 'kitchen' : 'table';
}

export function canPlaceBallAt(
  balls: BilliardsBall[],
  x: number,
  y: number,
  movingId: string,
  zone: BilliardsPlacementZone | null | undefined,
): boolean {
  if (!inTableBounds(x, y)) {
    return false;
  }
  if (normalizePlacementZone(zone) === 'kitchen' && !inKitchen(x, y)) {
    return false;
  }
  for (const b of balls) {
    if (b.pocketed || b.id === movingId) {
      continue;
    }
    const dx = b.x - x;
    const dy = b.y - y;
    if (dx * dx + dy * dy < MIN_DIST * MIN_DIST) {
      return false;
    }
  }
  return true;
}

export function findBall(state: BilliardsMatchState, ballId: string): BilliardsBall | undefined {
  return state.balls.find((b) => b.id === ballId);
}

export function nextObjectBallId(balls: BilliardsBall[], preferredNumber?: number): { id: string; number: number } | null {
  if (preferredNumber != null && preferredNumber >= 1 && preferredNumber <= 15) {
    if (!balls.some((b) => b.number === preferredNumber && !b.pocketed)) {
      return { id: `ball-${preferredNumber}`, number: preferredNumber };
    }
    return null;
  }
  for (let n = 1; n <= 15; n += 1) {
    if (!balls.some((b) => b.number === n && !b.pocketed)) {
      return { id: `ball-${n}`, number: n };
    }
  }
  return null;
}

export function findOpenPlacement(balls: BilliardsBall[]): { x: number; y: number } | null {
  const cx = TABLE_WIDTH * 0.5;
  const cy = TABLE_HEIGHT * 0.5;
  for (let ring = 0; ring < 10; ring += 1) {
    for (let a = 0; a < 16; a += 1) {
      const x = cx + Math.cos((a / 16) * Math.PI * 2) * (BALL_RADIUS * 4 + ring * 22);
      const y = cy + Math.sin((a / 16) * Math.PI * 2) * (BALL_RADIUS * 4 + ring * 22);
      if (canPlaceBallAt(balls, x, y, 'new', 'table')) {
        return { x, y };
      }
    }
  }
  return null;
}

export function updateBallPosition(state: BilliardsMatchState, ballId: string, x: number, y: number): BilliardsMatchState {
  return {
    ...state,
    balls: state.balls.map((b) => (b.id === ballId ? { ...b, x, y, pocketed: false } : b)),
  };
}
