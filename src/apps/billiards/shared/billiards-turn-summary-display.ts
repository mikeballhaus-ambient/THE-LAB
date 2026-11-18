import type { MatchView } from '@/shared/game-platform/types';
import { LAB_ASSISTANT_GAME_OPPONENT_LABEL } from '@/shared/constants/lab-game-assistant-opponent';
import { resolveLabGameHumanDisplayName } from '@/shared/constants/lab-game-human-display-name';
import type { BilliardsMatchState } from './billiards-types';

/** Viewer-facing frame result — avoid showing shooter-perspective “you lose” when you won. */
export function frameStatusLineForSeat(
  state: Pick<BilliardsMatchState, 'phase' | 'winnerSeat' | 'resultMessage'>,
  yourSeat: number,
): string | null {
  if (state.phase !== 'finished') {
    return null;
  }
  if (state.winnerSeat === yourSeat) {
    return 'You win the frame!';
  }
  if (state.winnerSeat != null && state.winnerSeat !== yourSeat) {
    return 'You lose the frame.';
  }
  return state.resultMessage ?? 'Frame over.';
}

export interface BilliardsSeatNameResolver {
  seatDisplayName(match: MatchView, seat: number): string;
}

const FOR_SEAT_RE = /\bfor seat ([12])\b/gi;
/** Foul summaries end with `— ball in hand` before power % or assignment tail. */
const FOUL_BALL_IN_HAND_RE = /\s—\s*ball in hand\b/gi;

function opponentSeatOf(seat: number): number {
  return seat === 1 ? 2 : 1;
}

/**
 * Fouls award ball in hand to the non-shooter — state who receives it for the feed reader.
 */
function clarifyFoulBallInHandForViewer(
  summary: string,
  match: MatchView,
  foulingSeat: number,
  resolver: BilliardsSeatNameResolver,
): string {
  if (!/\bball in hand\b/i.test(summary)) {
    return summary;
  }
  if (/\byou have ball in hand\b/i.test(summary) || /\bhas ball in hand\b/i.test(summary)) {
    return summary;
  }
  const recipientSeat = opponentSeatOf(foulingSeat);
  const recipientPhrase =
    recipientSeat === match.yourSeat
      ? ' — you have ball in hand'
      : ` — ${resolver.seatDisplayName(match, recipientSeat)} has ball in hand`;
  return summary.replace(FOUL_BALL_IN_HAND_RE, recipientPhrase);
}

/**
 * Rewrites persisted server copy (`for seat 1`) into viewer-facing lab display names.
 */
export function humanizeBilliardsTurnSummary(
  summary: string,
  resolver: BilliardsSeatNameResolver,
  match: MatchView,
  moverSeat?: number,
): string {
  let text = summary.replace(FOR_SEAT_RE, (_match, seatStr: string) => {
    const seat = Number(seatStr);
    if (seat !== 1 && seat !== 2) {
      return _match;
    }
    return `for ${resolver.seatDisplayName(match, seat)}`;
  });
  if (moverSeat === 1 || moverSeat === 2) {
    text = clarifyFoulBallInHandForViewer(text, match, moverSeat, resolver);
  }
  return text;
}

export function createBilliardsSeatNameResolver(options: {
  rosterNameForUserId: (userId: number) => string | null;
  humanDisplayName?: string | null;
}): BilliardsSeatNameResolver {
  return {
    seatDisplayName(match: MatchView, seat: number): string {
      if (seat === match.yourSeat) {
        return resolveLabGameHumanDisplayName(options.humanDisplayName);
      }
      if (match.opponentKind === 'ai') {
        return LAB_ASSISTANT_GAME_OPPONENT_LABEL;
      }
      const userId = seat === 1 ? match.player1Id : match.player2Id;
      const fromRoster = options.rosterNameForUserId(userId);
      return fromRoster ?? `User ${userId}`;
    },
  };
}
