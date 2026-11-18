import type RAPIER from '@dimforge/rapier3d-compat';
import { BALL_RADIUS, TABLE_HEIGHT, TABLE_WIDTH } from './billiards-types';
import { CUSHION_COLLIDER_HALF_THICK } from './table-bumper-physics';
import { buildCushionWallSegments } from './table-cushion-wall-segments';

/** Y half-extent of cushion collider cuboids (Rapier / debug). */
export const CUSHION_HALF_HEIGHT = 5;
/** Z half-extent (thin) — inboard face aligns with bumper segment after body shift. */
export const CUSHION_HALF_THICK = CUSHION_COLLIDER_HALF_THICK;
/** Felt plane half-thickness (Y); top face at y = 0. */
export const FELT_HALF_THICK = 0.08;

/** Cushion contact — nose-line rails + jaw segments toward pockets (`buildCushionWallSegments`). */
const CUSHION_RAIL_RESTITUTION = 0.88;

export interface BilliardsTableColliderDescriptor {
  kind: 'felt' | 'cushion';
  /** Body centre (table x, world y, table z) — matches Rapier. */
  position: { x: number; y: number; z: number };
  /** Cuboid half-extents in body local space (X = along segment for cushions). */
  halfExtents: { x: number; y: number; z: number };
  /** Yaw about +Y so local +X follows the cushion segment (0 for felt). */
  yawRad: number;
  /** Cushions only — Rapier contact restitution (felt uses its own path). */
  restitution?: number;
}

/**
 * Same geometry `buildRapierFeltCollider` / `buildRapierCushionColliders` register — documentation /
 * introspection only (collider debug uses Rapier `world.debugRender()`).
 */
export function getBilliardsTableColliderDescriptors(): BilliardsTableColliderDescriptor[] {
  const out: BilliardsTableColliderDescriptor[] = [
    {
      kind: 'felt',
      position: { x: TABLE_WIDTH / 2, y: -FELT_HALF_THICK, z: TABLE_HEIGHT / 2 },
      halfExtents: { x: TABLE_WIDTH / 2, y: FELT_HALF_THICK, z: TABLE_HEIGHT / 2 },
      yawRad: 0,
    },
  ];

  const tableMidX = TABLE_WIDTH / 2;
  const tableMidY = TABLE_HEIGHT / 2;

  for (const seg of buildCushionWallSegments()) {
    const dx = seg.x2 - seg.x1;
    const dz = seg.y2 - seg.y1;
    const len = Math.hypot(dx, dz);
    /** Include short jaw facets — skipping tiny segments hid Rapier colliders from debug parity. */
    if (len < 1e-3) {
      continue;
    }
    const midX = (seg.x1 + seg.x2) / 2;
    const midZ = (seg.y1 + seg.y2) / 2;

    const tx = dx / len;
    const tz = dz / len;
    let inX = -tz;
    let inZ = tx;
    const towardCX = tableMidX - midX;
    const towardCY = tableMidY - midZ;
    if (inX * towardCX + inZ * towardCY < 0) {
      inX = -inX;
      inZ = -inZ;
    }
    const shiftX = midX - inX * CUSHION_HALF_THICK;
    const shiftZ = midZ - inZ * CUSHION_HALF_THICK;

    const angle = Math.atan2(dz, dx);
    const restitution = CUSHION_RAIL_RESTITUTION;
    out.push({
      kind: 'cushion',
      position: { x: shiftX, y: BALL_RADIUS, z: shiftZ },
      halfExtents: { x: len / 2, y: CUSHION_HALF_HEIGHT, z: CUSHION_HALF_THICK },
      yawRad: angle,
      restitution,
    });
  }

  return out;
}

/**
 * Static felt plane — positional contact only (Y-up, table on XZ).
 *
 * Two details here are load-bearing, and both were silently destroying shot speed:
 *
 * 1. **The top face must sit exactly at `y = 0`.** The body is centred at `y = 0` with
 *    half-thickness `FELT_HALF_THICK`, so the surface was at `+0.08` while balls rest with
 *    their centre at `BALL_RADIUS` — a permanent 0.08 penetration that Rapier resolved
 *    every step, dragging the ball backwards along the contact.
 * 2. **Friction must combine as `Min`.** Setting this collider's friction to 0 is not
 *    enough: Rapier's default rule is `Average`, which mixed 0 with the ball's 0.45 into
 *    0.225 and applied real tangential friction at the cloth. At full power that braked
 *    1150 units/s down to 400 in a single step — the cause of "no power".
 *
 * Cloth interaction (slide → roll, follow/draw, side spin) is owned by
 * `stepBilliardFeltContact()`, so Rapier must contribute no tangential force at all.
 */
export function buildRapierFeltCollider(R: typeof RAPIER, world: RAPIER.World): void {
  const felt = getBilliardsTableColliderDescriptors().find((d) => d.kind === 'felt');
  if (!felt) {
    return;
  }
  const bodyDesc = R.RigidBodyDesc.fixed().setTranslation(
    felt.position.x,
    felt.position.y,
    felt.position.z,
  );
  const body = world.createRigidBody(bodyDesc);
  const { x: hx, y: hy, z: hz } = felt.halfExtents;
  const colliderDesc = R.ColliderDesc.cuboid(hx, hy, hz)
    .setRestitution(0.02)
    .setFriction(0)
    .setFrictionCombineRule(R.CoefficientCombineRule.Min);
  world.createCollider(colliderDesc, body);
}

/** Static cushion colliders — same segment layout as legacy 2D walls, in XZ table plane. */
export function buildRapierCushionColliders(R: typeof RAPIER, world: RAPIER.World): void {
  for (const desc of getBilliardsTableColliderDescriptors()) {
    if (desc.kind !== 'cushion') {
      continue;
    }
    /**
     * **The quaternion's `y` must be negative.**
     *
     * `yawRad` is a table-space angle, `atan2(dz, dx)`, measured from +X toward +Z. A rotation of `θ` about
     * +Y (Three.js / Rapier convention) sends local +X to `(cos θ, −sin θ)` — the opposite sense — so:
     *
     *   `q = (w = cos(θ/2), y = +sin(θ/2))` rotates by `+θ` and slants the box the **wrong way**
     *   `q = (w = cos(θ/2), y = −sin(θ/2))` rotates by `−θ` and matches `(cos θ, sin θ)`
     *
     * With the positive sign every angled cushion was mirrored about its own centre: a segment meant to run
     * `\` was drawn `/`. Axis-aligned rails are unaffected (a 180° flip of a symmetric box is invisible),
     * which is why this only ever showed up on the diagonal pocket jaws.
     */
    const bodyDesc = R.RigidBodyDesc.fixed()
      .setTranslation(desc.position.x, desc.position.y, desc.position.z)
      .setRotation({ w: Math.cos(desc.yawRad / 2), x: 0, y: -Math.sin(desc.yawRad / 2), z: 0 });
    const body = world.createRigidBody(bodyDesc);
    const { x: hx, y: hy, z: hz } = desc.halfExtents;
    const colliderDesc = R.ColliderDesc.cuboid(hx, hy, hz)
      .setRestitution(desc.restitution ?? CUSHION_RAIL_RESTITUTION)
      .setFriction(0.12)
      .setActiveEvents(R.ActiveEvents.COLLISION_EVENTS);
    world.createCollider(colliderDesc, body);
  }
}
