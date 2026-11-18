import type { MatchView } from '@/shared/game-platform/types';
import { winnerSeatForMatch } from '@/shared/game-platform/use-turn-based-match';
import type { LabAssistantBanterMoment } from './types';

/** Match finished transition (vs–Lab Assistant only). */
export function detectMatchEndBanterMoment(
  prev: MatchView | null,
  next: MatchView,
): LabAssistantBanterMoment | null {
  if (next.opponentKind !== 'ai' || next.status !== 'finished') {
    return null;
  }
  if (prev?.status === 'finished') {
    return null;
  }
  const winnerSeat = winnerSeatForMatch(next);
  if (winnerSeat == null) {
    return { kind: 'match_draw' };
  }
  if (winnerSeat === next.yourSeat) {
    return { kind: 'match_loss', moverSeat: winnerSeat };
  }
  return { kind: 'match_win', moverSeat: winnerSeat };
}
