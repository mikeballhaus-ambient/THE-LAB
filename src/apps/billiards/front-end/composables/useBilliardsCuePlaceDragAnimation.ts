import {
  BALL_RADIUS,
  HEAD_STRING_Y,
  TABLE_HEIGHT,
  TABLE_WIDTH,
  type BilliardsPlacementZone,
} from '../../shared/billiards-types';

/** Table point where a spare-cue drag visually "starts" before dropping on the felt. */
export function spareCueDragOriginTablePoint(placementZone: BilliardsPlacementZone): { x: number; y: number } {
  if (placementZone === 'kitchen') {
    return {
      x: TABLE_WIDTH * 0.22,
      y: Math.max(BALL_RADIUS * 2, HEAD_STRING_Y - BALL_RADIUS * 2.5),
    };
  }
  return { x: TABLE_WIDTH * 0.12, y: TABLE_HEIGHT * 0.5 };
}

export function animateCuePlaceDrag(
  from: { x: number; y: number },
  to: { x: number; y: number },
  onFrame: (point: { x: number; y: number }) => void,
  durationMs = 720,
): Promise<void> {
  const start = performance.now();
  return new Promise((resolve) => {
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - (1 - t) ** 3;
      onFrame({
        x: from.x + (to.x - from.x) * eased,
        y: from.y + (to.y - from.y) * eased,
      });
      if (t < 1) {
        requestAnimationFrame(step);
      } else {
        resolve();
      }
    };
    requestAnimationFrame(step);
  });
}
