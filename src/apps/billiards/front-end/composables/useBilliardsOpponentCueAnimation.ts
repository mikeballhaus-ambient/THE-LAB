/** Shortest signed delta from `fromRad` to `toRad`. */
export function shortestAngleDelta(fromRad: number, toRad: number): number {
  let delta = toRad - fromRad;
  while (delta > Math.PI) {
    delta -= 2 * Math.PI;
  }
  while (delta < -Math.PI) {
    delta += 2 * Math.PI;
  }
  return delta;
}

/** Deterministic 0..1 from shot parameters (stable across replays). */
export function opponentCueAnimationVarianceUnit(seed: number): number {
  const x = Math.sin(seed * 12.9898 + 0.43758) * 43758.5453;
  return x - Math.floor(x);
}

const AIM_MS_PER_RAD = 280;
const AIM_MIN_MS = 360;
const AIM_MAX_MS = 1_300;
const PAUSE_AFTER_AIM_MS = 220;
const PAUSE_BEFORE_PULL_MS = 130;
const PAUSE_BEFORE_SHOT_MS = 110;
const PULL_STEP_MS = 42;
const PULL_STEPS = 20;
const PLACE_PRE_DELAY_MS = 280;
const PLACE_DRAG_MS = 980;

const SETTLE_ANGLE_MS = 120;
const SETTLE_POWER_MS = 44;

function delayMs(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

async function animateScalar(
  setValue: (v: number) => void,
  from: number,
  to: number,
  durationMs: number,
): Promise<void> {
  if (durationMs <= 0) {
    setValue(to);
    return;
  }
  const start = performance.now();
  await new Promise<void>((resolve) => {
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = easeOutCubic(t);
      setValue(from + (to - from) * eased);
      if (t < 1) {
        requestAnimationFrame(step);
      } else {
        setValue(to);
        resolve();
      }
    };
    requestAnimationFrame(step);
  });
}

/** Small overshoot / correction before locking aim (seeded from target angle + power). */
async function settleOpponentAimAngle(
  setAngleRad: (rad: number) => void,
  targetRad: number,
  varianceSeed: number,
): Promise<void> {
  const u = opponentCueAnimationVarianceUnit(varianceSeed);
  const v = opponentCueAnimationVarianceUnit(varianceSeed + 0.91);
  const overshootRad = (u - 0.5) * 0.14;
  const counterRad = (v - 0.5) * 0.05;
  const peak = targetRad + overshootRad;
  const dip = targetRad + overshootRad * 0.25 + counterRad;
  await animateScalar(setAngleRad, targetRad, peak, SETTLE_ANGLE_MS);
  await animateScalar(setAngleRad, peak, dip, SETTLE_ANGLE_MS * 0.85);
  await animateScalar(setAngleRad, dip, targetRad, SETTLE_ANGLE_MS);
}

/** Brief power wobble after the main pull before release. */
async function settleOpponentPullPower(
  setPullPower: (power: number) => void,
  targetPower: number,
  varianceSeed: number,
): Promise<void> {
  const u = opponentCueAnimationVarianceUnit(varianceSeed + 2.17);
  const bump = Math.min(0.09, 0.04 + u * 0.05) * Math.max(targetPower, 0.12);
  const high = Math.min(1, targetPower + bump);
  const low = Math.max(0, targetPower - bump * 0.45);
  setPullPower(high);
  await delayMs(SETTLE_POWER_MS);
  setPullPower(low);
  await delayMs(SETTLE_POWER_MS * 0.9);
  setPullPower(targetPower);
  await delayMs(SETTLE_POWER_MS * 0.75);
}

/** Sweep the cue to the shot angle with easing, variance settle, then a brief pause. */
export async function animateOpponentAimToShot(
  setAngleRad: (rad: number) => void,
  fromRad: number,
  toRad: number,
  varianceSeed = toRad,
): Promise<void> {
  const delta = shortestAngleDelta(fromRad, toRad);
  const durationMs = Math.min(
    AIM_MAX_MS,
    Math.max(AIM_MIN_MS, Math.abs(delta) * AIM_MS_PER_RAD),
  );
  const approachRad = fromRad + delta * 0.9;
  await animateScalar(setAngleRad, fromRad, approachRad, durationMs);
  await settleOpponentAimAngle(setAngleRad, toRad, varianceSeed);
  setAngleRad(toRad);
  await delayMs(PAUSE_AFTER_AIM_MS);
}

export async function animateOpponentPullBack(
  setPullPower: (power: number) => void,
  targetPower: number,
  varianceSeed = targetPower,
): Promise<void> {
  await delayMs(PAUSE_BEFORE_PULL_MS);
  for (let i = 1; i <= PULL_STEPS; i += 1) {
    const t = i / PULL_STEPS;
    const eased = easeOutCubic(t);
    setPullPower(targetPower * eased * 0.9);
    await delayMs(PULL_STEP_MS);
  }
  await settleOpponentPullPower(setPullPower, targetPower, varianceSeed);
}

export async function pauseBeforeOpponentShotRelease(): Promise<void> {
  await delayMs(PAUSE_BEFORE_SHOT_MS);
}

export async function pauseBeforeOpponentCuePlace(): Promise<void> {
  await delayMs(PLACE_PRE_DELAY_MS);
}

export function opponentCuePlaceDragDurationMs(): number {
  return PLACE_DRAG_MS;
}
