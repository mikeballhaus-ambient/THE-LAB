import { BALL_RADIUS } from './billiards-types';

/**
 * Felt contact kinematics for a single ball (Y-up world, ball travelling in the XZ plane).
 *
 * A real ball spends the first part of every shot **sliding** and only then settles into
 * pure rolling. Modelling that transition is what produces follow, draw and side spin, so
 * this module owns the slip → roll conversion instead of snapping ω to `v/r` every step.
 */

export interface BilliardSpinState {
  vx: number;
  vy: number;
  vz: number;
  wx: number;
  wy: number;
  wz: number;
}

/**
 * Cloth sliding friction (μ). Governs how fast a skid converts to a clean roll.
 *
 * Kept high: this is what lets a ball come *off* a cushion. On rebound the linear
 * velocity reverses but the spin does not, so the patch slips hard — a slow conversion
 * would eat the rebound and leave the ball stuck in the jaw.
 */
const SLIDE_FRICTION = 0.9;
/** Effective gravity for the friction impulse (table units / s²). */
const FELT_GRAVITY = 980;
/**
 * Rolling resistance deceleration once the ball is rolling (table units / s²).
 *
 * Dominates coasting distance. Values in the 70s made mid/low speed travel lose velocity so
 * fast it read as sticky felt; the low-30s keep long shots plausible while still settling.
 */
const ROLL_RESISTANCE = 21;
/** Spin decay on the vertical axis (english bleeds off over time). */
const SPIN_DAMP_PER_S = 0.9;
/**
 * Below this speed the ball is treated as stopped.
 *
 * Too high and the last part of a roll vanishes abruptly (sticky/clamp feel). Keep it low
 * enough that slow coast reads natural before we zero out.
 */
export const FELT_STOP_SPEED = 12;
/** Rotational inertia factor for a solid sphere (I = (2/5)mr²). */
const INERTIA_DENOM = 2 / 5;
/**
 * Impulse needed to cancel the slip for a solid sphere: `J = (2/7)·|u|`.
 * Derived from Δu = J + (r_c × J)/I × r_c = 3.5·J.
 */
const SLIP_IMPULSE_FACTOR = 2 / 7;

/** Cue-tip offsets scale spin relative to the natural roll rate. */
const FOLLOW_DRAW_GAIN = 1.2;
const SIDE_SPIN_GAIN = 0.9;

/** World Y-up; table motion on XZ. Rolling without slip: ω = (up × v) / r. */
export function rollingAngVelFromLinvel(
  vx: number,
  vz: number,
  ballRadius: number = BALL_RADIUS,
): { x: number; y: number; z: number } {
  const speed = Math.hypot(vx, vz);
  if (speed < 1e-6) {
    return { x: 0, y: 0, z: 0 };
  }
  return {
    x: vz / ballRadius,
    y: 0,
    z: -vx / ballRadius,
  };
}

/**
 * Velocity of the ball's contact patch relative to the cloth — `u = v + ω × r_c`.
 *
 * Zero means the ball is rolling cleanly. Non-zero means it is skidding and the felt
 * will push it sideways/forward until the two agree.
 */
export function contactSlipVelocity(
  state: BilliardSpinState,
  ballRadius: number = BALL_RADIUS,
): { ux: number; uz: number } {
  return {
    ux: state.vx + state.wz * ballRadius,
    uz: state.vz - state.wx * ballRadius,
  };
}

/**
 * Initial angular velocity for a struck cue ball, including english.
 *
 * - `englishY` is the pad's vertical axis: −1 (top of the pad) is **follow**, +1 is **draw**.
 * - `englishX` is the pad's horizontal axis: −1 left, +1 right **side spin**.
 *
 * Spin is bounded relative to the natural roll rate so no offset can fling the ball.
 */
export function shotAngularVelocity(
  angleRad: number,
  speed: number,
  englishX: number,
  englishY: number,
  ballRadius: number = BALL_RADIUS,
): { x: number; y: number; z: number } {
  const rollRate = Math.abs(speed) / ballRadius;
  if (rollRate < 1e-6) {
    return { x: 0, y: 0, z: 0 };
  }
  // Rolling axis is perpendicular to travel in the XZ plane.
  const axisX = Math.sin(angleRad);
  const axisZ = -Math.cos(angleRad);
  const follow = Math.max(-1, Math.min(1, -englishY));
  const side = Math.max(-1, Math.min(1, englishX));
  const along = rollRate * (1 + FOLLOW_DRAW_GAIN * follow);
  return {
    x: axisX * along,
    y: -side * SIDE_SPIN_GAIN * rollRate,
    z: axisZ * along,
  };
}

/** True while the contact patch is still sliding across the cloth. */
export function isBilliardBallSliding(
  state: BilliardSpinState,
  ballRadius: number = BALL_RADIUS,
): boolean {
  const { ux, uz } = contactSlipVelocity(state, ballRadius);
  return Math.hypot(ux, uz) > 1e-3;
}

/**
 * Advance one ball's felt contact by `dt` seconds, in place.
 *
 * 1. While sliding, apply Coulomb friction at the contact patch. The impulse that exactly
 *    cancels the slip for a solid sphere is `J = (2/7)·|u|`; it is capped at `μ·g·dt` so a
 *    fast skid takes several frames to convert instead of snapping instantly.
 * 2. Once rolling, apply rolling resistance and let side spin decay.
 * 3. Kill the last impulse of motion so shots terminate promptly.
 */
export interface BilliardFeltContactOptions {
  /**
   * Skip the `FELT_STOP_SPEED` hard snap. Use while the ball is in a **pocket throat**
   * (sink zone but not captured) — cloth “rest” logic was killing motion every substep there
   * and made overlaps read like the ball gave up rolling.
   */
  skipHardStop?: boolean;
}

export function stepBilliardFeltContact(
  state: BilliardSpinState,
  dt: number,
  ballRadius: number = BALL_RADIUS,
  options?: BilliardFeltContactOptions,
): void {
  if (!(dt > 0)) {
    return;
  }

  const { ux, uz } = contactSlipVelocity(state, ballRadius);
  const slip = Math.hypot(ux, uz);

  if (slip > 1e-4) {
    const maxImpulse = SLIDE_FRICTION * FELT_GRAVITY * dt;
    const needed = SLIP_IMPULSE_FACTOR * slip;
    const impulse = Math.min(needed, maxImpulse);
    const nx = ux / slip;
    const nz = uz / slip;
    const jx = -nx * impulse;
    const jz = -nz * impulse;

    state.vx += jx;
    state.vz += jz;
    // Δω = (r_c × J) / (I/m) for r_c = (0, −r, 0)
    const radiusSq = ballRadius * ballRadius;
    state.wx = state.wx + (-ballRadius * jz) / (INERTIA_DENOM * radiusSq);
    state.wz = state.wz + (ballRadius * jx) / (INERTIA_DENOM * radiusSq);
  }

  /**
   * Rolling resistance applies only when the ball is **rolling**, not while the patch is
   * **skidding**. We already burn energy through the slip branch above; applying `ROLL_RESISTANCE`
   * on every frame (including huge-slip breaks and fresh post-impact states) made stacks look
   * glued — full-power shots dumped most speed before rack balls could separate.
   */
  if (!isBilliardBallSliding(state, ballRadius)) {
    const speed = Math.hypot(state.vx, state.vz);
    if (speed > 0) {
      const drop = Math.min(speed, ROLL_RESISTANCE * dt);
      const keep = (speed - drop) / speed;
      state.vx *= keep;
      state.vz *= keep;
    }
  }

  state.wy *= Math.exp(-SPIN_DAMP_PER_S * dt);

  if (!options?.skipHardStop && Math.hypot(state.vx, state.vz) < FELT_STOP_SPEED) {
    state.vx = 0;
    state.vz = 0;
    state.wx = 0;
    state.wz = 0;
  }
}

/** True when the ball has effectively come to rest. */
export function isBilliardBallAtRest(state: BilliardSpinState): boolean {
  return Math.hypot(state.vx, state.vz) === 0 && Math.abs(state.wy) < 1e-3;
}
