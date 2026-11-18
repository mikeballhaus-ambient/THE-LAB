import { billiardsEightBallAdapter } from '@/apps/billiards/back-end/adapter';
import { applyEightBallAfterShot } from '@/apps/billiards/shared/billiards-rules';
import { ensureBilliardsRapier } from '@/apps/billiards/shared/billiards-rapier-init';
import { OPEN_BILLIARDS_SEAT_GROUPS } from '@/apps/billiards/shared/billiards-types';
import type { BilliardsMatchState } from '@/apps/billiards/shared/billiards-types';
import { resolveMatchClockSeat } from '@/shared/game-platform/resolve-match-clock-seat';

beforeAll(async () => {
  await ensureBilliardsRapier();
});

function afterAgentPocketsBall2(): BilliardsMatchState {
  const state: BilliardsMatchState = {
    phase: 'aim',
    layoutLocked: true,
    rulesProfile: 'eight-ball',
    balls: [
      { id: 'cue', number: 0, x: 200, y: 250, pocketed: false },
      { id: '2', number: 2, x: 500, y: 250, pocketed: false },
    ],
    ballInHand: false,
    ballInHandSeat: null,
    placementZone: 'table',
    turnHistory: [{ seat: 1, summary: 'Shot (20% power)' }],
    shotsTaken: 1,
    seatGroups: { ...OPEN_BILLIARDS_SEAT_GROUPS },
    resultMessage: null,
    winnerSeat: null,
  };
  const ballsAfter = state.balls.map((b) =>
    b.number === 2 ? { ...b, pocketed: true, pocketedBySeat: 2 } : b,
  );
  const outcome = applyEightBallAfterShot(
    state,
    {
      balls: ballsAfter,
      cueScratch: false,
      firstHitNumber: 1,
      pocketedNumbers: [2],
      powerUsed: 0.6,
    },
    2,
  );
  return {
    ...outcome.state,
    turnHistory: [...state.turnHistory, { seat: 2, summary: outcome.summary }],
  };
}

describe('billiardsEightBallAdapter seat progression', () => {
  test('createInitialState honors startingSeat for the break shooter', () => {
    const asBreaker = billiardsEightBallAdapter.createInitialState({
      gameId: 'billiards',
      opponentKind: 'ai',
      difficulty: 'easy',
      player1Id: 1,
      player2Id: 0,
      startingSeat: 1,
    }) as BilliardsMatchState;
    expect(asBreaker.continueTurnSeat).toBe(1);

    const aiBreaks = billiardsEightBallAdapter.createInitialState({
      gameId: 'billiards',
      opponentKind: 'ai',
      difficulty: 'easy',
      player1Id: 1,
      player2Id: 0,
      startingSeat: 2,
    }) as BilliardsMatchState;
    expect(aiBreaks.continueTurnSeat).toBe(2);
  });

  test('nine-ball competitive match honors random startingSeat', () => {
    const aiBreaksNine = billiardsEightBallAdapter.createInitialState({
      gameId: 'billiards',
      opponentKind: 'ai',
      difficulty: 'easy',
      player1Id: 1,
      player2Id: 0,
      startingSeat: 2,
      rules: { rulesProfile: 'nine-ball' },
    }) as BilliardsMatchState;
    expect(aiBreaksNine.rulesProfile).toBe('nine-ball');
    expect(aiBreaksNine.continueTurnSeat).toBe(2);
    expect(aiBreaksNine.balls.some((b) => b.number === 9)).toBe(true);
  });

  test('agent pockets solid 2 on open table — current seat stays 2', () => {
    const applied = afterAgentPocketsBall2();
    expect(applied.continueTurnSeat).toBe(2);
    expect(applied.seatGroups).toEqual({ 1: 'stripes', 2: 'solids' });

    const next = billiardsEightBallAdapter.nextSeatAfterMove!(
      applied,
      { type: 'shot' },
      2,
      applied,
    );
    expect(next).toBe(2);
  });

  test('human dry break — current seat goes to 2', () => {
    const state: BilliardsMatchState = {
      phase: 'aim',
      layoutLocked: true,
      rulesProfile: 'eight-ball',
      balls: [
        { id: 'cue', number: 0, x: 200, y: 250, pocketed: false },
        { id: '1', number: 1, x: 500, y: 250, pocketed: false },
      ],
      ballInHand: false,
      ballInHandSeat: null,
      placementZone: 'table',
      turnHistory: [],
      shotsTaken: 0,
      seatGroups: { ...OPEN_BILLIARDS_SEAT_GROUPS },
      resultMessage: null,
      winnerSeat: null,
    };
    const outcome = applyEightBallAfterShot(
      state,
      {
        balls: state.balls,
        cueScratch: false,
        firstHitNumber: 1,
        pocketedNumbers: [],
        powerUsed: 0.4,
      },
      1,
    );
    expect(outcome.state.continueTurnSeat).toBe(2);
    const applied = { ...outcome.state, turnHistory: [{ seat: 1, summary: outcome.summary }] };
    const next = billiardsEightBallAdapter.nextSeatAfterMove!(
      applied,
      { type: 'shot' },
      1,
      applied,
    );
    expect(next).toBe(2);
  });

  test('agent pockets solid 6 with closed groups — seat stays 2', () => {
    const state: BilliardsMatchState = {
      phase: 'aim',
      layoutLocked: true,
      rulesProfile: 'eight-ball',
      balls: [
        { id: 'cue', number: 0, x: 200, y: 250, pocketed: false },
        { id: '6', number: 6, x: 520, y: 260, pocketed: false },
      ],
      ballInHand: false,
      ballInHandSeat: null,
      placementZone: 'table',
      turnHistory: [],
      shotsTaken: 4,
      seatGroups: { 1: 'stripes', 2: 'solids' },
      resultMessage: null,
      winnerSeat: null,
    };
    const ballsAfter = state.balls.map((b) =>
      b.number === 6 ? { ...b, pocketed: true, pocketedBySeat: 2 } : b,
    );
    const outcome = applyEightBallAfterShot(
      state,
      {
        balls: ballsAfter,
        cueScratch: false,
        firstHitNumber: 6,
        pocketedNumbers: [6],
        powerUsed: 0.61,
      },
      2,
    );
    expect(outcome.foul).toBeNull();
    expect(outcome.state.continueTurnSeat).toBe(2);
    const applied = {
      ...outcome.state,
      turnHistory: [{ seat: 2, summary: outcome.summary }],
    };
  const clock = resolveMatchClockSeat(applied, billiardsEightBallAdapter, { type: 'shot' }, 2);
    expect(clock).toBe(2);
    expect(
      billiardsEightBallAdapter.nextSeatAfterMove!(applied, { type: 'shot' }, 2, applied),
    ).toBe(2);
  });

  test('applyMove shot appends exactly one turnHistory row', () => {
    const before: BilliardsMatchState = {
      phase: 'aim',
      layoutLocked: true,
      rulesProfile: 'eight-ball',
      balls: [
        { id: 'cue', number: 0, x: 200, y: 250, pocketed: false },
        { id: '1', number: 1, x: 520, y: 250, pocketed: false },
      ],
      ballInHand: false,
      ballInHandSeat: null,
      placementZone: 'table',
      turnHistory: [{ seat: 1, summary: 'Shot' }],
      shotsTaken: 1,
      seatGroups: { ...OPEN_BILLIARDS_SEAT_GROUPS },
      resultMessage: null,
      winnerSeat: null,
    };
    const after = billiardsEightBallAdapter.applyMove(
      before,
      { type: 'shot', angleRad: 0, power: 0.28, englishX: 0, englishY: 0 },
      2,
    ) as BilliardsMatchState;
    expect(after.turnHistory.length).toBe(before.turnHistory.length + 1);
    expect(after.turnHistory.at(-1)?.seat).toBe(2);
    expect(after.shotsTaken).toBe(before.shotsTaken + 1);
  });

  test('legacy state without continueTurnSeat still keeps agent after pocket', () => {
    const applied = afterAgentPocketsBall2();
    delete (applied as { continueTurnSeat?: number | null }).continueTurnSeat;
    const next = billiardsEightBallAdapter.nextSeatAfterMove!(
      applied,
      { type: 'shot' },
      2,
      applied,
    );
    expect(next).toBe(2);
  });
});
