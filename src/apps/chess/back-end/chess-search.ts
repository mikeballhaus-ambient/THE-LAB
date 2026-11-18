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
import { agentTurnPhaseDebug, agentTurnMark } from '@/shared/utils/agent-stream-debug.node';
import {
  applyChessMove,
  chessStatus,
  isInCheck,
  legalMovesFrom,
  normalizeChessState,
  squareName,
  type ChessColor,
  type ChessMatchState,
  type ChessPiece,
  type ChessPieceType,
  type ChessSquare,
} from './rules';

export interface ChessSearchMove {
  from: ChessSquare;
  to: ChessSquare;
  promotion?: ChessPieceType;
}

interface ChessSearchState {
  pieces: ChessPiece[];
  colorToMove: ChessColor;
}

const PIECE_VALUES: Record<ChessPieceType, number> = {
  pawn: 100,
  knight: 320,
  bishop: 330,
  rook: 500,
  queen: 900,
  king: 0,
};

function colorForSeat(seat: 1 | 2): ChessColor {
  return seat === 1 ? 'white' : 'black';
}

function seatForColor(color: ChessColor): 1 | 2 {
  return color === 'white' ? 1 : 2;
}

function toSearchState(state: ChessMatchState, seatToMove: 1 | 2): ChessSearchState {
  return {
    pieces: normalizeChessState(state).pieces,
    colorToMove: colorForSeat(seatToMove),
  };
}

function enumerateMoves(pieces: readonly ChessPiece[], color: ChessColor): ChessSearchMove[] {
  const out: ChessSearchMove[] = [];
  for (const piece of pieces) {
    if (piece.color !== color) {
      continue;
    }
    const from = { row: piece.row, col: piece.col };
    for (const to of legalMovesFrom(pieces, color, from)) {
      const promoting =
        piece.type === 'pawn' && (to.row === 0 || to.row === 7);
      out.push({
        from,
        to,
        promotion: promoting ? 'queen' : undefined,
      });
    }
  }
  return out;
}

function evaluatePosition(pieces: readonly ChessPiece[], seat: 1 | 2): number {
  const myColor = colorForSeat(seat);
  const oppColor = myColor === 'white' ? 'black' : 'white';
  let score = 0;
  for (const piece of pieces) {
    const value = PIECE_VALUES[piece.type];
    if (piece.color === myColor) {
      score += value;
    } else {
      score -= value;
    }
  }
  if (isInCheck(pieces, myColor)) {
    score -= 35;
  }
  if (isInCheck(pieces, oppColor)) {
    score += 35;
  }
  return score;
}

const chessMinimaxGame: MinimaxGame<ChessSearchState, ChessSearchMove> = {
  seatToMove: (s) => seatForColor(s.colorToMove),
  enumerateMoves: (s, seat) => {
    const color = colorForSeat(seat);
    if (s.colorToMove !== color) {
      return [];
    }
    return enumerateMoves(s.pieces, color);
  },
  apply: (s, move, seat) => {
    const color = colorForSeat(seat);
    const pieces = applyChessMove(s.pieces, move.from, move.to, move.promotion);
    return {
      pieces,
      colorToMove: color === 'white' ? 'black' : 'white',
    };
  },
  terminalScore: (s, seatToMove) => {
    const color = colorForSeat(seatToMove);
    if (s.colorToMove !== color) {
      return null;
    }
    const status = chessStatus(s.pieces, color);
    if (!status.finished) {
      return null;
    }
    if (status.stalemate) {
      return 0;
    }
    if (status.inCheck) {
      return -MINIMAX_MATE_SCORE;
    }
    return 0;
  },
  evaluate: (s, seatToMove) => evaluatePosition(s.pieces, seatToMove),
};

function formatChessSearchMoveLine(move: ChessSearchMove, score: number, rank: number): string {
  const promo =
    move.promotion != null
      ? `,promotion:${move.promotion}`
      : move.from.row !== move.to.row &&
          (move.to.row === 0 || move.to.row === 7)
        ? ',promotion:queen'
        : '';
  const label = `${squareName(move.from.row, move.from.col)}-${squareName(move.to.row, move.to.col)}`;
  const coords = `fromRow:${move.from.row},fromCol:${move.from.col},toRow:${move.to.row},toCol:${move.to.col}${promo}`;
  return `${rank}. ${label} | ${coords} | est ${formatMinimaxScore(score, MINIMAX_MATE_SCORE)}`;
}

/** Ranked search lines for the LLM user prompt (agent still submits the tool call). */
export function buildChessSearchAdvisory(
  state: ChessMatchState | ChessPiece[],
  playerSeat: number,
  difficulty: GameDifficulty,
): string {
  if (playerSeat !== 1 && playerSeat !== 2) {
    return '';
  }
  const seat = playerSeat as 1 | 2;
  const searchState = toSearchState(
    Array.isArray(state) ? { pieces: state, turnHistory: [] } : state,
    seat,
  );
  const depth = searchDepthFor('chess', difficulty);
  const legalMoveCount = enumerateMoves(searchState.pieces, searchState.colorToMove).length;
  const searchElapsed = agentTurnMark();
  const telemetry = { nodesVisited: 0 };
  const ranked = rankMinimaxRootMoves(chessMinimaxGame, searchState, seat, depth, {
    limit: searchAdvisoryMoveLimit(difficulty),
    maxNodes: difficulty === 'boss' ? 120_000 : 80_000,
    telemetry,
  });
  agentTurnPhaseDebug('chessMinimaxSearchAdvisory', {
    difficulty,
    depth,
    legalMoveCount,
    rankedLines: ranked.length,
    nodesVisited: telemetry.nodesVisited,
    searchMs: searchElapsed(),
  });
  if (ranked.length === 0) {
    return '';
  }
  const lines = [
    LLM_SEARCH_ADVISORY_HEADER,
    `Chess search depth: ${depth} plies (local alpha-beta, same rules as the board).`,
    'Ranked candidate lines (best first):',
    ...ranked.map((row, index) => formatChessSearchMoveLine(row.move, row.score, index + 1)),
    '',
    LLM_SEARCH_ADVISORY_FOOTER,
  ];
  return lines.join('\n');
}

/** Engine pick (tests / tooling). Catalog AI uses {@link buildChessSearchAdvisory} + LLM. */
export function chooseChessSearchMove(
  state: ChessMatchState | ChessPiece[],
  playerSeat: number,
  difficulty: GameDifficulty,
): ChessSearchMove | null {
  if (playerSeat !== 1 && playerSeat !== 2) {
    return null;
  }
  const seat = playerSeat as 1 | 2;
  const searchState = toSearchState(
    Array.isArray(state) ? { pieces: state, turnHistory: [] } : state,
    seat,
  );
  const depth = searchDepthFor('chess', difficulty);
  const softNoise = searchSoftNoiseFor('chess', difficulty);
  return chooseMinimaxMove(chessMinimaxGame, searchState, seat, depth, {
    softNoise,
    maxNodes: difficulty === 'boss' ? 120_000 : 80_000,
  });
}
