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
  availableMoves,
  type TicTacToeMove,
  type TicTacToeState,
} from './rules';

const ticTacToeGame: MinimaxGame<TicTacToeState, TicTacToeMove> = {
  seatToMove: (s) => s.currentSeat,
  enumerateMoves: (s, seat) => {
    if (s.currentSeat !== seat || s.finished) {
      return [];
    }
    return availableMoves(s.board).map((index) => ({ type: 'place', index }));
  },
  apply: (s, move, seat) => {
    if (s.currentSeat !== seat) {
      return s;
    }
    return applyMove(s, move);
  },
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
  evaluate: (s, seatToMove) => {
    if (s.winnerSeat === seatToMove) {
      return MINIMAX_MATE_SCORE;
    }
    if (s.winnerSeat != null) {
      return -MINIMAX_MATE_SCORE;
    }
    return 0;
  },
};

export function buildTicTacToeSearchAdvisory(
  state: TicTacToeState,
  playerSeat: number,
  difficulty: GameDifficulty,
): string {
  if (playerSeat !== 1 && playerSeat !== 2) {
    return '';
  }
  const seat = playerSeat as 1 | 2;
  const depth = searchDepthFor('tic-tac-toe', difficulty);
  const ranked = rankMinimaxRootMoves(ticTacToeGame, state, seat, depth, {
    limit: searchAdvisoryMoveLimit(difficulty),
    maxNodes: 5_000,
  });
  if (ranked.length === 0) {
    return '';
  }
  const lines = [
    LLM_SEARCH_ADVISORY_HEADER,
    `Tic-tac-toe search depth: ${depth} plies.`,
    'Ranked cells (best first):',
    ...ranked.map(
      (row, index) =>
        `${index + 1}. index ${row.move.index} | est ${formatMinimaxScore(row.score, MINIMAX_MATE_SCORE)}`,
    ),
    '',
    LLM_SEARCH_ADVISORY_FOOTER,
  ];
  return lines.join('\n');
}

export function chooseTicTacToeSearchMove(
  state: TicTacToeState,
  playerSeat: number,
  difficulty: GameDifficulty,
): TicTacToeMove | null {
  if (playerSeat !== 1 && playerSeat !== 2) {
    return null;
  }
  const seat = playerSeat as 1 | 2;
  const depth = searchDepthFor('tic-tac-toe', difficulty);
  return chooseMinimaxMove(ticTacToeGame, state, seat, depth, {
    softNoise: searchSoftNoiseFor('tic-tac-toe', difficulty),
    maxNodes: 5_000,
  });
}
