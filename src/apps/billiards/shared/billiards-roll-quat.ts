export type BilliardRollQuat = { x: number; y: number; z: number; w: number };

export function billiardIdentityQuat(): BilliardRollQuat {
  return { x: 0, y: 0, z: 0, w: 1 };
}

/** Hamilton product: out = a ⊗ b */
function multiplyBilliardQuat(
  a: BilliardRollQuat,
  b: BilliardRollQuat,
): BilliardRollQuat {
  return {
    w: a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z,
    x: a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y,
    y: a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x,
    z: a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w,
  };
}

/**
 * Integrate rolling-without-slip over a table-space displacement.
 *
 * This is the client-side fallback used when a pose arrives without a rigid-body
 * quaternion (e.g. a ball placed by the layout editor): travel `d` about the axis
 * perpendicular to the motion, by arc length `|d| / r`. Prefer the real body quaternion
 * whenever one exists — this cannot express follow, draw or side spin.
 */
export function integrateBilliardRollQuat(
  q: BilliardRollQuat,
  tableDx: number,
  tableDy: number,
  ballRadius: number,
): void {
  const dist = Math.hypot(tableDx, tableDy);
  if (dist < 1e-5) {
    return;
  }
  const ax = tableDy / dist;
  const az = -tableDx / dist;
  const half = (dist / ballRadius) * 0.5;
  const sinH = Math.sin(half);
  const delta: BilliardRollQuat = {
    x: ax * sinH,
    y: 0,
    z: az * sinH,
    w: Math.cos(half),
  };
  const next = multiplyBilliardQuat(delta, q);
  q.x = next.x;
  q.y = next.y;
  q.z = next.z;
  q.w = next.w;
}
