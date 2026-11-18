import type { BilliardsBall, BilliardsMatchState, BilliardsShotPayload } from './billiards-types';

/**
 * Pin the cue ball center on both the pre-shot layout and the payload so client roll
 * preview and server Rapier agree even if UI overlays were briefly stale.
 */
export function stampShotWithAuthoritativeCue(
  state: BilliardsMatchState,
  shot: BilliardsShotPayload,
): { state: BilliardsMatchState; shot: BilliardsShotPayload } {
  const cue = state.balls.find((b) => b.number === 0 && !b.pocketed);
  if (!cue) {
    return { state, shot };
  }
  const stampedShot: BilliardsShotPayload = {
    ...shot,
    cueBallX: cue.x,
    cueBallY: cue.y,
  };
  const stampedState: BilliardsMatchState = {
    ...state,
    balls: state.balls.map((b) =>
      b.number === 0 && !b.pocketed ? ({ ...b, x: cue.x, y: cue.y } satisfies BilliardsBall) : b,
    ),
  };
  return { state: stampedState, shot: stampedShot };
}
