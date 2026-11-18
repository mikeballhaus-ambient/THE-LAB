import {
  opponentCueAnimationVarianceUnit,
  shortestAngleDelta,
} from '@/apps/billiards/front-end/composables/useBilliardsOpponentCueAnimation';

describe('billiards opponent cue animation helpers', () => {
  test('shortestAngleDelta wraps across π', () => {
    expect(shortestAngleDelta(0, Math.PI / 2)).toBeCloseTo(Math.PI / 2);
    expect(shortestAngleDelta(0, (7 * Math.PI) / 4)).toBeCloseTo(-Math.PI / 4);
  });

  test('variance unit is deterministic and bounded', () => {
    const a = opponentCueAnimationVarianceUnit(1.25);
    const b = opponentCueAnimationVarianceUnit(1.25);
    const c = opponentCueAnimationVarianceUnit(2.5);
    expect(a).toBe(b);
    expect(a).toBeGreaterThanOrEqual(0);
    expect(a).toBeLessThan(1);
    expect(c).not.toBe(a);
  });
});
