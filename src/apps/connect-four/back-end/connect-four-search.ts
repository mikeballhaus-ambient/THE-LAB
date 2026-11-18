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
  availableColumns,
  COLS,
  CONNECT_LENGTH,
  ROWS,
  type CfCell,
  type ConnectFourMove,
  type ConnectFourState,
} from './rules';

function scoreWindow(cells: (CfCell | undefined)[], seat: 1 | 2): number {
  let mine = 0;
  let theirs = 0;
  let empty = 0;
  for (const c of cells) {
    if (c == null) {
      empty += 1;
    } else if (c === seat) {
      mine += 1;
    } else {
      theirs += 1;
    }
  }
  if (mine > 0 && theirs > 0) {
    return 0;
  }
  if (mine === 4) {
    return 100_000;
  }
  if (theirs === 4) {
    return -100_000;
  }
  if (mine === 3 && empty === 1) {
    return 120;
  }
  if (theirs === 3 && empty === 1) {
    return -130;
  }
  if (mine === 2 && empty === 2) {
    return 14;
  }
  if (theirs === 2 && empty === 2) {
    return -16;
  }
  return 0;
}

function evaluateBoard(board: readonly CfCell[][], seat: 1 | 2): number {
  let total = 0;
  // Horizontal
  for (let r = 0; r < ROWS; r += 1) {
    for (let c = 0; c <= COLS - CONNECT_LENGTH; c += 1) {
      total += scoreWindow(
        [0, 1, 2, 3].map((i) => board[r]?.[c + i]),
        seat,
      );
    }
  }
  // Vertical
  for (let c = 0; c < COLS; c += 1) {
    for (let r = 0; r <= ROWS - CONNECT_LENGTH; r += 1) {
      total += scoreWindow(
        [0, 1, 2, 3].map((i) => board[r + i]?.[c]),
        seat,
      );
    }
  }
  // Diagonal down-right
  for (let r = 0; r <= ROWS - CONNECT_LENGTH; r += 1) {
    for (let c = 0; c <= COLS - CONNECT_LENGTH; c += 1) {
      total += scoreWindow(
        [0, 1, 2, 3].map((i) => board[r + i]?.[c + i]),
        seat,
      );
    }
  }
  // Diagonal down-left
  for (let r = 0; r <= ROWS - CONNECT_LENGTH; r += 1) {
    for (let c = CONNECT_LENGTH - 1; c < COLS; c += 1) {
      total += scoreWindow(
        [0, 1, 2, 3].map((i) => board[r + i]?.[c - i]),
        seat,
      );
    }
  }
  return total;
}

const connectFourGame: MinimaxGame<ConnectFourState, ConnectFourMove> = {
  seatToMove: (s) => s.currentSeat,
  enumerateMoves: (s, seat) => {
    if (s.finished || s.currentSeat !== seat) {
      return [];
    }
    return availableColumns(s.board).map((col) => ({ type: 'drop', col }));
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
  evaluate: (s, seatToMove) => evaluateBoard(s.board, seatToMove),
};

export function buildConnectFourSearchAdvisory(
  state: ConnectFourState,
  playerSeat: number,
  difficulty: GameDifficulty,
): string {
  if (playerSeat !== 1 && playerSeat !== 2) {
    return '';
  }
  const seat = playerSeat as 1 | 2;
  const depth = searchDepthFor('connect-four', difficulty);
  const ranked = rankMinimaxRootMoves(connectFourGame, state, seat, depth, {
    limit: searchAdvisoryMoveLimit(difficulty),
    maxNodes: 200_000,
  });
  if (ranked.length === 0) {
    return '';
  }
  const lines = [
    LLM_SEARCH_ADVISORY_HEADER,
    `Connect Four search depth: ${depth} plies.`,
    'Ranked columns (best first):',
    ...ranked.map(
      (row, index) =>
        `${index + 1}. col ${row.move.col} | est ${formatMinimaxScore(row.score, MINIMAX_MATE_SCORE)}`,
    ),
    '',
    LLM_SEARCH_ADVISORY_FOOTER,
  ];
  return lines.join('\n');
}

export function chooseConnectFourSearchMove(
  state: ConnectFourState,
  playerSeat: number,
  difficulty: GameDifficulty,
): ConnectFourMove | null {
  if (playerSeat !== 1 && playerSeat !== 2) {
    return null;
  }
  const seat = playerSeat as 1 | 2;
  const depth = searchDepthFor('connect-four', difficulty);
  return chooseMinimaxMove(connectFourGame, state, seat, depth, {
    softNoise: searchSoftNoiseFor('connect-four', difficulty),
    maxNodes: 200_000,
  });
}
