import type { MatchView } from '@/shared/game-platform/types';
import type { DetectBanterMomentFn } from '../types';
import { detectMatchEndBanterMoment } from '../match-end-moment';
import { composeBanterDetectors, inferMoverSeat } from '../compose-detectors';
import type { ConnectFourState } from '@/apps/connect-four/back-end/rules';
import { connectFourMoveWasBlock } from '@/apps/connect-four/shared/connect-four-banter-utils';

function detectConnectFourBlock(prev: MatchView | null, next: MatchView): ReturnType<DetectBanterMomentFn> {
  if (!prev || next.status !== 'active') {
    return null;
  }
  const prevState = prev.state as ConnectFourState;
  const nextState = next.state as ConnectFourState;
  if (prevState.moveCount >= nextState.moveCount) {
    return null;
  }
  if (!connectFourMoveWasBlock(prevState, nextState)) {
    return null;
  }
  return { kind: 'block', moverSeat: inferMoverSeat(prev, next) };
}

/** Connect Four — match end + blocking an immediate win threat. */
export const detectConnectFourBanterMoment: DetectBanterMomentFn = composeBanterDetectors(
  detectMatchEndBanterMoment,
  detectConnectFourBlock,
);

/** Tic-Tac-Toe — match end only. */
export const detectTicTacToeBanterMoment: DetectBanterMomentFn = composeBanterDetectors(
  detectMatchEndBanterMoment,
);

/** Blackjack vs dealer — LLM seat-2 tablemate; Sidecar match-end only (for now). */
export const detectBlackjackBanterMoment: DetectBanterMomentFn = composeBanterDetectors(
  detectMatchEndBanterMoment,
);
