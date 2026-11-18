import RAPIER from '@dimforge/rapier3d-compat';
import {
  BALL_RADIUS,
  BILLIARDS_MAX_CUE_SPEED,
  TABLE_POCKET_CENTERS,
  TABLE_WIDTH,
  type BilliardsBall,
  type BilliardsMatchState,
  type BilliardsShotPayload,
} from './billiards-types';
import {
  isCueCenterPastHeadString,
  shotRequiresKitchenHeadStringCross,
} from './billiards-kitchen-shot';
import { assertBilliardsRapierReady } from './billiards-rapier-init';
import { buildRapierCushionColliders, buildRapierFeltCollider } from './billiards-rapier-cushions';
import { tableToWorld, worldToTable } from './billiards-world-coords';
import {
  FELT_STOP_SPEED,
  isBilliardBallAtRest,
  shotAngularVelocity,
  stepBilliardFeltContact,
  type BilliardSpinState,
} from './billiards-rolling-kinematics';
import {
  clampBallCenterToPlayfield,
  isBallCenterInPocketThroat,
  pocketCaptureCenterRadiusAt,
  pocketMouthRadiusAt,
  pocketSinkZoneRadiusAt,
  shouldCommitFastPocketCapture,
  tableCushionMaxX,
  tableCushionMaxY,
  tableCushionMinX,
  tableCushionMinY,
} from './table-playfield';

/** Fixed timestep for server + client (120 Hz). */
export const PHYSICS_STEP_MS = 1000 / 120;

/**
 * Must match `PHYSICS_STEP_MS`. Rapier defaults to 1/60, which silently doubled the speed
 * of every shot while the accumulator above advanced 120 Hz of simulated time.
 */
export const PHYSICS_DT = PHYSICS_STEP_MS / 1000;

const MAX_SHOT_STEPS = 12_000;
/**
 * Rapier treats one world unit as one **metre** and derives its solver thresholds from
 * that. Our units are much smaller than a metre — a "17-unit" ball and a "1000-unit"
 * table — so the default `lengthUnit = 1` applied metre-scale CCD clamping and capped
 * every ball at **400 units/s**. Full power asked for 1150 and silently became 400 within
 * a single step, which is why no amount of power tuning changed anything.
 *
 * Anchoring `lengthUnit` to the table's own scale puts the thresholds back in proportion:
 * at 1000 the clamp sits far above our fastest shot.
 */
const BILLIARDS_LENGTH_UNIT = TABLE_WIDTH;
/**
 * Stacked ball–ball contacts during breaks need more PGS passes than Rapier’s default (4).
 * Applies to all shots — not a break-only hack.
 */
const RAPIER_SOLVER_ITERATIONS = 8;
const RAPIER_INTERNAL_PGS_ITERATIONS = 2;
/**
 * Pocket **throat** bias (sink zone, not yet captured): only meaningful when a ball is
 * rolling slowly into the hole. Applying the same inward nudge every step at break speeds
 * sucks scatter toward corners and reads like weak breaks. Skip bias above this planar speed.
 */
const POCKET_SINK_ATTRACT_MAX_PLANAR_SPEED = 220;
/**
 * Table units per second at power 1 on a 1000×500 table.
 *
 * Cue speed = `shot.power × BILLIARDS_MAX_CUE_SPEED` (`billiards-types.ts`).
 */
const MAX_CUE_SPEED = BILLIARDS_MAX_CUE_SPEED;
/** Damping is applied by the felt model, not Rapier — keep both effectively inert. */
const BALL_LIN_DAMP = 0;
const BALL_ANG_DAMP = 0;
/** A shot is over once every ball is under this speed and spin. */
const REST_SPIN = 1.5;

interface BallRecord {
  id: string;
  number: number;
  body: RAPIER.RigidBody | null;
  colliderHandle: number | null;
  pocketed: boolean;
  /** Where the ball dropped. Lets the renderer sink it into the right hole. */
  pocketX: number;
  pocketY: number;
  spin: BilliardSpinState;
}

export type RapierShotSessionOptions = {
  /**
   * Opponent replay: only commit pockets the server also pocketed (`settleBalls`).
   * Blocks client-only capture while still sinking server-legit balls in the preview.
   */
  replaySettleBalls?: BilliardsBall[];
};

export interface RapierShotSession {
  world: RAPIER.World;
  eventQueue: RAPIER.EventQueue;
  balls: BallRecord[];
  colliderHandleToNumber: Map<number, number>;
  firstHitNumber: number | null;
  pocketedBefore: Set<string>;
  powerUsed: number;
  stepCount: number;
  kitchenHeadStringRule: boolean;
  cueCrossedHeadString: boolean;
  kitchenHeadStringFoul: boolean;
  /** When set, pocket capture in Rapier requires matching `pocketed` on these balls. */
  replayAuthoritativeById: Map<string, BilliardsBall> | null;
}

/**
 * Line soup from `world.debugRender()` — pairs of XYZ endpoints, RGBA per vertex (Rapier format).
 * Copied each step so WASM is free to reuse internal buffers.
 */
export interface BilliardsRapierDebugLineBuffers {
  vertices: Float32Array;
  colors: Float32Array;
}

let latestRapierDebugLines: BilliardsRapierDebugLineBuffers | null = null;

/** Last Rapier `debugRender` snapshot — from a live shot step or `updateBilliardsRapierColliderDebugSnapshot`. */
export function getBilliardsRapierDebugLineBuffers(): BilliardsRapierDebugLineBuffers | null {
  return latestRapierDebugLines;
}

export function configureBilliardsRapierWorld(world: RAPIER.World): void {
  world.timestep = PHYSICS_DT;
  world.lengthUnit = BILLIARDS_LENGTH_UNIT;
  world.integrationParameters.numSolverIterations = RAPIER_SOLVER_ITERATIONS;
  world.integrationParameters.numInternalPgsIterations = RAPIER_INTERNAL_PGS_ITERATIONS;
}

/**
 * Build a **temporary** world with the same table colliders + fixed ball spheres at current table positions,
 * step once, and store `world.debugRender()` — so **Show colliders** works without firing a shot.
 */
export function updateBilliardsRapierColliderDebugSnapshot(balls: ReadonlyArray<BilliardsBall>): void {
  assertBilliardsRapierReady();
  const world = new RAPIER.World({ x: 0, y: 0, z: 0 });
  configureBilliardsRapierWorld(world);
  buildRapierFeltCollider(RAPIER, world);
  buildRapierCushionColliders(RAPIER, world);
  for (const ball of balls) {
    if (ball.pocketed) {
      continue;
    }
    const pos = tableToWorld(ball.x, ball.y);
    const body = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(pos.x, pos.y, pos.z));
    world.createCollider(RAPIER.ColliderDesc.ball(BALL_RADIUS).setDensity(0), body);
  }
  world.step();
  captureRapierDebugLines(world);
  world.free();
}

function captureRapierDebugLines(world: RAPIER.World): void {
  const buf = world.debugRender();
  const v = buf.vertices;
  const c = buf.colors;
  if (v.length === 0) {
    latestRapierDebugLines = null;
    return;
  }
  latestRapierDebugLines = {
    vertices: new Float32Array(v),
    colors: new Float32Array(c),
  };
}

function ballNumberFromCollider(session: RapierShotSession, handle: number): number | null {
  return session.colliderHandleToNumber.get(handle) ?? null;
}

function updateKitchenHeadStringCross(session: RapierShotSession): void {
  if (!session.kitchenHeadStringRule || session.cueCrossedHeadString) {
    return;
  }
  const cue = session.balls.find((b) => b.number === 0 && !b.pocketed && b.body);
  if (!cue?.body) {
    return;
  }
  const t = cue.body.translation();
  const { y } = worldToTable(t.x, t.z);
  if (isCueCenterPastHeadString(y)) {
    session.cueCrossedHeadString = true;
  }
}

function recordFirstHit(session: RapierShotSession, a: number, b: number): void {
  if (session.firstHitNumber != null) {
    return;
  }
  const numA = ballNumberFromCollider(session, a);
  const numB = ballNumberFromCollider(session, b);
  if (numA === 0 && numB != null && numB > 0) {
    if (session.kitchenHeadStringRule && !session.cueCrossedHeadString) {
      session.kitchenHeadStringFoul = true;
    }
    session.firstHitNumber = numB;
  } else if (numB === 0 && numA != null && numA > 0) {
    if (session.kitchenHeadStringRule && !session.cueCrossedHeadString) {
      session.kitchenHeadStringFoul = true;
    }
    session.firstHitNumber = numA;
  }
}

function emptySpin(): BilliardSpinState {
  return { vx: 0, vy: 0, vz: 0, wx: 0, wy: 0, wz: 0 };
}

function createBallBody(
  world: RAPIER.World,
  session: RapierShotSession,
  ball: BilliardsBall,
): { body: RAPIER.RigidBody; handle: number } {
  const pos = tableToWorld(ball.x, ball.y);
  const bodyDesc = RAPIER.RigidBodyDesc.dynamic()
    .setTranslation(pos.x, pos.y, pos.z)
    .setLinearDamping(BALL_LIN_DAMP)
    .setAngularDamping(BALL_ANG_DAMP)
    .setCanSleep(false);
  const body = world.createRigidBody(bodyDesc);
  // Ball–ball: keep tangential friction **low** — real pool balls are hard polish; Rapier's
  // friction mixes with the cushion on rail hits; values ~0.4+ made rack clusters "glue"
  // through long contact manifolds so breaks barely spread even at full power.
  const colliderDesc = RAPIER.ColliderDesc.ball(BALL_RADIUS)
    .setDensity(0.052)
    .setRestitution(0.97)
    .setFriction(0.06)
    .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS);
  const collider = world.createCollider(colliderDesc, body);
  session.colliderHandleToNumber.set(collider.handle, ball.number);
  return { body, handle: collider.handle };
}

export function createRapierShotSession(
  state: BilliardsMatchState,
  shot: BilliardsShotPayload,
  options?: RapierShotSessionOptions,
): RapierShotSession {
  assertBilliardsRapierReady();
  latestRapierDebugLines = null;
  // Gravity is off: the felt model resolves vertical contact analytically, so a stale
  // `y` can never push balls through the cloth.
  const world = new RAPIER.World({ x: 0, y: 0, z: 0 });
  configureBilliardsRapierWorld(world);
  const eventQueue = new RAPIER.EventQueue(true);
  buildRapierFeltCollider(RAPIER, world);
  buildRapierCushionColliders(RAPIER, world);

  const session: RapierShotSession = {
    world,
    eventQueue,
    balls: [],
    colliderHandleToNumber: new Map(),
    firstHitNumber: null,
    pocketedBefore: new Set(state.balls.filter((b) => b.pocketed).map((b) => b.id)),
    powerUsed: Math.max(0, Math.min(1, shot.power)),
    stepCount: 0,
    kitchenHeadStringRule: shotRequiresKitchenHeadStringCross(state),
    cueCrossedHeadString: false,
    kitchenHeadStringFoul: false,
    replayAuthoritativeById: options?.replaySettleBalls
      ? new Map(options.replaySettleBalls.map((b) => [b.id, b]))
      : null,
  };

  for (const ball of state.balls) {
    if (ball.pocketed) {
      session.balls.push({
        id: ball.id,
        number: ball.number,
        body: null,
        colliderHandle: null,
        pocketed: true,
        pocketX: ball.x,
        pocketY: ball.y,
        spin: emptySpin(),
      });
      continue;
    }
    const { body, handle } = createBallBody(world, session, ball);
    session.balls.push({
      id: ball.id,
      number: ball.number,
      body,
      colliderHandle: handle,
      pocketed: false,
      pocketX: 0,
      pocketY: 0,
      spin: emptySpin(),
    });
  }

  const cue = session.balls.find((b) => b.number === 0 && b.body);
  for (const record of session.balls) {
    record.body?.wakeUp();
  }
  if (cue?.body) {
    if (shot.cueBallX != null && shot.cueBallY != null) {
      const p = tableToWorld(shot.cueBallX, shot.cueBallY);
      cue.body.setTranslation({ x: p.x, y: p.y, z: p.z }, true);
    }
    const power = Math.max(0, Math.min(1, shot.power));
    const speed = power * MAX_CUE_SPEED;
    const vx = Math.cos(shot.angleRad) * speed;
    const vz = Math.sin(shot.angleRad) * speed;
    // The tip imparts follow/draw/side spin — this is what makes english behave.
    const w = shotAngularVelocity(
      shot.angleRad,
      speed,
      shot.englishX ?? 0,
      shot.englishY ?? 0,
    );
    cue.body.wakeUp();
    cue.body.setLinvel({ x: vx, y: 0, z: vz }, true);
    cue.body.setAngvel(w, true);
    cue.spin = { vx, vy: 0, vz, wx: w.x, wy: w.y, wz: w.z };
  }

  return session;
}

/**
 * Read the body, advance the felt contact model one step, write it back.
 *
 * Rapier only integrates and resolves collisions afterwards; the friction impulses come
 * from here so slide → roll behaves like cloth rather than a generic rigid-body floor.
 */
function advanceFeltContact(record: BallRecord, skipHardStop: boolean): void {
  const body = record.body;
  if (!body) {
    return;
  }
  lockBallOnFelt(body);
  const v = body.linvel();
  const w = body.angvel();
  const spin = record.spin;
  spin.vx = v.x;
  spin.vy = 0;
  spin.vz = v.z;
  spin.wx = w.x;
  spin.wy = w.y;
  spin.wz = w.z;

  stepBilliardFeltContact(spin, PHYSICS_DT, BALL_RADIUS, { skipHardStop });

  body.setLinvel({ x: spin.vx, y: 0, z: spin.vz }, true);
  body.setAngvel({ x: spin.wx, y: spin.wy, z: spin.wz }, true);
}

/** Keep balls on the cloth plane — gravity is off, so nothing else enforces it. */
function lockBallOnFelt(body: RAPIER.RigidBody): void {
  const t = body.translation();
  if (Math.abs(t.y - BALL_RADIUS) > 1e-4) {
    body.setTranslation({ x: t.x, y: BALL_RADIUS, z: t.z }, true);
  }
}

export function stepRapierShotSession(session: RapierShotSession): void {
  /**
   * Integration order matters.
   *
   * `advanceFeltContact` applies cloth slip/roll/resistance by rewriting `linvel`/`angvel`. If
   * that runs **before** `world.step`, those reduced velocities are what Rapier feeds into
   * ball–ball collision resolution — impacts look weak because the solver never sees the
   * full pre-contact speeds. Run Rapier first, then apply the felt model to the post-step
   * state so collisions stay crisp while the cloth still damps motion between hits.
   */
  session.world.step(session.eventQueue);
  session.stepCount += 1;
  captureRapierDebugLines(session.world);
  updateKitchenHeadStringCross(session);

  session.eventQueue.drainCollisionEvents((h1, h2, started) => {
    if (started) {
      recordFirstHit(session, h1, h2);
    }
  });

  for (const record of session.balls) {
    if (record.pocketed || !record.body) {
      continue;
    }
    const t0 = record.body.translation();
    const table0 = worldToTable(t0.x, t0.z);
    const skipHardStop = isBallCenterInPocketThroat(table0.x, table0.y);
    advanceFeltContact(record, skipHardStop);
  }

  for (const record of session.balls) {
    if (record.pocketed || !record.body) {
      continue;
    }
    lockBallOnFelt(record.body);
    const t = record.body.translation();
    const { x, y } = worldToTable(t.x, t.z);
    for (const p of TABLE_POCKET_CENTERS) {
      const dist = Math.hypot(x - p.x, y - p.y);
      const sinkR = pocketSinkZoneRadiusAt(p.x, p.y);
      if (dist > sinkR) {
        continue;
      }
      const mouthR = pocketMouthRadiusAt(p.x, p.y);
      const captureR = pocketCaptureCenterRadiusAt(p.x, p.y);
      const nx = (p.x - x) / dist;
      const ny = (p.y - y) / dist;
      const v = record.body.linvel();
      const planarSpeed = Math.hypot(v.x, v.z);
      const inwardSpeed = v.x * nx + v.z * ny;
      const commit =
        record.number === 0
          ? dist <= captureR
          : dist <= captureR ||
            shouldCommitFastPocketCapture(dist, mouthR, captureR, inwardSpeed, planarSpeed);
      const replayAuth = session.replayAuthoritativeById?.get(record.id);
      const allowReplayCapture =
        session.replayAuthoritativeById == null || replayAuth?.pocketed === true;
      if (commit && allowReplayCapture) {
        record.pocketed = true;
        record.pocketX = p.x;
        record.pocketY = p.y;
        if (record.colliderHandle != null) {
          session.colliderHandleToNumber.delete(record.colliderHandle);
        }
        session.world.removeRigidBody(record.body);
        record.body = null;
        record.colliderHandle = null;
        break;
      }
      // Fast transit through the mouth (typical after a spread) — keep Rapier + felt only.
      if (planarSpeed >= POCKET_SINK_ATTRACT_MAX_PLANAR_SPEED) {
        break;
      }
      if (dist < 1e-4) {
        break;
      }
      // Softer than the old `0.94` + `0.55` — that compounded with felt and read like the ball quit rolling in the lip.
      record.body.setLinvel(
        {
          x: v.x * 0.985 + nx * 0.22,
          y: 0,
          z: v.z * 0.985 + ny * 0.22,
        },
        true,
      );
      break;
    }
  }
}

export function isRapierShotAtRest(session: RapierShotSession): boolean {
  for (const record of session.balls) {
    if (record.pocketed || !record.body) {
      continue;
    }
    const v = record.body.linvel();
    if (Math.hypot(v.x, v.z) > FELT_STOP_SPEED) {
      return false;
    }
    const av = record.body.angvel();
    if (Math.hypot(av.x, av.y, av.z) > REST_SPIN) {
      return false;
    }
  }
  return session.stepCount > 2;
}

export interface BilliardsBallPose {
  id: string;
  number: number;
  x: number;
  y: number;
  rotX: number;
  rotY: number;
  rotZ: number;
  rotW: number;
  /**
   * Set when the ball has just dropped. The pose is pinned to the pocket centre and the
   * renderer plays a short sink; omitting the ball entirely is what made it look like the
   * hole had a higher z-index than the ball.
   */
  pocketed?: boolean;
}

export interface BilliardsRollFrame {
  balls: BilliardsBall[];
  poses: BilliardsBallPose[];
}

/** Single pass over the session — used each display frame during roll animation. */
export function readBilliardsRollFrame(
  session: RapierShotSession,
  state: BilliardsMatchState,
): BilliardsRollFrame {
  const balls: BilliardsBall[] = [];
  const poses: BilliardsBallPose[] = [];
  for (const record of session.balls) {
    if (record.pocketed) {
      balls.push({
        id: record.id,
        number: record.number,
        x: record.pocketX,
        y: record.pocketY,
        pocketed: true,
      });
      // Keep the ball in the pose stream, pinned at the throat, so the drop can be
      // animated rather than the ball blinking out of existence.
      poses.push({
        id: record.id,
        number: record.number,
        x: record.pocketX,
        y: record.pocketY,
        rotX: 0,
        rotY: 0,
        rotZ: 0,
        rotW: 1,
        pocketed: true,
      });
      continue;
    }
    if (!record.body) {
      continue;
    }
    const t = record.body.translation();
    const table = worldToTable(t.x, t.z);
    balls.push({
      id: record.id,
      number: record.number,
      x: table.x,
      y: table.y,
      pocketed: false,
    });
    const rot = record.body.rotation();
    poses.push({
      id: record.id,
      number: record.number,
      x: table.x,
      y: table.y,
      rotX: rot.x,
      rotY: rot.y,
      rotZ: rot.z,
      rotW: rot.w,
    });
  }
  for (const template of state.balls) {
    if (template.pocketed && !balls.some((b) => b.id === template.id)) {
      balls.push({ ...template });
    }
  }
  return { balls, poses };
}

export function readBilliardsBallPoses(
  session: RapierShotSession,
  state: BilliardsMatchState,
): BilliardsBallPose[] {
  return readBilliardsRollFrame(session, state).poses;
}

export function readBilliardsBallPositions(
  session: RapierShotSession,
  state: BilliardsMatchState,
): BilliardsBall[] {
  const templateById = new Map(state.balls.map((ball) => [ball.id, ball]));
  const out: BilliardsBall[] = [];
  for (const record of session.balls) {
    if (record.pocketed) {
      const template = templateById.get(record.id);
      out.push({
        id: record.id,
        number: record.number,
        x: 0,
        y: 0,
        pocketed: true,
        ...(template?.pocketedBySeat != null ? { pocketedBySeat: template.pocketedBySeat } : {}),
      });
      continue;
    }
    if (record.body) {
      const t = record.body.translation();
      const table = worldToTable(t.x, t.z);
      out.push({
        id: record.id,
        number: record.number,
        x: table.x,
        y: table.y,
        pocketed: false,
      });
    }
  }
  for (const template of state.balls) {
    if (template.pocketed && !out.some((b) => b.id === template.id)) {
      out.push({ ...template });
    }
  }
  return out;
}

export function buildShotResultFromSession(
  session: RapierShotSession,
  state: BilliardsMatchState,
): {
  balls: BilliardsBall[];
  cueScratch: boolean;
  firstHitNumber: number | null;
  pocketedNumbers: number[];
  powerUsed: number;
  kitchenHeadStringFoul: boolean;
} {
  const raw = readBilliardsBallPositions(session, state);
  const balls = raw.map((ball) => {
    if (ball.pocketed) {
      return ball;
    }
    const minX = tableCushionMinX();
    const maxX = tableCushionMaxX();
    const minY = tableCushionMinY();
    const maxY = tableCushionMaxY();
    const outside =
      ball.x < minX - 0.05 ||
      ball.x > maxX + 0.05 ||
      ball.y < minY - 0.05 ||
      ball.y > maxY + 0.05;
    if (!outside) {
      return ball;
    }
    const clamped = clampBallCenterToPlayfield(ball.x, ball.y);
    return { ...ball, x: clamped.x, y: clamped.y };
  });
  const pocketedNumbers = balls
    .filter((b) => b.pocketed && !session.pocketedBefore.has(b.id))
    .map((b) => b.number);
  return {
    balls,
    /** Scratch only when the cue drops on this stroke (not a stale pocketed flag). */
    cueScratch: pocketedNumbers.includes(0),
    firstHitNumber: session.firstHitNumber,
    pocketedNumbers,
    powerUsed: session.powerUsed,
    kitchenHeadStringFoul: session.kitchenHeadStringFoul,
  };
}

export function destroyRapierShotSession(session: RapierShotSession): void {
  session.world.free();
  session.eventQueue.free();
}

export function runRapierShotToCompletion(
  state: BilliardsMatchState,
  shot: BilliardsShotPayload,
): ReturnType<typeof buildShotResultFromSession> {
  const session = createRapierShotSession(state, shot);
  for (let i = 0; i < MAX_SHOT_STEPS; i += 1) {
    stepRapierShotSession(session);
    if (isRapierShotAtRest(session)) {
      break;
    }
  }
  const result = buildShotResultFromSession(session, state);
  destroyRapierShotSession(session);
  return result;
}

/** Exported for tests: the felt model's notion of a settled ball. */
export function isShotBallAtRest(spin: BilliardSpinState): boolean {
  return isBilliardBallAtRest(spin);
}
