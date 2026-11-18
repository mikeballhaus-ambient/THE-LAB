import type { BilliardsBall } from './billiards-types';
import type { BilliardsBallPose } from './billiards-rapier-sim';

export type BilliardsRollFrameSync = (balls: BilliardsBall[], poses: BilliardsBallPose[]) => void;

const rollFrameConsumers = new Set<BilliardsRollFrameSync>();
let legacyRollFrameSync: BilliardsRollFrameSync | null = null;

/** @deprecated Prefer `registerBilliardsRollFrameSyncConsumer` */
export function registerBilliardsRollFrameSync(fn: BilliardsRollFrameSync | null): void {
  legacyRollFrameSync = fn;
}

export function registerBilliardsRollFrameSyncConsumer(
  fn: BilliardsRollFrameSync,
): () => void {
  rollFrameConsumers.add(fn);
  return () => {
    rollFrameConsumers.delete(fn);
  };
}

export function emitBilliardsRollFrame(balls: BilliardsBall[], poses: BilliardsBallPose[]): void {
  legacyRollFrameSync?.(balls, poses);
  for (const consumer of rollFrameConsumers) {
    consumer(balls, poses);
  }
}
