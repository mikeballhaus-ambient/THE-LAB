import type { MatchView } from '@/shared/game-platform/types';
import type { DetectBanterMomentFn } from '../types';
import { detectMatchEndBanterMoment } from '../match-end-moment';
import { composeBanterDetectors, detectFromHistoryKeywords } from '../compose-detectors';

/** Banter only on committed actions in turn history — not pot deltas (those fire before the agent acts). */
const POKER_KEYWORDS = [
  { test: (s: string) => s.includes('all-in') || s.includes('all in'), kind: 'highlight' as const },
  { test: (s: string) => s.includes('showdown'), kind: 'highlight' as const },
  { test: (s: string) => s.includes('fold'), kind: 'highlight' as const },
  { test: (s: string) => s.startsWith('bet ') || s.includes('bet '), kind: 'highlight' as const },
  { test: (s: string) => s.includes('raised to'), kind: 'highlight' as const },
];

function detectPokerMidGame(prev: MatchView | null, next: MatchView): ReturnType<DetectBanterMomentFn> {
  if (!prev || next.status !== 'active') {
    return null;
  }
  return detectFromHistoryKeywords(prev, next, POKER_KEYWORDS);
}

export const detectPokerHoldemBanterMoment: DetectBanterMomentFn = composeBanterDetectors(
  detectMatchEndBanterMoment,
  detectPokerMidGame,
);
