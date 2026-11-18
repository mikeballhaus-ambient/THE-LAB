import type {
  BilliardsAssignedGroup,
  BilliardsBall,
  BilliardsMatchState,
  BilliardsPlayerGroup,
  BilliardsSeatGroups,
} from './billiards-types';
import { OPEN_BILLIARDS_SEAT_GROUPS } from './billiards-types';
import type { ShotSimResult } from './billiards-physics';

export function isSolid(number: number): boolean {
  return number >= 1 && number <= 7;
}

export function isStripe(number: number): boolean {
  return number >= 9 && number <= 15;
}

export function groupForBall(number: number): BilliardsPlayerGroup | null {
  if (isSolid(number)) {
    return 'solids';
  }
  if (isStripe(number)) {
    return 'stripes';
  }
  return null;
}

export function countGroupRemaining(
  balls: BilliardsMatchState['balls'],
  group: BilliardsAssignedGroup,
): number {
  return balls.filter((b) => !b.pocketed && groupForBall(b.number) === group).length;
}

export function normalizeBilliardsSeatGroups(state: Pick<BilliardsMatchState, 'seatGroups' | 'playerGroup'>): BilliardsSeatGroups {
  if (state.seatGroups) {
    return {
      1: state.seatGroups[1] ?? null,
      2: state.seatGroups[2] ?? null,
    };
  }
  const legacy = state.playerGroup;
  if (legacy === 'solids' || legacy === 'stripes') {
    return {
      1: legacy,
      2: legacy === 'solids' ? 'stripes' : 'solids',
    };
  }
  return { ...OPEN_BILLIARDS_SEAT_GROUPS };
}

export function tableIsOpen(seatGroups: BilliardsSeatGroups): boolean {
  return seatGroups[1] == null && seatGroups[2] == null;
}

export function groupForSeat(seatGroups: BilliardsSeatGroups, seat: number): BilliardsAssignedGroup | null {
  if (seat === 1) {
    return seatGroups[1];
  }
  if (seat === 2) {
    return seatGroups[2];
  }
  return null;
}

function oppositeGroup(group: BilliardsAssignedGroup): BilliardsAssignedGroup {
  return group === 'solids' ? 'stripes' : 'solids';
}

/** Distinct solids/stripes pocketed on one shot (excludes 8). */
export function objectGroupsPocketed(pocketed: number[]): Set<BilliardsAssignedGroup> {
  const out = new Set<BilliardsAssignedGroup>();
  for (const n of pocketed) {
    if (n === 8) {
      continue;
    }
    const g = groupForBall(n);
    if (g === 'solids' || g === 'stripes') {
      out.add(g);
    }
  }
  return out;
}

/**
 * Assign seat groups when the table is still open. Mixed-group pockets on one shot keep the table open.
 */
function opponentSeat(seat: number): 1 | 2 {
  return seat === 1 ? 2 : 1;
}

/** Object balls newly pocketed on this shot (authoritative ball list). */
export function newlyPocketedObjectNumbers(
  ballsBefore: BilliardsBall[],
  ballsAfter: BilliardsBall[],
): number[] {
  const prevPocketed = new Set(ballsBefore.filter((b) => b.pocketed).map((b) => b.id));
  return ballsAfter
    .filter((b) => b.pocketed && b.number > 0 && !prevPocketed.has(b.id))
    .map((b) => b.number);
}

/** Fallback when ball `id` strings drift between pre-shot state and Rapier output. */
export function newlyPocketedObjectNumbersByNumber(
  ballsBefore: BilliardsBall[],
  ballsAfter: BilliardsBall[],
): number[] {
  const prevNums = new Set(
    ballsBefore.filter((b) => b.pocketed && b.number > 0).map((b) => b.number),
  );
  return ballsAfter
    .filter((b) => b.pocketed && b.number > 0 && !prevNums.has(b.number))
    .map((b) => b.number);
}

function mergePocketedObjectNumbers(
  stateBefore: BilliardsMatchState,
  ballsAfter: BilliardsBall[],
  sim: ShotSimResult,
): number[] {
  const fromIds = newlyPocketedObjectNumbers(stateBefore.balls, ballsAfter);
  const fromNums = newlyPocketedObjectNumbersByNumber(stateBefore.balls, ballsAfter);
  const fromSim = sim.pocketedNumbers.filter((n) => n !== 0);
  return [...new Set([...fromIds, ...fromNums, ...fromSim])];
}

/** True when this shot dropped at least one object ball from the shooter's assigned group. */
export function shooterPocketedOwnGroupThisShot(
  stateBefore: BilliardsMatchState,
  ballsAfter: BilliardsBall[],
  seatGroupsAfter: BilliardsSeatGroups,
  shootingSeat: number,
): boolean {
  const nums = newlyPocketedObjectNumbersByNumber(stateBefore.balls, ballsAfter);
  if (nums.length === 0) {
    return newlyPocketedObjectNumbers(stateBefore.balls, ballsAfter).length > 0;
  }
  const tableWasOpen = tableIsOpen(normalizeBilliardsSeatGroups(stateBefore));
  if (tableWasOpen) {
    return nums.length > 0;
  }
  const shooterGroup = groupForSeat(seatGroupsAfter, shootingSeat);
  if (shooterGroup == null) {
    return false;
  }
  return nums.some((n) => n !== 8 && groupForBall(n) === shooterGroup);
}

/**
 * Pocketed balls that drive eight-ball group assignment and keep-turn on an open table.
 * When multiple groups drop on one stroke but first contact was legal, only the first-contact
 * group counts (common house rule — avoids losing the table on an incidental opposite-group drop).
 */
export function pocketedObjectNumbersForEightBallRules(
  stateBefore: BilliardsMatchState,
  ballsAfter: BilliardsBall[],
  sim: ShotSimResult,
): number[] {
  const pocketed = mergePocketedObjectNumbers(stateBefore, ballsAfter, sim);

  if (!tableIsOpen(normalizeBilliardsSeatGroups(stateBefore))) {
    return pocketed;
  }
  const groups = objectGroupsPocketed(pocketed);
  if (groups.size <= 1) {
    return pocketed;
  }
  const first = sim.firstHitNumber;
  if (first != null && first !== 0 && first !== 8) {
    const hitGroup = groupForBall(first);
    if (hitGroup) {
      const sameGroup = pocketed.filter((n) => groupForBall(n) === hitGroup);
      if (sameGroup.length > 0) {
        return sameGroup;
      }
    }
  }
  return pocketed;
}

/** Eight-ball: continue only when the shooter pockets a ball that earns another shot. */
export function eightBallShooterKeepsTurn(
  stateBefore: BilliardsMatchState,
  seatGroupsAfter: BilliardsSeatGroups,
  shootingSeat: number,
  pocketed: number[],
): boolean {
  const objectPocketed = pocketed.filter((n) => n !== 0);
  if (objectPocketed.length === 0) {
    return false;
  }
  const tableWasOpen = tableIsOpen(normalizeBilliardsSeatGroups(stateBefore));
  if (tableWasOpen) {
    /** Open table / break — any object ball pocketed keeps the shooter at the table. */
    return objectPocketed.length > 0;
  }
  const shooterGroup = groupForSeat(seatGroupsAfter, shootingSeat);
  if (shooterGroup == null) {
    return false;
  }
  return objectPocketed.some((n) => n !== 8 && groupForBall(n) === shooterGroup);
}

export function nineBallShooterKeepsTurn(pocketed: number[]): boolean {
  return pocketed.filter((n) => n !== 0).length > 0;
}

export function tryAssignSeatGroups(
  seatGroups: BilliardsSeatGroups,
  shootingSeat: number,
  pocketed: number[],
): BilliardsSeatGroups {
  if (!tableIsOpen(seatGroups)) {
    return seatGroups;
  }
  const groups = objectGroupsPocketed(pocketed);
  if (groups.size !== 1) {
    return seatGroups;
  }
  const assigned = [...groups][0]!;
  if (shootingSeat === 1) {
    return { 1: assigned, 2: oppositeGroup(assigned) };
  }
  return { 1: oppositeGroup(assigned), 2: assigned };
}

export interface FoulOutcome {
  foul: boolean;
  reason?: string;
  placementZone: BilliardsMatchState['placementZone'];
}

/** WPA / bar-style: kitchen only on the break scratch; anywhere on the felt after. */
export function scratchBallInHandPlacementZone(
  shotsTakenBeforeFoul: number,
): BilliardsMatchState['placementZone'] {
  return shotsTakenBeforeFoul === 0 ? 'kitchen' : 'table';
}

export function foulFromScratch(state: BilliardsMatchState): FoulOutcome {
  const placementZone = scratchBallInHandPlacementZone(state.shotsTaken);
  return {
    foul: true,
    reason: 'Scratch',
    placementZone,
  };
}

/**
 * Placement zone in force for ball-in-hand UI and validation when the wire payload omits
 * `placementZone` (legacy rows / optimistic client). Mirrors break-foul kitchen in
 * {@link foulFromScratch} and `BilliardsTable` kitchen overlays.
 */
export function resolveBilliardsEffectivePlacementZone(
  state: Pick<BilliardsMatchState, 'placementZone' | 'shotsTaken'>,
): BilliardsMatchState['placementZone'] {
  const explicit = state.placementZone;
  if (explicit === 'kitchen' || explicit === 'table') {
    return explicit;
  }
  return scratchBallInHandPlacementZone(state.shotsTaken ?? 0);
}

function cueWasLiveBeforeShot(state: BilliardsMatchState): boolean {
  return state.balls.some((b) => b.number === 0 && !b.pocketed);
}

export function cueIsLiveOnTable(balls: BilliardsBall[]): boolean {
  return balls.some((b) => b.number === 0 && !b.pocketed);
}

/** Physics can pocket the cue without setting `cueScratch` — still a scratch. */
export function effectiveCueScratch(
  state: BilliardsMatchState,
  sim: ShotSimResult,
  ballsAfter: BilliardsBall[],
): boolean {
  if (sim.cueScratch) {
    return true;
  }
  return cueWasLiveBeforeShot(state) && !cueIsLiveOnTable(ballsAfter);
}

/**
 * Competitive play must never sit in `aim` without a cue on the table — force ball-in-hand when needed.
 */
/** Human at the table must place the cue (ball in hand, no live cue on felt). */
export function isHumanBallInHandPlacement(
  state: BilliardsMatchState,
  yourSeat: number,
): boolean {
  if (state.phase !== 'place_cue' || !state.ballInHand) {
    return false;
  }
  const bih = state.ballInHandSeat;
  return bih == null || bih === yourSeat;
}

export function reconcileCompetitiveCueBall(
  state: BilliardsMatchState,
  lastShooterSeat: number,
): BilliardsMatchState {
  if (state.phase === 'finished') {
    return state;
  }
  if (cueIsLiveOnTable(state.balls)) {
    if (state.phase === 'place_cue' && state.ballInHand) {
      /** Scratch / foul BIH — remove stale cue from layout; never promote to aim while placing. */
      return {
        ...state,
        balls: state.balls.filter((b) => b.number !== 0),
      };
    }
    return state;
  }
  if (state.phase === 'place_cue' && state.ballInHand && state.ballInHandSeat != null) {
    return {
      ...state,
      balls: state.balls.filter((b) => b.number !== 0),
    };
  }
  const forSeat =
    state.ballInHandSeat ??
    (typeof state.continueTurnSeat === 'number'
      ? state.continueTurnSeat
      : lastShooterSeat === 1
        ? 2
        : 1);
  const zone = state.placementZone ?? scratchBallInHandPlacementZone(state.shotsTaken);
  return enterBallInHand(state, zone, forSeat);
}

export function foulFromNoHit(): FoulOutcome {
  return { foul: true, reason: 'No ball hit', placementZone: 'table' };
}

export function foulFromKitchenHeadString(): FoulOutcome {
  return { foul: true, reason: 'Did not cross head string', placementZone: 'table' };
}

/** Illegal first contact (wrong object) — loss of turn only; cue stays where it lies. */
function foulPassTurnOnly(
  next: BilliardsMatchState,
  shootingSeat: number,
  sim: ShotSimResult,
  foulReason: string,
  summaryLine: string,
): EightBallShotOutcome {
  return {
    state: {
      ...next,
      ballInHand: false,
      ballInHandSeat: null,
      placementZone: 'table',
      phase: 'aim',
      continueTurnSeat: opponentSeat(shootingSeat),
    },
    foul: { foul: true, reason: foulReason, placementZone: 'table' },
    frameWin: false,
    frameLoss: false,
    summary: formatShotOutcomeSummary(sim, summaryLine),
  };
}

function outcomeForKitchenHeadStringFoul(
  next: BilliardsMatchState,
  sim: ShotSimResult,
  shootingSeat: number,
): EightBallShotOutcome | null {
  if (!sim.kitchenHeadStringFoul) {
    return null;
  }
  const foul = foulFromKitchenHeadString();
  const opponent = opponentSeat(shootingSeat);
  next = enterBallInHand(next, foul.placementZone, opponent);
  return {
    state: next,
    foul,
    frameWin: false,
    frameLoss: false,
    summary: formatShotOutcomeSummary(sim, `${foul.reason} — ball in hand`),
  };
}

export interface EightBallShotOutcome {
  state: BilliardsMatchState;
  foul: FoulOutcome | null;
  frameWin: boolean;
  frameLoss: boolean;
  summary: string;
}

/** Stamp seat attribution on balls newly pocketed this shot (vs match trays). */
export function tagNewlyPocketedBySeat(
  prevBalls: BilliardsBall[],
  nextBalls: BilliardsBall[],
  shootingSeat: number,
): BilliardsBall[] {
  const prevPocketed = new Set(prevBalls.filter((b) => b.pocketed).map((b) => b.id));
  const prevById = new Map(prevBalls.map((ball) => [ball.id, ball]));
  return nextBalls.map((ball) => {
    if (!ball.pocketed || ball.number <= 0) {
      return ball;
    }
    if (ball.pocketedBySeat != null) {
      return ball;
    }
    if (prevPocketed.has(ball.id)) {
      const prevSeat = prevById.get(ball.id)?.pocketedBySeat;
      if (prevSeat != null) {
        return { ...ball, pocketedBySeat: prevSeat };
      }
      return ball;
    }
    return { ...ball, pocketedBySeat: shootingSeat };
  });
}

export function formatShotOutcomeSummary(sim: ShotSimResult, tag: string): string {
  const powerPct = Math.round((sim.powerUsed ?? 0) * 100);
  const pocketed = sim.pocketedNumbers.filter((n) => n !== 0);
  const pocketPart = pocketed.length > 0 ? ` — pocketed ${pocketed.join(', ')}` : '';
  return `${tag}${pocketPart} (${powerPct}% power)`;
}

/** Apply 8-ball rules after physics. */
export function applyEightBallAfterShot(
  state: BilliardsMatchState,
  sim: ShotSimResult,
  shootingSeat: number,
): EightBallShotOutcome {
  let next: BilliardsMatchState = {
    ...state,
    balls: tagNewlyPocketedBySeat(state.balls, sim.balls, shootingSeat),
    shotsTaken: state.shotsTaken + 1,
    phase: 'aim',
  };

  const pocketed = pocketedObjectNumbersForEightBallRules(state, next.balls, sim);
  const eightPocketed = pocketed.includes(8);
  const scratched = effectiveCueScratch(state, sim, next.balls);

  if (scratched) {
    if (eightPocketed) {
      return finishFrame(next, false, 'Scratch on the eight ball — you lose.', shootingSeat);
    }
    const foul = foulFromScratch(state);
    const objectPocketed = pocketed.filter((n) => n !== 0);
    const tableWasOpen = tableIsOpen(normalizeBilliardsSeatGroups(state));

    /** Open table: pocketed balls still assign groups; scratch always passes ball in hand to opponent. */
    if (tableWasOpen && objectPocketed.length > 0) {
      let seatGroups = normalizeBilliardsSeatGroups(state);
      seatGroups = tryAssignSeatGroups(seatGroups, shootingSeat, pocketed);
      const opponent = shootingSeat === 1 ? 2 : 1;
      next = enterBallInHand(next, foul.placementZone, opponent);
      const assignNote =
        !tableIsOpen(seatGroups) && groupForSeat(seatGroups, shootingSeat) != null
          ? ` — ${groupForSeat(seatGroups, shootingSeat)} for seat ${shootingSeat}`
          : '';
      return {
        state: {
          ...next,
          seatGroups,
        },
        foul,
        frameWin: false,
        frameLoss: false,
        summary: formatShotOutcomeSummary(sim, `${foul.reason} — ball in hand${assignNote}`),
      };
    }

    const opponent = shootingSeat === 1 ? 2 : 1;
    next = enterBallInHand(next, foul.placementZone, opponent);
    return {
      state: next,
      foul,
      frameWin: false,
      frameLoss: false,
      summary: formatShotOutcomeSummary(sim, `${foul.reason} — ball in hand`),
    };
  }
  const kitchenFoul = outcomeForKitchenHeadStringFoul(next, sim, shootingSeat);
  if (kitchenFoul) {
    return kitchenFoul;
  }
  if (sim.firstHitNumber == null && pocketed.length === 0) {
    const foul = foulFromNoHit();
    const opponent = shootingSeat === 1 ? 2 : 1;
    next = enterBallInHand(next, foul.placementZone, opponent);
    return {
      state: next,
      foul,
      frameWin: false,
      frameLoss: false,
      summary: formatShotOutcomeSummary(sim, `${foul.reason} — ball in hand`),
    };
  }

  const tableWasOpen = tableIsOpen(normalizeBilliardsSeatGroups(state));
  let seatGroups = normalizeBilliardsSeatGroups(state);
  seatGroups = tryAssignSeatGroups(seatGroups, shootingSeat, pocketed);
  next = { ...next, seatGroups };

  const shooterGroup = groupForSeat(seatGroups, shootingSeat);

  if (
    !tableWasOpen &&
    shooterGroup != null &&
    sim.firstHitNumber === 8 &&
    countGroupRemaining(state.balls, shooterGroup) > 0
  ) {
    if (eightPocketed) {
      return finishFrame(
        next,
        false,
        'Eight ball pocketed before your group is clear — you lose.',
        shootingSeat,
      );
    }
    return foulPassTurnOnly(
      next,
      shootingSeat,
      sim,
      'Eight ball first',
      'Eight ball first — turn passes to opponent',
    );
  }

  if (eightPocketed) {
    if (shooterGroup == null) {
      return finishFrame(next, false, 'Eight ball pocketed early — you lose.', shootingSeat);
    }
    const remaining = countGroupRemaining(next.balls, shooterGroup);
    if (remaining > 0) {
      return finishFrame(next, false, 'Eight ball pocketed with balls still on table — you lose.', shootingSeat);
    }
    return finishFrame(next, true, 'You pocket the 8 — you win!', shootingSeat);
  }

  // While the table was open, group is chosen from what you legally pocket — not first contact.
  // Breaks often hit the head ball (e.g. 1) while a stripe drops from the spread (e.g. 11).
  if (
    !tableWasOpen &&
    shooterGroup != null &&
    sim.firstHitNumber != null &&
    sim.firstHitNumber !== 8
  ) {
    const hitGroup = groupForBall(sim.firstHitNumber);
    if (hitGroup && hitGroup !== shooterGroup) {
      const pocketedOwnGroup =
        pocketed.some((n) => n !== 8 && groupForBall(n) === shooterGroup) ||
        shooterPocketedOwnGroupThisShot(state, next.balls, seatGroups, shootingSeat);
      if (eightPocketed) {
        return finishFrame(next, false, 'Eight ball pocketed on foul — you lose.', shootingSeat);
      }
      if (!pocketedOwnGroup) {
        return foulPassTurnOnly(
          next,
          shootingSeat,
          sim,
          'Wrong ball first',
          'Wrong ball first — turn passes to opponent',
        );
      }
    }
  }

  const assignNote =
    tableIsOpen(normalizeBilliardsSeatGroups(state)) &&
    !tableIsOpen(seatGroups) &&
    shooterGroup != null
      ? ` — ${shooterGroup} for seat ${shootingSeat}`
      : '';

  let keepsTurn = eightBallShooterKeepsTurn(state, seatGroups, shootingSeat, pocketed);
  if (
    !keepsTurn &&
    shooterPocketedOwnGroupThisShot(state, next.balls, seatGroups, shootingSeat)
  ) {
    keepsTurn = true;
  }
  return {
    state: {
      ...next,
      ballInHand: false,
      ballInHandSeat: null,
      placementZone: 'table',
      continueTurnSeat: keepsTurn ? shootingSeat : opponentSeat(shootingSeat),
    },
    foul: null,
    frameWin: false,
    frameLoss: false,
    summary: formatShotOutcomeSummary(
      { ...sim, pocketedNumbers: pocketed },
      `Shot${assignNote}`,
    ),
  };
}

export function lowestLiveBallNumber(balls: BilliardsMatchState['balls']): number | null {
  const live = balls.filter((b) => !b.pocketed && b.number >= 1 && b.number <= 9).map((b) => b.number);
  if (live.length === 0) {
    return null;
  }
  return Math.min(...live);
}

/** Standard nine-ball rules (hit lowest ball first; pocket 9 on a legal shot to win). */
export function applyNineBallAfterShot(
  state: BilliardsMatchState,
  sim: ShotSimResult,
  shootingSeat: number,
): EightBallShotOutcome {
  let next: BilliardsMatchState = {
    ...state,
    balls: tagNewlyPocketedBySeat(state.balls, sim.balls, shootingSeat),
    shotsTaken: state.shotsTaken + 1,
    phase: 'aim',
    seatGroups: { ...OPEN_BILLIARDS_SEAT_GROUPS },
  };

  const pocketed = sim.pocketedNumbers.filter((n) => n !== 0);
  const ninePocketed = pocketed.includes(9);
  const lowestBefore = lowestLiveBallNumber(state.balls);
  const scratched = effectiveCueScratch(state, sim, next.balls);

  if (scratched) {
    const foul = foulFromScratch(state);
    const opponent = shootingSeat === 1 ? 2 : 1;
    next = enterBallInHand(next, foul.placementZone, opponent);
    if (ninePocketed) {
      return finishFrame(next, false, 'Foul on the 9 — you lose.', shootingSeat);
    }
    return {
      state: next,
      foul,
      frameWin: false,
      frameLoss: false,
      summary: formatShotOutcomeSummary(sim, `${foul.reason} — ball in hand`),
    };
  }

  const kitchenFoulNine = outcomeForKitchenHeadStringFoul(next, sim, shootingSeat);
  if (kitchenFoulNine) {
    return kitchenFoulNine;
  }

  if (sim.firstHitNumber == null && pocketed.length === 0) {
    const foul = foulFromNoHit();
    const opponent = shootingSeat === 1 ? 2 : 1;
    next = enterBallInHand(next, foul.placementZone, opponent);
    return {
      state: next,
      foul,
      frameWin: false,
      frameLoss: false,
      summary: formatShotOutcomeSummary(sim, `${foul.reason} — ball in hand`),
    };
  }

  if (
    lowestBefore != null &&
    sim.firstHitNumber != null &&
    sim.firstHitNumber !== lowestBefore &&
    sim.firstHitNumber !== 0
  ) {
    if (ninePocketed) {
      return finishFrame(next, false, 'Foul on the 9 — you lose.', shootingSeat);
    }
    return foulPassTurnOnly(
      next,
      shootingSeat,
      sim,
      'Did not hit lowest ball first',
      'Did not hit lowest ball first — turn passes to opponent',
    );
  }

  if (ninePocketed) {
    return finishFrame(next, true, 'You pocket the 9 — you win!', shootingSeat);
  }

  const keepsTurn = nineBallShooterKeepsTurn(pocketed);
  return {
    state: {
      ...next,
      ballInHandSeat: null,
      continueTurnSeat: keepsTurn ? shootingSeat : opponentSeat(shootingSeat),
    },
    foul: null,
    frameWin: false,
    frameLoss: false,
    summary: formatShotOutcomeSummary(sim, 'Shot'),
  };
}

export function applyFreePlayAfterShot(
  state: BilliardsMatchState,
  sim: ShotSimResult,
  shootingSeat = 1,
): EightBallShotOutcome {
  let next: BilliardsMatchState = {
    ...state,
    balls: tagNewlyPocketedBySeat(state.balls, sim.balls, shootingSeat),
    shotsTaken: state.shotsTaken + 1,
    phase: 'aim',
  };

  if (sim.cueScratch) {
    const foul = foulFromScratch(state);
    next = enterBallInHand(next, foul.placementZone, shootingSeat);
    return {
      state: next,
      foul,
      frameWin: false,
      frameLoss: false,
      summary: formatShotOutcomeSummary(sim, `${foul.reason} — ball in hand`),
    };
  }

  return {
    state: { ...next, ballInHandSeat: null },
    foul: null,
    frameWin: false,
    frameLoss: false,
    summary: formatShotOutcomeSummary(sim, 'Shot'),
  };
}

function enterBallInHand(
  state: BilliardsMatchState,
  zone: BilliardsMatchState['placementZone'],
  forSeat: number,
): BilliardsMatchState {
  return {
    ...state,
    balls: state.balls.filter((b) => b.number !== 0),
    ballInHand: true,
    ballInHandSeat: forSeat,
    placementZone: zone,
    phase: 'place_cue',
    continueTurnSeat: null,
  };
}

function finishFrame(
  state: BilliardsMatchState,
  win: boolean,
  message: string,
  shootingSeat: number,
): EightBallShotOutcome {
  const winnerSeat = win ? shootingSeat : shootingSeat === 1 ? 2 : 1;
  return {
    state: {
      ...state,
      phase: 'finished',
      resultMessage: message,
      winnerSeat,
      ballInHandSeat: null,
    },
    foul: null,
    frameWin: win,
    frameLoss: !win,
    summary: message,
  };
}
