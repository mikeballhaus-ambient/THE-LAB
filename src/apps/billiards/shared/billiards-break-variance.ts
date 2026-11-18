import { buildRackForRulesProfile } from './billiards-layout';
import type {
  BilliardsBall,
  BilliardsMatchState,
  BilliardsRulesProfile,
  BilliardsShotPayload,
} from './billiards-types';

/** Deterministic PRNG (Mulberry32) — server + client must match for roll preview. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createPhysicsVarianceSeed(): number {
  return (Math.floor(Math.random() * 0x7fffffff) ^ (Date.now() & 0x7fffffff)) >>> 0;
}

/** First competitive shot after layout lock (break). */
export function isAuthoritativeBreakShot(state: BilliardsMatchState): boolean {
  return state.layoutLocked && state.rulesProfile !== 'free' && state.shotsTaken === 0;
}

/** Sub-ball placement noise on auto rack — real racks are never pixel-perfect. */
const RACK_XY_JITTER = 1.2;

/** Break-only aim/speed noise (radians / normalized power / english). */
const BREAK_ANGLE_MIN_RAD = 0.01;
const BREAK_ANGLE_MAX_RAD = 0.05;
const BREAK_POWER_JITTER = 0.018;
const BREAK_ENGLISH_JITTER = 0.035;

const DEFAULT_VARIANCE_SEED = 0x51a9_0e7d;

export function shotVarianceSeed(state: BilliardsMatchState): number {
  const base = state.physicsVarianceSeed ?? DEFAULT_VARIANCE_SEED;
  return (base ^ Math.imul(state.shotsTaken, 0x85eb_ca6b)) >>> 0;
}

export function applyRackMicroVariance(balls: BilliardsBall[], seed: number): BilliardsBall[] {
  const rnd = mulberry32(seed ^ 0x9e37_79b9);
  return balls.map((b) => {
    if (b.number === 0 || b.pocketed) {
      return b;
    }
    const dx = (rnd() * 2 - 1) * RACK_XY_JITTER;
    const dy = (rnd() * 2 - 1) * RACK_XY_JITTER;
    return { ...b, x: b.x + dx, y: b.y + dy };
  });
}

export function buildRackedBallsWithVariance(
  profile: BilliardsRulesProfile,
  seed: number,
): { balls: BilliardsBall[]; physicsVarianceSeed: number } {
  const raw = buildRackForRulesProfile(profile);
  return {
    balls: applyRackMicroVariance(raw, seed),
    physicsVarianceSeed: seed,
  };
}

/** Perturb only the break shot so identical UI input does not replay the same spread. */
export function applyBreakShotVariance(
  state: BilliardsMatchState,
  shot: BilliardsShotPayload,
): BilliardsShotPayload {
  if (!isAuthoritativeBreakShot(state)) {
    return shot;
  }
  const rnd = mulberry32(shotVarianceSeed(state) ^ 0xdead_beef);
  const angleMag = BREAK_ANGLE_MIN_RAD + rnd() * (BREAK_ANGLE_MAX_RAD - BREAK_ANGLE_MIN_RAD);
  const angleSign = rnd() < 0.5 ? -1 : 1;
  const angleRad = shot.angleRad + angleSign * angleMag;
  const powerDelta = (rnd() * 2 - 1) * BREAK_POWER_JITTER;
  const power = Math.max(0, Math.min(1, shot.power + powerDelta));
  const englishX = Math.max(
    -1,
    Math.min(1, (shot.englishX ?? 0) + (rnd() * 2 - 1) * BREAK_ENGLISH_JITTER),
  );
  const englishY = Math.max(
    -1,
    Math.min(1, (shot.englishY ?? 0) + (rnd() * 2 - 1) * BREAK_ENGLISH_JITTER),
  );
  return {
    ...shot,
    angleRad,
    power,
    englishX,
    englishY,
  };
}

export function resolveShotForSimulation(
  state: BilliardsMatchState,
  shot: BilliardsShotPayload,
): BilliardsShotPayload {
  return applyBreakShotVariance(state, shot);
}
