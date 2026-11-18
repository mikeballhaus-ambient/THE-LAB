import {
  applyBreakShotVariance,
  applyRackMicroVariance,
  buildRackedBallsWithVariance,
  isAuthoritativeBreakShot,
  mulberry32,
  resolveShotForSimulation,
} from '@/apps/billiards/shared/billiards-break-variance';
import type { BilliardsMatchState, BilliardsShotPayload } from '@/apps/billiards/shared/billiards-types';
import { OPEN_BILLIARDS_SEAT_GROUPS } from '@/apps/billiards/shared/billiards-types';

function breakState(seed: number): BilliardsMatchState {
  const { balls, physicsVarianceSeed } = buildRackedBallsWithVariance('eight-ball', seed);
  return {
    phase: 'aim',
    layoutLocked: true,
    rulesProfile: 'eight-ball',
    balls,
    ballInHand: false,
    ballInHandSeat: null,
    placementZone: 'table',
    turnHistory: [],
    shotsTaken: 0,
    seatGroups: { ...OPEN_BILLIARDS_SEAT_GROUPS },
    resultMessage: null,
    winnerSeat: null,
    physicsVarianceSeed,
  };
}

const nominalShot: BilliardsShotPayload = {
  angleRad: -Math.PI * 0.12,
  power: 1,
  englishX: 0,
  englishY: 0,
};

describe('billiards break variance', () => {
  test('mulberry32 is deterministic', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    expect(a()).toBe(b());
    expect(a()).toBe(b());
  });

  test('rack micro-variance moves object balls', () => {
    const { balls: raw } = buildRackedBallsWithVariance('eight-ball', 1);
    const jittered = applyRackMicroVariance(raw, 99);
    const moved = jittered.some((b, i) => b.number > 0 && (b.x !== raw[i]!.x || b.y !== raw[i]!.y));
    expect(moved).toBe(true);
  });

  test('different rack seeds produce different layouts', () => {
    const a = buildRackedBallsWithVariance('eight-ball', 111).balls;
    const b = buildRackedBallsWithVariance('eight-ball', 222).balls;
    const ball11a = a.find((x) => x.number === 11)!;
    const ball11b = b.find((x) => x.number === 11)!;
    expect(ball11a.x).not.toBe(ball11b.x);
  });

  test('break shot jitter only on first competitive shot', () => {
    const state = breakState(0xabc);
    expect(isAuthoritativeBreakShot(state)).toBe(true);
    const tweaked = applyBreakShotVariance(state, nominalShot);
    expect(tweaked.angleRad).not.toBe(nominalShot.angleRad);
    const afterBreak = { ...state, shotsTaken: 1 };
    expect(resolveShotForSimulation(afterBreak, nominalShot)).toEqual(nominalShot);
  });

  test('break perturbation magnitude stays within configured band', () => {
    const state = breakState(7);
    const tweaked = applyBreakShotVariance(state, nominalShot);
    const delta = Math.abs(tweaked.angleRad - nominalShot.angleRad);
    expect(delta).toBeGreaterThanOrEqual(0.01);
    expect(delta).toBeLessThanOrEqual(0.05);
  });

  test('applying break variance twice diverges from server replay payload', () => {
    const state = breakState(0xfeed);
    const serverResolved = resolveShotForSimulation(state, nominalShot);
    const clientDouble = resolveShotForSimulation(state, serverResolved);
    expect(clientDouble.angleRad).not.toBe(serverResolved.angleRad);
  });
});
