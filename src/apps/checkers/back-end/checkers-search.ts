import {
  chooseMinimaxMove,
  MINIMAX_MATE_SCORE,
  rankMinimaxRootMoves,
  searchAdvisoryMoveLimit,
  searchDepthFor,
  searchSoftNoiseFor,
  type MinimaxGame,
} from '@/shared/game-platform/minimax-core';
import {
  formatMinimaxScore,
  LLM_SEARCH_ADVISORY_FOOTER,
  LLM_SEARCH_ADVISORY_HEADER,
} from '@/shared/game-platform/search-advisory-prompt';
import type { GameDifficulty } from '@/shared/game-platform/types';
import {
  applyMove,
  legalMovesFor,
  type CheckersMove,
  type CheckersState,
} from './rules';

function enumerateCheckersMoves(state: CheckersState, seat: 1 | 2): CheckersMove[] {
  if (state.finished || state.currentSeat !== seat) {
    return [];
  }
  const out: CheckersMove[] = [];
  for (const piece of state.pieces.filter((p) => p.color === seat)) {
    if (state.jumpChainPieceId != null && piece.id !== state.jumpChainPieceId) {
      continue;
    }
    for (const dest of legalMovesFor(state, piece)) {
      out.push({
        type: 'move',
        pieceId: piece.id,
        toRow: dest.row,
        toCol: dest.col,
      });
    }
  }
  return out;
}

function evaluateCheckers(state: CheckersState, seat: 1 | 2): number {
  let score = 0;
  for (const piece of state.pieces) {
    const unit = piece.isKing ? 175 : 100;
    if (piece.color === seat) {
      score += unit;
    } else {
      score -= unit;
    }
  }
  return score;
}

const checkersGame: MinimaxGame<CheckersState, CheckersMove> = {
  seatToMove: (s) => s.currentSeat,
  enumerateMoves: enumerateCheckersMoves,
  apply: (s, move, seat) => applyMove(s, move, seat),
  terminalScore: (s, seatToMove) => {
    if (!s.finished) {
      return null;
    }
    if (s.winnerSeat == null) {
      return 0;
    }
    if (s.winnerSeat === seatToMove) {
      return MINIMAX_MATE_SCORE;
    }
    return -MINIMAX_MATE_SCORE;
  },
  evaluate: (s, seatToMove) => evaluateCheckers(s, seatToMove),
};

export function buildCheckersSearchAdvisory(
  state: CheckersState,
  playerSeat: number,
  difficulty: GameDifficulty,
): string {
  if (playerSeat !== 1 && playerSeat !== 2) {
    return '';
  }
  const seat = playerSeat as 1 | 2;
  const depth = searchDepthFor('checkers', difficulty);
  const ranked = rankMinimaxRootMoves(checkersGame, state, seat, depth, {
    limit: searchAdvisoryMoveLimit(difficulty),
    maxNodes: 150_000,
  });
  if (ranked.length === 0) {
    return '';
  }
  const lines = [
    LLM_SEARCH_ADVISORY_HEADER,
    `Checkers search depth: ${depth} plies.`,
    'Ranked moves (best first):',
    ...ranked.map(
      (row, index) =>
        `${index + 1}. piece ${row.move.pieceId} → (${row.move.toRow},${row.move.toCol}) | est ${formatMinimaxScore(row.score, MINIMAX_MATE_SCORE)}`,
    ),
    '',
    LLM_SEARCH_ADVISORY_FOOTER,
  ];
  return lines.join('\n');
}

export function chooseCheckersSearchMove(
  state: CheckersState,
  playerSeat: number,
  difficulty: GameDifficulty,
): CheckersMove | null {
  if (playerSeat !== 1 && playerSeat !== 2) {
    return null;
  }
  const seat = playerSeat as 1 | 2;
  const depth = searchDepthFor('checkers', difficulty);
  return chooseMinimaxMove(checkersGame, state, seat, depth, {
    softNoise: searchSoftNoiseFor('checkers', difficulty),
    maxNodes: 150_000,
  });
}
