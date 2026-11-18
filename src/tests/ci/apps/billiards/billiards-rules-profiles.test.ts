import {
  applyEightBallAfterShot,
  applyNineBallAfterShot,
  eightBallShooterKeepsTurn,
  isHumanBallInHandPlacement,
  resolveBilliardsEffectivePlacementZone,
  scratchBallInHandPlacementZone,
  reconcileCompetitiveCueBall,
  objectGroupsPocketed,
  pocketedObjectNumbersForEightBallRules,
  tagNewlyPocketedBySeat,
  tryAssignSeatGroups,
} from '@/apps/billiards/shared/billiards-rules';
import { OPEN_BILLIARDS_SEAT_GROUPS } from '@/apps/billiards/shared/billiards-types';
import type { BilliardsMatchState } from '@/apps/billiards/shared/billiards-types';
import type { ShotSimResult } from '@/apps/billiards/shared/billiards-physics';

function baseState(overrides: Partial<BilliardsMatchState> = {}): BilliardsMatchState {
  return {
    phase: 'aim',
    layoutLocked: true,
    rulesProfile: 'eight-ball',
    balls: [
      { id: 'cue', number: 0, x: 200, y: 250, pocketed: false },
      { id: '3', number: 3, x: 500, y: 250, pocketed: false },
      { id: '10', number: 10, x: 520, y: 260, pocketed: false },
    ],
    ballInHand: false,
    ballInHandSeat: null,
    placementZone: 'table',
    turnHistory: [],
    shotsTaken: 0,
    seatGroups: { ...OPEN_BILLIARDS_SEAT_GROUPS },
    resultMessage: null,
    winnerSeat: null,
    ...overrides,
  };
}

function sim(partial: Partial<ShotSimResult>): ShotSimResult {
  return {
    balls: baseState().balls,
    cueScratch: false,
    firstHitNumber: 3,
    pocketedNumbers: [],
    powerUsed: 0.5,
    kitchenHeadStringFoul: false,
    ...partial,
  };
}

describe('tagNewlyPocketedBySeat', () => {
  test('preserves pocketedBySeat when physics output omits it on earlier pockets', () => {
    const prev = [
      { id: 'b10', number: 10, x: 0, y: 0, pocketed: true, pocketedBySeat: 2 },
      { id: 'cue', number: 0, x: 100, y: 100, pocketed: false },
      { id: 'b3', number: 3, x: 200, y: 200, pocketed: false },
    ];
    const nextFromSim = [
      { id: 'b10', number: 10, x: 0, y: 0, pocketed: true },
      { id: 'cue', number: 0, x: 120, y: 100, pocketed: false },
      { id: 'b3', number: 3, x: 220, y: 200, pocketed: false },
    ];
    const tagged = tagNewlyPocketedBySeat(prev, nextFromSim, 1);
    expect(tagged.find((b) => b.id === 'b10')?.pocketedBySeat).toBe(2);
  });
});

describe('eight-ball open table groups', () => {
  test('mixed solids and stripes on one shot keeps table open', () => {
    expect(objectGroupsPocketed([2, 11])).toEqual(new Set(['solids', 'stripes']));
    const assigned = tryAssignSeatGroups(OPEN_BILLIARDS_SEAT_GROUPS, 1, [2, 11]);
    expect(assigned).toEqual(OPEN_BILLIARDS_SEAT_GROUPS);
  });

  test('single group pocketed assigns seats', () => {
    const assigned = tryAssignSeatGroups(OPEN_BILLIARDS_SEAT_GROUPS, 1, [2, 3]);
    expect(assigned).toEqual({ 1: 'solids', 2: 'stripes' });
  });

  test('open table: pocket stripe on break without scratch keeps table and assigns groups', () => {
    const state = baseState({ shotsTaken: 0, seatGroups: { ...OPEN_BILLIARDS_SEAT_GROUPS } });
    const ballsAfter = state.balls.map((b) =>
      b.number === 15 ? { ...b, pocketed: true, pocketedBySeat: 2 } : b,
    );
    const outcome = applyEightBallAfterShot(
      state,
      sim({
        cueScratch: false,
        firstHitNumber: 1,
        pocketedNumbers: [15],
        balls: ballsAfter,
      }),
      2,
    );
    expect(outcome.foul).toBeNull();
    expect(outcome.state.seatGroups).toEqual({ 1: 'solids', 2: 'stripes' });
    expect(outcome.state.continueTurnSeat).toBe(2);
    expect(outcome.summary).toContain('pocketed 15');
  });

  test('applyEightBallAfterShot assigns on legal single-group pocket', () => {
    const state = baseState();
    const outcome = applyEightBallAfterShot(
      state,
      sim({
        firstHitNumber: 3,
        pocketedNumbers: [0, 3],
        balls: state.balls.map((b) => (b.number === 3 ? { ...b, pocketed: true } : b)),
      }),
      1,
    );
    expect(outcome.state.seatGroups).toEqual({ 1: 'solids', 2: 'stripes' });
  });

  test('open table: pockets two solids on break keeps turn and assigns groups', () => {
    const state = baseState({
      seatGroups: { ...OPEN_BILLIARDS_SEAT_GROUPS },
      shotsTaken: 0,
    });
    const ballsAfter = state.balls.map((b) =>
      b.number === 3 || b.number === 5 ? { ...b, pocketed: true, pocketedBySeat: 2 } : b,
    );
    const outcome = applyEightBallAfterShot(
      state,
      sim({
        firstHitNumber: 1,
        pocketedNumbers: [3, 5],
        balls: ballsAfter,
      }),
      2,
    );
    expect(outcome.foul).toBeNull();
    expect(outcome.state.seatGroups).toEqual({ 1: 'stripes', 2: 'solids' });
    expect(outcome.state.continueTurnSeat).toBe(2);
    expect(outcome.summary).toContain('pocketed 3');
  });

  test('open table: mixed pocket list still keeps turn when any object ball dropped', () => {
    expect(
      eightBallShooterKeepsTurn(
        baseState({ seatGroups: { ...OPEN_BILLIARDS_SEAT_GROUPS } }),
        OPEN_BILLIARDS_SEAT_GROUPS,
        2,
        [3, 11],
      ),
    ).toBe(true);
  });

  test('open table: Lab Assistant pockets single solid — keeps turn and assigns groups', () => {
    const state = baseState({
      seatGroups: { ...OPEN_BILLIARDS_SEAT_GROUPS },
      shotsTaken: 1,
      balls: [
        { id: 'cue', number: 0, x: 200, y: 250, pocketed: false },
        { id: '1', number: 1, x: 500, y: 250, pocketed: false },
      ],
    });
    const outcome = applyEightBallAfterShot(
      state,
      sim({
        firstHitNumber: 1,
        pocketedNumbers: [1],
        balls: state.balls.map((b) => (b.number === 1 ? { ...b, pocketed: true } : b)),
      }),
      2,
    );
    expect(outcome.state.seatGroups).toEqual({ 1: 'stripes', 2: 'solids' });
    expect(outcome.state.continueTurnSeat).toBe(2);
    expect(outcome.summary).toContain('solids for seat 2');
  });

  test('open table: incidental opposite-group drop uses first-contact group for keep-turn', () => {
    const state = baseState({ seatGroups: { ...OPEN_BILLIARDS_SEAT_GROUPS } });
    const ballsAfter = state.balls.map((b) =>
      b.number === 1 || b.number === 11 ? { ...b, pocketed: true } : b,
    );
    const filtered = pocketedObjectNumbersForEightBallRules(
      state,
      ballsAfter,
      sim({ firstHitNumber: 1, pocketedNumbers: [1, 11] }),
    );
    expect(filtered).toEqual([1]);
    expect(
      eightBallShooterKeepsTurn(state, { 1: 'stripes', 2: 'solids' }, 2, filtered),
    ).toBe(true);
  });

  test('open table: cue pocketed but cueScratch false still treats as scratch', () => {
    const state = baseState({
      shotsTaken: 0,
      seatGroups: { ...OPEN_BILLIARDS_SEAT_GROUPS },
      balls: [
        { id: 'cue', number: 0, x: 200, y: 250, pocketed: false },
        { id: '3', number: 3, x: 500, y: 250, pocketed: false },
        { id: '13', number: 13, x: 520, y: 260, pocketed: false },
      ],
    });
    const ballsAfter = state.balls.map((b) => {
      if (b.number === 0 || b.number === 13) {
        return { ...b, pocketed: true };
      }
      return b;
    });
    const outcome = applyEightBallAfterShot(
      state,
      sim({
        cueScratch: false,
        firstHitNumber: 3,
        pocketedNumbers: [13],
        balls: ballsAfter,
      }),
      2,
    );
    expect(outcome.foul?.reason).toBe('Scratch');
    expect(outcome.state.phase).toBe('place_cue');
    expect(outcome.state.ballInHand).toBe(true);
    expect(outcome.state.balls.some((b) => b.number === 0)).toBe(false);
  });

  test('kitchen: first contact before head string — opponent ball in hand, shot still resolved', () => {
    const state = baseState({
      placementZone: 'kitchen',
      shotsTaken: 1,
      balls: [
        { id: 'cue', number: 0, x: 200, y: 80, pocketed: false },
        { id: '3', number: 3, x: 220, y: 90, pocketed: false },
      ],
    });
    const outcome = applyEightBallAfterShot(
      state,
      sim({ firstHitNumber: 3, kitchenHeadStringFoul: true }),
      1,
    );
    expect(outcome.foul?.reason).toBe('Did not cross head string');
    expect(outcome.state.phase).toBe('place_cue');
    expect(outcome.state.ballInHandSeat).toBe(2);
    expect(outcome.state.placementZone).toBe('table');
  });

  test('kitchen: crossed head string before contact — play continues', () => {
    const state = baseState({
      placementZone: 'kitchen',
      shotsTaken: 1,
      balls: [
        { id: 'cue', number: 0, x: 200, y: 80, pocketed: false },
        { id: '3', number: 3, x: 500, y: 250, pocketed: false },
      ],
    });
    const outcome = applyEightBallAfterShot(
      state,
      sim({ firstHitNumber: 3, kitchenHeadStringFoul: false }),
      1,
    );
    expect(outcome.foul).toBeNull();
    expect(outcome.state.phase).toBe('aim');
    expect(outcome.state.continueTurnSeat).toBe(2);
  });

  test('open table: scratch with pocketed balls — opponent ball in hand (groups still assigned)', () => {
    const state = baseState({ seatGroups: { ...OPEN_BILLIARDS_SEAT_GROUPS }, shotsTaken: 0 });
    const ballsAfter = state.balls.map((b) => {
      if (b.number === 0) {
        return { ...b, pocketed: true };
      }
      if (b.number === 1 || b.number === 11) {
        return { ...b, pocketed: true };
      }
      return b;
    });
    const outcome = applyEightBallAfterShot(
      state,
      sim({
        cueScratch: true,
        firstHitNumber: 1,
        pocketedNumbers: [0, 1, 11],
        balls: ballsAfter,
      }),
      2,
    );
    expect(outcome.foul?.reason).toBe('Scratch');
    expect(outcome.state.ballInHandSeat).toBe(1);
    expect(outcome.state.continueTurnSeat).toBeNull();
    expect(outcome.state.placementZone).toBe('kitchen');
    expect(outcome.state.seatGroups).toEqual({ 1: 'stripes', 2: 'solids' });
  });

  test('open table / break: first contact solid, stripe pocketed — no wrong-ball foul', () => {
    const state = baseState({
      shotsTaken: 0,
      balls: [
        { id: 'cue', number: 0, x: 200, y: 250, pocketed: false },
        { id: '1', number: 1, x: 500, y: 250, pocketed: false },
        { id: '11', number: 11, x: 520, y: 260, pocketed: true },
      ],
    });
    const outcome = applyEightBallAfterShot(
      state,
      sim({
        firstHitNumber: 1,
        pocketedNumbers: [11],
        balls: state.balls,
      }),
      1,
    );
    expect(outcome.foul).toBeNull();
    expect(outcome.state.seatGroups).toEqual({ 1: 'stripes', 2: 'solids' });
  });

  test('legal hit on group with no pocket passes turn', () => {
    const state = baseState({
      seatGroups: { 1: 'stripes', 2: 'solids' },
    });
    const outcome = applyEightBallAfterShot(
      state,
      sim({ firstHitNumber: 11, pocketedNumbers: [] }),
      1,
    );
    expect(outcome.foul).toBeNull();
    expect(outcome.state.continueTurnSeat).toBe(2);
  });

  test('pocketing own group ball keeps turn', () => {
    const state = baseState({
      seatGroups: { 1: 'stripes', 2: 'solids' },
      balls: [
        { id: 'cue', number: 0, x: 200, y: 250, pocketed: false },
        { id: '11', number: 11, x: 500, y: 250, pocketed: true },
        { id: '3', number: 3, x: 520, y: 260, pocketed: false },
      ],
    });
    const outcome = applyEightBallAfterShot(
      state,
      sim({
        firstHitNumber: 11,
        pocketedNumbers: [11],
        balls: state.balls,
      }),
      1,
    );
    expect(outcome.state.continueTurnSeat).toBe(1);
    expect(eightBallShooterKeepsTurn(state, outcome.state.seatGroups, 1, [11])).toBe(true);
  });

  test('closed table: pocket own and opponent group on one shot keeps turn when own group dropped', () => {
    const state = baseState({
      seatGroups: { 1: 'solids', 2: 'stripes' },
      balls: [
        { id: 'cue', number: 0, x: 200, y: 250, pocketed: false },
        { id: '6', number: 6, x: 500, y: 250, pocketed: false },
        { id: '13', number: 13, x: 520, y: 260, pocketed: false },
      ],
    });
    const ballsAfter = state.balls.map((b) =>
      b.number === 6 || b.number === 13 ? { ...b, pocketed: true } : b,
    );
    const outcome = applyEightBallAfterShot(
      state,
      sim({
        firstHitNumber: 6,
        pocketedNumbers: [6, 13],
        balls: ballsAfter,
      }),
      1,
    );
    expect(outcome.foul).toBeNull();
    expect(outcome.state.continueTurnSeat).toBe(1);
    expect(outcome.state.placementZone).toBe('table');
    expect(outcome.summary).toContain('pocketed 6');
    expect(outcome.summary).toContain('13');
  });

  test('closed table: wrong group first contact is still a foul', () => {
    const state = baseState({
      seatGroups: { 1: 'solids', 2: 'stripes' },
    });
    const outcome = applyEightBallAfterShot(
      state,
      sim({ firstHitNumber: 11, pocketedNumbers: [] }),
      1,
    );
    expect(outcome.foul?.reason).toBe('Wrong ball first');
  });

  test('eight first contact with group remaining passes turn only, not loss', () => {
    const state = baseState({
      seatGroups: { 1: 'stripes', 2: 'solids' },
      balls: [
        { id: 'cue', number: 0, x: 200, y: 250, pocketed: false },
        { id: '2', number: 2, x: 500, y: 250, pocketed: false },
        { id: '8', number: 8, x: 520, y: 260, pocketed: false },
      ],
    });
    const outcome = applyEightBallAfterShot(
      state,
      sim({ firstHitNumber: 8, pocketedNumbers: [], balls: state.balls }),
      2,
    );
    expect(outcome.foul?.reason).toBe('Eight ball first');
    expect(outcome.state.phase).toBe('aim');
    expect(outcome.state.ballInHand).toBe(false);
    expect(outcome.state.ballInHandSeat).toBeNull();
    expect(outcome.state.continueTurnSeat).toBe(1);
    expect(outcome.state.phase).not.toBe('finished');
  });

  test('closed table: Lab Assistant pockets stripe 14 keeps turn', () => {
    const state = baseState({
      seatGroups: { 1: 'solids', 2: 'stripes' },
      balls: [
        { id: 'cue', number: 0, x: 200, y: 250, pocketed: false },
        { id: '14', number: 14, x: 500, y: 250, pocketed: false },
        { id: '2', number: 2, x: 520, y: 260, pocketed: false },
      ],
    });
    const ballsAfter = state.balls.map((b) =>
      b.number === 14 ? { ...b, pocketed: true, pocketedBySeat: 2 } : b,
    );
    const outcome = applyEightBallAfterShot(
      state,
      sim({
        firstHitNumber: 14,
        pocketedNumbers: [14],
        balls: ballsAfter,
      }),
      2,
    );
    expect(outcome.foul).toBeNull();
    expect(outcome.state.continueTurnSeat).toBe(2);
    expect(outcome.summary).toContain('pocketed 14');
  });

  test('closed table: clean stripe 15 pocket keeps turn (first hit 15 only)', () => {
    const state = baseState({
      seatGroups: { 1: 'stripes', 2: 'solids' },
      balls: [
        { id: 'cue', number: 0, x: 200, y: 250, pocketed: false },
        { id: '15', number: 15, x: 500, y: 250, pocketed: false },
        { id: '3', number: 3, x: 520, y: 260, pocketed: false },
      ],
    });
    const ballsAfter = state.balls.map((b) =>
      b.number === 15 ? { ...b, pocketed: true, pocketedBySeat: 1 } : b,
    );
    const outcome = applyEightBallAfterShot(
      state,
      sim({
        firstHitNumber: 15,
        pocketedNumbers: [],
        balls: ballsAfter,
      }),
      1,
    );
    expect(outcome.foul).toBeNull();
    expect(outcome.state.continueTurnSeat).toBe(1);
    expect(outcome.summary).toContain('pocketed 15');
  });

  test('agent open break — pocket stripe 11 with solid first contact, then no foul on that stroke', () => {
    const state = baseState({
      shotsTaken: 1,
      seatGroups: { ...OPEN_BILLIARDS_SEAT_GROUPS },
      turnHistory: [{ seat: 1, summary: 'Shot (40% power)' }],
      balls: [
        { id: 'cue', number: 0, x: 220, y: 250, pocketed: false },
        { id: '1', number: 1, x: 500, y: 250, pocketed: false },
        { id: '11', number: 11, x: 520, y: 260, pocketed: false },
      ],
    });
    const ballsAfter = state.balls.map((b) =>
      b.number === 11 ? { ...b, pocketed: true, pocketedBySeat: 2 } : b,
    );
    const outcome = applyEightBallAfterShot(
      state,
      sim({
        firstHitNumber: 1,
        pocketedNumbers: [11],
        balls: ballsAfter,
      }),
      2,
    );
    expect(outcome.foul).toBeNull();
    expect(outcome.state.seatGroups).toEqual({ 1: 'solids', 2: 'stripes' });
    expect(outcome.state.continueTurnSeat).toBe(2);
    expect(outcome.summary).toContain('pocketed 11');
  });

  test('after groups assigned — wrong first contact without pocket is a foul', () => {
    const state = baseState({
      shotsTaken: 2,
      seatGroups: { 1: 'solids', 2: 'stripes' },
      turnHistory: [
        { seat: 2, summary: 'Shot — stripes for seat 2 — pocketed 11 (29% power)' },
      ],
    });
    const outcome = applyEightBallAfterShot(
      state,
      sim({ firstHitNumber: 3, pocketedNumbers: [] }),
      2,
    );
    expect(outcome.foul?.reason).toBe('Wrong ball first');
    expect(outcome.state.ballInHand).toBe(false);
    expect(outcome.state.ballInHandSeat).toBeNull();
    expect(outcome.state.continueTurnSeat).toBe(1);
  });

  test('closed table: pockets own group despite incidental wrong first contact', () => {
    const state = baseState({
      seatGroups: { 1: 'stripes', 2: 'solids' },
      balls: [
        { id: 'cue', number: 0, x: 200, y: 250, pocketed: false },
        { id: '3', number: 3, x: 480, y: 250, pocketed: false },
        { id: '12', number: 12, x: 500, y: 250, pocketed: false },
      ],
    });
    const ballsAfter = state.balls.map((b) =>
      b.number === 12 ? { ...b, pocketed: true, pocketedBySeat: 1 } : b,
    );
    const outcome = applyEightBallAfterShot(
      state,
      sim({ firstHitNumber: 3, pocketedNumbers: [12], balls: ballsAfter }),
      1,
    );
    expect(outcome.foul).toBeNull();
    expect(outcome.state.continueTurnSeat).toBe(1);
    expect(outcome.summary).toContain('pocketed 12');
  });

  test('eight pocketed on wrong ball first foul loses frame', () => {
    const state = baseState({
      seatGroups: { 1: 'stripes', 2: 'solids' },
      balls: [
        { id: 'cue', number: 0, x: 200, y: 250, pocketed: false },
        { id: '11', number: 11, x: 500, y: 250, pocketed: false },
        { id: '8', number: 8, x: 520, y: 260, pocketed: false },
        { id: '2', number: 2, x: 540, y: 260, pocketed: false },
      ],
    });
    const outcome = applyEightBallAfterShot(
      state,
      sim({
        firstHitNumber: 11,
        pocketedNumbers: [8],
        balls: state.balls.map((b) => (b.number === 8 ? { ...b, pocketed: true } : b)),
      }),
      2,
    );
    expect(outcome.frameLoss).toBe(true);
    expect(outcome.state.phase).toBe('finished');
    expect(outcome.state.winnerSeat).toBe(1);
  });
});

describe('nine-ball', () => {
  test('fails when lowest ball is not hit first', () => {
    const state = baseState({
      rulesProfile: 'nine-ball',
      balls: [
        { id: 'cue', number: 0, x: 200, y: 250, pocketed: false },
        { id: '1', number: 1, x: 500, y: 250, pocketed: false },
        { id: '2', number: 2, x: 540, y: 250, pocketed: false },
      ],
    });
    const outcome = applyNineBallAfterShot(
      state,
      sim({ firstHitNumber: 2, pocketedNumbers: [] }),
      1,
    );
    expect(outcome.foul?.reason).toMatch(/lowest/i);
    expect(outcome.state.ballInHand).toBe(false);
    expect(outcome.state.continueTurnSeat).toBe(2);
  });
});

describe('reconcileCompetitiveCueBall', () => {
  test('place_cue ball in hand strips stale cue instead of flipping to aim', () => {
    const state = baseState({
      phase: 'place_cue',
      ballInHand: true,
      ballInHandSeat: 1,
      placementZone: 'kitchen',
      balls: [
        { id: 'cue', number: 0, x: 200, y: 100, pocketed: false },
        { id: '3', number: 3, x: 500, y: 250, pocketed: false },
      ],
    });
    const next = reconcileCompetitiveCueBall(state, 2);
    expect(next.phase).toBe('place_cue');
    expect(next.ballInHand).toBe(true);
    expect(next.balls.some((b) => b.number === 0)).toBe(false);
  });
});

describe('resolveBilliardsEffectivePlacementZone', () => {
  test('explicit kitchen / table wins', () => {
    expect(resolveBilliardsEffectivePlacementZone({ placementZone: 'kitchen', shotsTaken: 9 })).toBe(
      'kitchen',
    );
    expect(resolveBilliardsEffectivePlacementZone({ placementZone: 'table', shotsTaken: 0 })).toBe(
      'table',
    );
  });

  test('missing zone mirrors break-foul kitchen rule', () => {
    expect(scratchBallInHandPlacementZone(0)).toBe('kitchen');
    expect(scratchBallInHandPlacementZone(1)).toBe('table');
    expect(
      resolveBilliardsEffectivePlacementZone({
        placementZone: undefined as unknown as 'table',
        shotsTaken: 0,
      }),
    ).toBe('kitchen');
    expect(
      resolveBilliardsEffectivePlacementZone({
        placementZone: undefined as unknown as 'table',
        shotsTaken: 1,
      }),
    ).toBe('table');
  });
});

describe('scratchBallInHandPlacementZone (WPA-style)', () => {
  test('post-break scratch awards full-table ball in hand', () => {
    const state = baseState({
      shotsTaken: 1,
      seatGroups: { 1: 'solids', 2: 'stripes' },
      balls: baseState().balls.map((b) =>
        b.number === 0 ? { ...b, pocketed: true } : b,
      ),
    });
    const outcome = applyEightBallAfterShot(
      state,
      sim({ cueScratch: true, pocketedNumbers: [0], balls: state.balls }),
      2,
    );
    expect(outcome.foul?.reason).toBe('Scratch');
    expect(outcome.state.placementZone).toBe('table');
    expect(outcome.state.ballInHandSeat).toBe(1);
  });
});

describe('isHumanBallInHandPlacement', () => {
  test('true for assigned seat in place_cue', () => {
    const state = baseState({
      phase: 'place_cue',
      ballInHand: true,
      ballInHandSeat: 1,
      placementZone: 'kitchen',
      balls: [{ id: '3', number: 3, x: 500, y: 250, pocketed: false }],
    });
    expect(isHumanBallInHandPlacement(state, 1)).toBe(true);
    expect(isHumanBallInHandPlacement(state, 2)).toBe(false);
  });

  test('false outside ball-in-hand', () => {
    const state = baseState({ phase: 'aim', ballInHand: false });
    expect(isHumanBallInHandPlacement(state, 1)).toBe(false);
  });
});
