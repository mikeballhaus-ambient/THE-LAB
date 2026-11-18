import type { BilliardsBallPose } from './billiards-rapier-sim';
import { TABLE_POCKET_CENTERS, type BilliardsBall } from './billiards-types';
import { pocketSinkZoneRadiusAt } from './table-playfield';

function nearestPocketCenter(x: number, y: number): { x: number; y: number } | null {
  let best: { x: number; y: number } | null = null;
  let bestDist = Number.POSITIVE_INFINITY;
  for (const p of TABLE_POCKET_CENTERS) {
    const d = Math.hypot(x - p.x, y - p.y);
    if (d < bestDist) {
      bestDist = d;
      best = p;
    }
  }
  return best;
}

function ballInPocketSinkZone(x: number, y: number): boolean {
  for (const p of TABLE_POCKET_CENTERS) {
    if (Math.hypot(x - p.x, y - p.y) <= pocketSinkZoneRadiusAt(p.x, p.y)) {
      return true;
    }
  }
  return false;
}

/**
 * Opponent replay uses client Rapier for motion but server balls for legality.
 * Strip preview-only pockets so a ball does not vanish mid-roll then respawn on the lip.
 */
export function stripPreviewOnlyPocketed(
  balls: BilliardsBall[],
  authoritative: BilliardsBall[],
): BilliardsBall[] {
  const authById = new Map(authoritative.map((b) => [b.id, b]));
  return balls.map((b) => {
    const auth = authById.get(b.id);
    if (!auth || auth.pocketed) {
      return b;
    }
    if (b.pocketed) {
      return { ...b, pocketed: false };
    }
    return b;
  });
}

export function stripPreviewOnlyPocketedPoses(
  poses: BilliardsBallPose[],
  authoritative: BilliardsBall[],
): BilliardsBallPose[] {
  const authById = new Map(authoritative.map((b) => [b.id, b]));
  return poses.map((p) => {
    const auth = authById.get(p.id);
    if (!auth || auth.pocketed) {
      return p;
    }
    if (p.pocketed) {
      return { ...p, pocketed: false };
    }
    return p;
  });
}

/**
 * Server-pocketed balls may still be rolling in client Rapier — start the sink
 * presentation once the preview reaches the pocket throat.
 */
export function promoteAuthoritativePocketedPreview(
  balls: BilliardsBall[],
  poses: BilliardsBallPose[],
  authoritative: BilliardsBall[],
): { balls: BilliardsBall[]; poses: BilliardsBallPose[] } {
  const poseById = new Map(poses.map((p) => [p.id, p]));
  let outBalls = [...balls];
  let outPoses = [...poses];

  for (const auth of authoritative) {
    if (!auth.pocketed) {
      continue;
    }
    const preview = outBalls.find((b) => b.id === auth.id);
    if (preview?.pocketed) {
      continue;
    }
    const px = preview?.x;
    const py = preview?.y;
    const pose = poseById.get(auth.id);
    const posX = px ?? pose?.x;
    const posY = py ?? pose?.y;
    if (posX == null || posY == null) {
      continue;
    }
    if (!ballInPocketSinkZone(posX, posY)) {
      continue;
    }
    const pocket = nearestPocketCenter(posX, posY) ?? { x: posX, y: posY };
    const sunk: BilliardsBall = {
      id: auth.id,
      number: auth.number,
      x: pocket.x,
      y: pocket.y,
      pocketed: true,
    };
    outBalls = outBalls.filter((b) => b.id !== auth.id).concat(sunk);
    const sunkPose: BilliardsBallPose = {
      id: auth.id,
      number: auth.number,
      x: pocket.x,
      y: pocket.y,
      rotX: pose?.rotX ?? 0,
      rotY: pose?.rotY ?? 0,
      rotZ: pose?.rotZ ?? 0,
      rotW: pose?.rotW ?? 1,
      pocketed: true,
    };
  outPoses = outPoses.filter((p) => p.id !== auth.id).concat(sunkPose);
  }

  return { balls: outBalls, poses: outPoses };
}

export function mergeOpponentReplayRollFrame(
  raw: { balls: BilliardsBall[]; poses: BilliardsBallPose[] },
  authoritative: BilliardsBall[],
): { balls: BilliardsBall[]; poses: BilliardsBallPose[] } {
  const stripped = {
    balls: stripPreviewOnlyPocketed(raw.balls, authoritative),
    poses: stripPreviewOnlyPocketedPoses(raw.poses, authoritative),
  };
  return promoteAuthoritativePocketedPreview(stripped.balls, stripped.poses, authoritative);
}

/** 3D layer reads poses — match settle balls so nothing pops after the roll ends. */
export function alignRollPosesToSettleBalls(
  poses: BilliardsBallPose[],
  settleBalls: BilliardsBall[],
): BilliardsBallPose[] {
  const byId = new Map(settleBalls.map((b) => [b.id, b]));
  const out: BilliardsBallPose[] = [];
  for (const p of poses) {
    const auth = byId.get(p.id);
    if (!auth || auth.pocketed) {
      continue;
    }
    out.push({
      ...p,
      x: auth.x,
      y: auth.y,
      pocketed: false,
    });
  }
  return out;
}
