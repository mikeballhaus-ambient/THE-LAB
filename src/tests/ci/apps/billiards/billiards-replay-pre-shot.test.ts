import {
  matchStateFromPreShotBalls,
  resolveOpponentReplayPreShot,
} from '@/apps/billiards/shared/billiards-replay-pre-shot';
import type { BilliardsBall, BilliardsMatchState } from '@/apps/billiards/shared/billiards-types';
import { OPEN_BILLIARDS_SEAT_GROUPS } from '@/apps/billiards/shared/billiards-types';

const sampleBalls: BilliardsBall[] = [
  { id: 'cue', number: 0, x: 10, y: 20, pocketed: false },
  { id: '1', number: 1, x: 30, y: 40, pocketed: false },
];

function authoritativeAtShotSeven(): BilliardsMatchState {
  return {
    phase: 'aim',
    layoutLocked: true,
    rulesProfile: 'eight-ball',
    balls: [{ id: 'cue', number: 0, x: 1, y: 1, pocketed: false }],
    ballInHand: false,
    ballInHandSeat: null,
    placementZone: 'table',
    turnHistory: [{ seat: 2, summary: 'Pocketed 3' }],
    shotsTaken: 7,
    seatGroups: { ...OPEN_BILLIARDS_SEAT_GROUPS },
    resultMessage: null,
    winnerSeat: null,
    lastShotReplay: {
      seat: 2,
      angleRad: 0.2,
      power: 0.5,
      englishX: 0,
      englishY: 0,
      shotsTaken: 7,
      preShotBalls: sampleBalls,
      shotVarianceResolved: true,
    },
  };
}

describe('resolveOpponentReplayPreShot', () => {
  test('uses server preShotBalls with no baseline at high shotsTaken', () => {
    const auth = authoritativeAtShotSeven();
    const pre = resolveOpponentReplayPreShot(null, auth, auth.lastShotReplay);
    expect(pre).not.toBeNull();
    expect(pre!.balls).toEqual(sampleBalls);
    expect(pre!.shotsTaken).toBe(6);
  });

  test('consecutive replays each use their own preShotBalls', () => {
    const auth = authoritativeAtShotSeven();
    const ballsA: BilliardsBall[] = [{ id: 'cue', number: 0, x: 1, y: 1, pocketed: false }];
    const ballsB: BilliardsBall[] = [{ id: 'cue', number: 0, x: 2, y: 2, pocketed: false }];
    const replayA = { ...auth.lastShotReplay!, preShotBalls: ballsA, shotsTaken: 5 };
    const replayB = { ...auth.lastShotReplay!, preShotBalls: ballsB, shotsTaken: 7 };
    const preA = resolveOpponentReplayPreShot(null, auth, replayA);
    const preB = resolveOpponentReplayPreShot(null, auth, replayB);
    expect(preA!.balls).toEqual(ballsA);
    expect(preB!.balls).toEqual(ballsB);
  });

  test('prefers committed baseline when preShotBalls absent (legacy row)', () => {
    const auth = authoritativeAtShotSeven();
    const legacyReplay = { ...auth.lastShotReplay!, preShotBalls: [] as BilliardsBall[] };
    const baseline = { ...auth, shotsTaken: 6, phase: 'aim' as const };
    const pre = resolveOpponentReplayPreShot(baseline, auth, legacyReplay);
    expect(pre).toBe(baseline);
  });
});

describe('matchStateFromPreShotBalls', () => {
  test('clears replay stamps on pre-shot clone', () => {
    const auth = authoritativeAtShotSeven();
    const pre = matchStateFromPreShotBalls(auth, sampleBalls, 6);
    expect(pre.lastShotReplay).toBeNull();
    expect(pre.lastCuePlaceReplay).toBeNull();
  });
});
