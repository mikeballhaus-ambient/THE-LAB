import type { BilliardsBall } from './billiards-types';

export type BilliardsRollPreviewMode = 'off' | 'live';

/**
 * When to drive the felt from local Rapier preview vs match state (`props.state.balls`).
 *
 * Authoritative rule: **only** show preview balls while a roll is actively stepping or
 * immediately after (human shot waiting server ack). Never substitute a frozen pre-shot
 * clone for authoritative layout.
 */
export function billiardsRollPreviewMode(options: {
  hasAnimatedBalls: boolean;
  isRolling: boolean;
  awaitingHumanShotAck: boolean;
}): BilliardsRollPreviewMode {
  if (!options.hasAnimatedBalls) {
    return 'off';
  }
  if (options.isRolling || options.awaitingHumanShotAck) {
    return 'live';
  }
  return 'off';
}

export function resolveFeltBallsForRender(options: {
  authoritativeBalls: BilliardsBall[];
  previewBalls: BilliardsBall[] | null;
  previewMode: BilliardsRollPreviewMode;
  omitCueBall: boolean;
  /** Pre-shot layout while awaiting opponent replay roll (server state is already post-shot). */
  opponentReplayHoldBalls?: BilliardsBall[] | null;
  holdOpponentReplayFelt?: boolean;
}): BilliardsBall[] {
  let authority = options.authoritativeBalls;
  if (
    options.holdOpponentReplayFelt &&
    options.opponentReplayHoldBalls &&
    options.previewMode !== 'live'
  ) {
    authority = options.opponentReplayHoldBalls;
  }
  const source =
    options.previewMode === 'live' && options.previewBalls
      ? options.previewBalls
      : authority;
  let balls = source.filter((b) => !b.pocketed);
  if (options.omitCueBall) {
    balls = balls.filter((b) => b.number !== 0);
  }
  return balls;
}
