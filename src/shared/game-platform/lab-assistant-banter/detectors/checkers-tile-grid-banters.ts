import type { MatchView } from '@/shared/game-platform/types';
import type { DetectBanterMomentFn } from '../types';
import { detectMatchEndBanterMoment } from '../match-end-moment';
import {
  composeBanterDetectors,
  detectFromHistoryKeywords,
  inferMoverSeat,
  scoreDeltaForSeat,
} from '../compose-detectors';

const CHECKERS_KEYWORDS = [
  { test: (s: string) => s.includes('capture'), kind: 'capture' as const },
  { test: (s: string) => s.includes('crowned'), kind: 'highlight' as const },
];

function detectCheckersMidGame(prev: MatchView | null, next: MatchView): ReturnType<DetectBanterMomentFn> {
  const fromKeywords = detectFromHistoryKeywords(prev, next, CHECKERS_KEYWORDS);
  if (fromKeywords) {
    return fromKeywords;
  }
  if (!prev) {
    return null;
  }
  const mover = inferMoverSeat(prev, next);
  const prevPieces = (prev.state as { pieces?: unknown[] })?.pieces;
  const nextPieces = (next.state as { pieces?: unknown[] })?.pieces;
  if (Array.isArray(prevPieces) && Array.isArray(nextPieces) && nextPieces.length < prevPieces.length) {
    return { kind: 'capture', moverSeat: mover };
  }
  return null;
}

export const detectCheckersBanterMoment: DetectBanterMomentFn = composeBanterDetectors(
  detectMatchEndBanterMoment,
  detectCheckersMidGame,
);

const TILE_GRID_SCORE_SWING = 12;

function detectTileGridScoreSwing(prev: MatchView | null, next: MatchView): ReturnType<DetectBanterMomentFn> {
  if (!prev || next.status !== 'active') {
    return null;
  }
  const mover = inferMoverSeat(prev, next);
  const delta = scoreDeltaForSeat(prev, next, mover);
  if (delta >= TILE_GRID_SCORE_SWING) {
    return { kind: 'highlight', moverSeat: mover, detail: String(delta) };
  }
  return null;
}

export const detectWordTileBanterMoment: DetectBanterMomentFn = composeBanterDetectors(
  detectMatchEndBanterMoment,
  detectTileGridScoreSwing,
);
