import * as THREE from 'three';

export interface BilliardsBallOrient {
  x: number;
  y: number;
  z: number;
  w: number;
}

/** Local +X axis on the ball — projects the painted marking heading into the table plane. */
const MARK_REFERENCE = new THREE.Vector3(1, 0, 0);

/**
 * Heading (radians) of the ball's painted markings as seen by the overhead camera, i.e.
 * the X/Z-plane angle of the body's local +X axis. Pure helper for HUD reads and tests;
 * the renderer uses the full quaternion, not this projection.
 */
export function overheadMarkRotationRad(q: THREE.Quaternion): number {
  const ref = MARK_REFERENCE.clone().applyQuaternion(q);
  return Math.atan2(ref.z, ref.x);
}

/**
 * World orientation for a sphere mesh from the rigid body quaternion.
 *
 * Rapier's world frame is already our render frame (Y-up, table on XZ), so the body
 * quaternion applies unchanged — no disc-flattening transform. Returns `null` when the
 * pose carries no usable rotation, in which case the mesh keeps its current orientation.
 */
export function ballOrientationQuat(orient?: BilliardsBallOrient): THREE.Quaternion | null {
  if (!orient) {
    return null;
  }
  const q = new THREE.Quaternion(orient.x, orient.y, orient.z, orient.w);
  if (!Number.isFinite(q.x) || !Number.isFinite(q.y) || !Number.isFinite(q.z) || !Number.isFinite(q.w)) {
    return null;
  }
  if (q.lengthSq() < 1e-8) {
    return null;
  }
  return q.normalize();
}
