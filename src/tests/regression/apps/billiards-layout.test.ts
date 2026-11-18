import { buildAutoRackBalls, canPlaceBallAt, createEmptyPracticeState } from '@/apps/billiards/shared/billiards-layout';
import { simulateShot } from '@/apps/billiards/shared/billiards-physics';
import { applyEightBallAfterShot, applyFreePlayAfterShot } from '@/apps/billiards/shared/billiards-rules';
import { ensureBilliardsRapier } from '@/apps/billiards/shared/billiards-rapier-init';
import {
  createRapierShotSession,
  destroyRapierShotSession,
  readBilliardsRollFrame,
  stepRapierShotSession,
} from '@/apps/billiards/shared/billiards-rapier-sim';
import { rollingAngVelFromLinvel } from '@/apps/billiards/shared/billiards-rolling-kinematics';
import { overheadMarkRotationRad } from '@/apps/billiards/shared/billiards-overhead-ball-display';
import { integrateBilliardRollQuat, billiardIdentityQuat } from '@/apps/billiards/shared/billiards-roll-quat';
import * as THREE from 'three';
import {
  cueTipFromBall,
  cuePullDirection,
  maxCuePullAlongFromTip,
  pullPowerFromGripPoint,
} from '@/apps/billiards/shared/cue-geometry';
import { BALL_RADIUS, CUE_POWER_GRIP_MIN_FROM_TIP_PX } from '@/apps/billiards/shared/billiards-types';

beforeAll(async () => {
  await ensureBilliardsRapier();
});

describe('billiards layout', () => {
  test('auto rack produces cue plus fifteen object balls', () => {
    const balls = buildAutoRackBalls();
    expect(balls.filter((b) => b.number === 0)).toHaveLength(1);
    expect(balls.filter((b) => b.number > 0)).toHaveLength(15);
  });

  test('canPlaceBallAt rejects overlap', () => {
    const placed = buildAutoRackBalls();
    const cue = placed[0];
    expect(canPlaceBallAt(placed, cue.x, cue.y, 'ball-1', 'table')).toBe(false);
  });
});

describe('billiards rolling kinematics', () => {
  test('rollingAngVelFromLinvel matches no-slip on +X travel', () => {
    const w = rollingAngVelFromLinvel(10, 0, BALL_RADIUS);
    expect(w.y).toBe(0);
    expect(w.x).toBeCloseTo(0, 5);
    expect(w.z).toBeCloseTo(-10 / BALL_RADIUS, 5);
  });

  test('integrateBilliardRollQuat rotates about horizontal axis', () => {
    const q = billiardIdentityQuat();
    integrateBilliardRollQuat(q, BALL_RADIUS * Math.PI, 0, BALL_RADIUS);
    const len = Math.hypot(q.x, q.y, q.z, q.w);
    expect(len).toBeGreaterThan(0.99);
    expect(len).toBeLessThan(1.01);
    expect(Math.abs(q.z)).toBeGreaterThan(0.01);
  });

  test('overhead mark rotation changes when ball rolls on +X', () => {
    const q = billiardIdentityQuat();
    const before = overheadMarkRotationRad(
      new THREE.Quaternion(q.x, q.y, q.z, q.w),
    );
    /**
     * Roll **exactly half a turn**, derived from the radius rather than a fixed distance.
     *
     * Rolling along +X spins the ball about −Z, so its local +X axis stays in the XY plane and
     * `overheadMarkRotationRad` (which reads `atan2(z, x)`) can only return 0 or π. The assertion needs the
     * mark to reach π, i.e. a half turn — `dist = πr`.
     *
     * Careful: `integrateBilliardRollQuat` builds the quaternion from `half = (dist / r) * 0.5`, so `dist = πr`
     * gives a half-angle of π/2 (a half turn). `dist = 2πr` would be a full turn and come back as identity —
     * which is exactly why this test read 0 at first.
     */
    integrateBilliardRollQuat(q, BALL_RADIUS * Math.PI, 0, BALL_RADIUS);
    const after = overheadMarkRotationRad(new THREE.Quaternion(q.x, q.y, q.z, q.w));
    expect(Math.abs(after - before)).toBeGreaterThan(0.05);
  });

  test('Rapier body rotation accumulates during break (3D roll, not Y spin)', () => {
    const state = createEmptyPracticeState('free');
    state.balls = buildAutoRackBalls();
    const session = createRapierShotSession(state, {
      angleRad: 0,
      power: 0.85,
      englishX: 0,
      englishY: 0,
    });
    for (let i = 0; i < 180; i += 1) {
      stepRapierShotSession(session);
    }
    const frame = readBilliardsRollFrame(session, state);
    const cue = frame.poses.find((p) => p.number === 0);
    expect(cue).toBeDefined();
    expect(Math.abs(cue!.rotW)).toBeLessThan(0.999);
    destroyRapierShotSession(session);
  });
});

describe('billiards cue power', () => {
  test('pullPower reaches 100% at the rail along the cue axis', () => {
    const cue = { x: 42, y: 250 };
    const angleRad = 0;
    const tip = cueTipFromBall(cue, angleRad);
    const dir = cuePullDirection(angleRad);
    const along = maxCuePullAlongFromTip(tip, dir);
    const point = { x: tip.x + dir.x * along, y: tip.y + dir.y * along };
    expect(pullPowerFromGripPoint(point, cue, angleRad)).toBe(1);
  });

  test('pullPower is 0% at minimum grip along the cue (cancel shot)', () => {
    const cue = { x: 42, y: 250 };
    const angleRad = 0;
    const tip = cueTipFromBall(cue, angleRad);
    const dir = cuePullDirection(angleRad);
    const point = {
      x: tip.x + dir.x * CUE_POWER_GRIP_MIN_FROM_TIP_PX,
      y: tip.y + dir.y * CUE_POWER_GRIP_MIN_FROM_TIP_PX,
    };
    expect(pullPowerFromGripPoint(point, cue, angleRad)).toBe(0);
  });
});

describe('billiards physics', () => {
  test('simulateShot moves cue ball from rest', () => {
    const state = createEmptyPracticeState('free');
    state.balls = buildAutoRackBalls();
    state.phase = 'aim';
    state.layoutLocked = true;
    const cue = state.balls.find((b) => b.number === 0)!;
    const beforeX = cue.x;
    const result = simulateShot(state, {
      angleRad: 0,
      power: 0.8,
      englishX: 0,
      englishY: 0,
    });
    const afterCue = result.balls.find((b) => b.number === 0 && !b.pocketed);
    expect(afterCue).toBeDefined();
    expect(afterCue!.x).not.toBe(beforeX);
    expect(result.pocketedNumbers).toBeDefined();
  });
});

describe('billiards rules', () => {
  test('free play scratch yields ball in hand', () => {
    const state = createEmptyPracticeState('free');
    state.balls = buildAutoRackBalls();
    state.layoutLocked = true;
    state.phase = 'aim';
    state.shotsTaken = 1;
    const sim = simulateShot(state, { angleRad: Math.PI, power: 1, englishX: 0, englishY: 0 });
    const outcome = applyFreePlayAfterShot(state, sim);
    if (sim.cueScratch) {
      expect(outcome.state.phase).toBe('place_cue');
      expect(outcome.state.ballInHand).toBe(true);
    }
  });

  test('eight-ball early 8 loss finishes frame', () => {
    const state = createEmptyPracticeState('eight-ball');
    state.balls = buildAutoRackBalls();
    state.layoutLocked = true;
    state.phase = 'aim';
    state.shotsTaken = 1;
    state.playerGroup = null;
    const sim = {
      balls: state.balls.map((b) => (b.number === 8 ? { ...b, pocketed: true } : b)),
      cueScratch: false,
      firstHitNumber: 8,
      pocketedNumbers: [8],
      powerUsed: 0.5,
    };
    const outcome = applyEightBallAfterShot(state, sim, 1);
    expect(outcome.frameLoss).toBe(true);
    expect(outcome.state.phase).toBe('finished');
  });
});
