import type { MatchView } from '@/shared/game-platform/types';
import type { DetectBanterMomentFn } from '../types';
import { detectMatchEndBanterMoment } from '../match-end-moment';
import { composeBanterDetectors, inferMoverSeat } from '../compose-detectors';

interface HangmanStateSlice {
  strikes?: number;
  guessedLetters?: string[];
  word?: string;
  guesserSeat?: number;
  setterSeat?: number;
}

function revealedLetterCount(word: string, guessed: readonly string[]): number {
  const upper = word.toUpperCase();
  const set = new Set(guessed.map((l) => l.toUpperCase()));
  let count = 0;
  for (const ch of upper) {
    if (ch >= 'A' && ch <= 'Z' && set.has(ch)) {
      count += 1;
    }
  }
  return count;
}

function detectHangmanMidGame(prev: MatchView | null, next: MatchView): ReturnType<DetectBanterMomentFn> {
  if (!prev || next.status !== 'active') {
    return null;
  }
  const prevS = prev.state as HangmanStateSlice;
  const nextS = next.state as HangmanStateSlice;
  const guesser = nextS.guesserSeat ?? inferMoverSeat(prev, next);

  const prevRevealed = revealedLetterCount(prevS.word ?? '', prevS.guessedLetters ?? []);
  const nextRevealed = revealedLetterCount(nextS.word ?? '', nextS.guessedLetters ?? []);
  if (nextRevealed > prevRevealed) {
    return { kind: 'highlight', moverSeat: guesser };
  }

  const prevStrikes = prevS.strikes ?? 0;
  const nextStrikes = nextS.strikes ?? 0;
  if (nextStrikes > prevStrikes) {
    return { kind: 'highlight', moverSeat: guesser };
  }

  return null;
}

export const detectHangmanBanterMoment: DetectBanterMomentFn = composeBanterDetectors(
  detectMatchEndBanterMoment,
  detectHangmanMidGame,
);
