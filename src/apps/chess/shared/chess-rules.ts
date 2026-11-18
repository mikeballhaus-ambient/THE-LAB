/**
 * Chess rules — pure, framework-free move generation and legality.
 *
 * Board orientation matches the UI: row 0 is Black's back rank, row 7 is
 * White's back rank, column 0 is the a-file.
 *
 * Scope: standard piece movement plus castling. Check, checkmate and stalemate are
 * derived by simulation, so pinned pieces and kings moving into an attacked
 * square are rejected generically.
 */

export type ChessColor = 'white' | 'black';
export type ChessPieceType = 'king' | 'queen' | 'rook' | 'bishop' | 'knight' | 'pawn';

export interface ChessPiece {
  id: number;
  row: number;
  col: number;
  type: ChessPieceType;
  color: ChessColor;
  hasMoved: boolean;
}

export interface ChessSquare {
  row: number;
  col: number;
}

export interface ChessStatus {
  /** True when the side to move has no legal moves (mate or stalemate). */
  finished: boolean;
  /** `id` of the winning king, or null for stalemate / game still running. */
  winner: number | null;
  inCheck: boolean;
  stalemate: boolean;
}

export const CHESS_BOARD_SIZE = 8;

const BACK_RANK: ChessPieceType[] = [
  'rook',
  'knight',
  'bishop',
  'queen',
  'king',
  'bishop',
  'knight',
  'rook',
];

function inBounds(row: number, col: number): boolean {
  return row >= 0 && row < CHESS_BOARD_SIZE && col >= 0 && col < CHESS_BOARD_SIZE;
}

export function opponentOf(color: ChessColor): ChessColor {
  return color === 'white' ? 'black' : 'white';
}

/** The standard 32-piece starting position — White on rows 6–7, Black on 0–1. */
export function createInitialPieces(): ChessPiece[] {
  const pieces: ChessPiece[] = [];
  let id = 1;

  for (let col = 0; col < CHESS_BOARD_SIZE; col++) {
    pieces.push({ id: id++, row: 0, col, type: BACK_RANK[col], color: 'black', hasMoved: false });
  }
  for (let col = 0; col < CHESS_BOARD_SIZE; col++) {
    pieces.push({ id: id++, row: 1, col, type: 'pawn', color: 'black', hasMoved: false });
  }
  for (let col = 0; col < CHESS_BOARD_SIZE; col++) {
    pieces.push({ id: id++, row: 6, col, type: 'pawn', color: 'white', hasMoved: false });
  }
  for (let col = 0; col < CHESS_BOARD_SIZE; col++) {
    pieces.push({ id: id++, row: 7, col, type: BACK_RANK[col], color: 'white', hasMoved: false });
  }

  return pieces;
}

export function pieceAt(pieces: readonly ChessPiece[], row: number, col: number): ChessPiece | null {
  return pieces.find((p) => p.row === row && p.col === col) ?? null;
}

function kingOf(pieces: readonly ChessPiece[], color: ChessColor): ChessPiece | null {
  return pieces.find((p) => p.type === 'king' && p.color === color) ?? null;
}

/** True when no piece lies strictly between `from` and `to` (same row/col/diagonal). */
function pathIsClear(pieces: readonly ChessPiece[], from: ChessSquare, to: ChessSquare): boolean {
  const rowStep = Math.sign(to.row - from.row);
  const colStep = Math.sign(to.col - from.col);
  let row = from.row + rowStep;
  let col = from.col + colStep;

  while (row !== to.row || col !== to.col) {
    if (pieceAt(pieces, row, col)) return false;
    row += rowStep;
    col += colStep;
  }
  return true;
}

function backRank(color: ChessColor): number {
  return color === 'white' ? 7 : 0;
}

type CastleSide = 'kingside' | 'queenside';

function castleSideFromMove(from: ChessSquare, to: ChessSquare): CastleSide | null {
  if (from.row !== to.row || Math.abs(to.col - from.col) !== 2) {
    return null;
  }
  return to.col > from.col ? 'kingside' : 'queenside';
}

function rookColsForCastle(side: CastleSide): { fromCol: number; toCol: number } {
  return side === 'kingside' ? { fromCol: 7, toCol: 5 } : { fromCol: 0, toCol: 3 };
}

function pathClearOnRank(
  pieces: readonly ChessPiece[],
  row: number,
  fromCol: number,
  toCol: number,
): boolean {
  const step = fromCol < toCol ? 1 : -1;
  for (let c = fromCol + step; c !== toCol; c += step) {
    if (pieceAt(pieces, row, c)) {
      return false;
    }
  }
  return true;
}

/** Standard castling (king on e-file, unmoved king and rook, clear path, not through check). */
export function canCastle(
  pieces: readonly ChessPiece[],
  color: ChessColor,
  side: CastleSide,
): boolean {
  const rank = backRank(color);
  const king = kingOf(pieces, color);
  if (!king || king.row !== rank || king.col !== 4 || king.hasMoved) {
    return false;
  }
  if (isInCheck(pieces, color)) {
    return false;
  }

  const { fromCol: rookCol } = rookColsForCastle(side);
  const rook = pieceAt(pieces, rank, rookCol);
  if (!rook || rook.type !== 'rook' || rook.color !== color || rook.hasMoved) {
    return false;
  }

  const kingDestCol = side === 'kingside' ? 6 : 2;
  if (!pathClearOnRank(pieces, rank, king.col, rookCol)) {
    return false;
  }
  if (pieceAt(pieces, rank, kingDestCol)) {
    return false;
  }

  const passCols =
    side === 'kingside' ? [4, 5, 6] : [4, 3, 2];
  for (const col of passCols) {
    if (isSquareAttacked(pieces, { row: rank, col }, opponentOf(color))) {
      return false;
    }
  }
  return true;
}

function isCastleMove(
  pieces: readonly ChessPiece[],
  piece: ChessPiece,
  from: ChessSquare,
  to: ChessSquare,
): CastleSide | null {
  if (piece.type !== 'king') {
    return null;
  }
  const rank = backRank(piece.color);
  if (from.row !== rank || to.row !== rank || from.col !== 4) {
    return null;
  }
  const side = castleSideFromMove(from, to);
  if (!side) {
    return null;
  }
  return canCastle(pieces, piece.color, side) ? side : null;
}

function isPseudoLegal(
  pieces: readonly ChessPiece[],
  piece: ChessPiece,
  to: ChessSquare,
): boolean {
  if (!inBounds(to.row, to.col)) return false;

  const target = pieceAt(pieces, to.row, to.col);
  if (target && target.color === piece.color) return false;

  const rowDelta = to.row - piece.row;
  const colDelta = to.col - piece.col;
  const absRow = Math.abs(rowDelta);
  const absCol = Math.abs(colDelta);

  switch (piece.type) {
    case 'pawn': {
      const direction = piece.color === 'white' ? -1 : 1;
      // Straight advance: never captures.
      if (colDelta === 0) {
        if (rowDelta === direction && !target) return true;
        const startRow = piece.color === 'white' ? 6 : 1;
        if (piece.row === startRow && rowDelta === direction * 2 && !target) {
          return !pieceAt(pieces, piece.row + direction, piece.col);
        }
        return false;
      }
      // Diagonal capture only.
      return absCol === 1 && rowDelta === direction && target !== null;
    }
    case 'knight':
      return (absRow === 2 && absCol === 1) || (absRow === 1 && absCol === 2);
    case 'bishop':
      return absRow === absCol && absRow > 0 && pathIsClear(pieces, piece, to);
    case 'rook':
      return (
        (rowDelta === 0 || colDelta === 0) &&
        absRow + absCol > 0 &&
        pathIsClear(pieces, piece, to)
      );
    case 'queen':
      return (
        ((rowDelta === 0 || colDelta === 0) || absRow === absCol) &&
        absRow + absCol > 0 &&
        pathIsClear(pieces, piece, to)
      );
    case 'king': {
      const side = isCastleMove(pieces, piece, { row: piece.row, col: piece.col }, to);
      if (side) {
        return true;
      }
      return absRow <= 1 && absCol <= 1 && absRow + absCol > 0;
    }
    default:
      return false;
  }
}

/**
 * Returns the new piece list with the move applied.
 * Never mutates the input; the captured piece (if any) is the only removal.
 */
export function applyChessMove(
  pieces: readonly ChessPiece[],
  from: ChessSquare,
  to: ChessSquare,
  promotion?: ChessPieceType,
): ChessPiece[] {
  const mover = pieceAt(pieces, from.row, from.col);
  if (!mover) return pieces.map((p) => ({ ...p }));

  const castleSide =
    mover.type === 'king' ? isCastleMove(pieces, mover, from, to) : null;

  if (castleSide) {
    const rank = backRank(mover.color);
    const { fromCol: rookCol, toCol: rookToCol } = rookColsForCastle(castleSide);
    const kingToCol = castleSide === 'kingside' ? 6 : 2;
    return pieces.map((p) => {
      if (p.id === mover.id) {
        return { ...p, row: rank, col: kingToCol, hasMoved: true };
      }
      if (p.row === rank && p.col === rookCol && p.type === 'rook' && p.color === mover.color) {
        return { ...p, col: rookToCol, hasMoved: true };
      }
      return { ...p };
    });
  }

  return pieces
    .filter((p) => !(p.row === to.row && p.col === to.col))
    .map((p) => {
      if (p.id !== mover.id) {
        return { ...p };
      }
      let type = p.type;
      if (p.type === 'pawn' && (to.row === 0 || to.row === CHESS_BOARD_SIZE - 1)) {
        type = promotion ?? 'queen';
      }
      return { ...p, row: to.row, col: to.col, hasMoved: true, type };
    });
}

/** True when `color`'s king occupies a square attacked by the other side. */
export function isInCheck(pieces: readonly ChessPiece[], color: ChessColor): boolean {
  const king = kingOf(pieces, color);
  if (!king) return false;
  return isSquareAttacked(pieces, { row: king.row, col: king.col }, opponentOf(color));
}

function isSquareAttacked(
  pieces: readonly ChessPiece[],
  square: ChessSquare,
  byColor: ChessColor,
): boolean {
  return pieces.some(
    (p) =>
      p.color === byColor &&
      !(p.type === 'king' && Math.abs(p.row - square.row) <= 1 && Math.abs(p.col - square.col) <= 1 && false) &&
      isPseudoLegal(pieces, p, square),
  );
}

/**
 * A move is legal when the piece belongs to `color`, the movement pattern is
 * valid, and the move does not leave that colour's own king in check.
 */
export function isLegalMove(
  pieces: readonly ChessPiece[],
  color: ChessColor,
  from: ChessSquare,
  to: ChessSquare,
): boolean {
  const piece = pieceAt(pieces, from.row, from.col);
  if (!piece || piece.color !== color) return false;
  if (!isPseudoLegal(pieces, piece, to)) return false;

  const next = applyChessMove(pieces, from, to);
  return !isInCheck(next, color);
}

/** Every legal destination for the piece on `from`. */
export function legalMovesFrom(
  pieces: readonly ChessPiece[],
  color: ChessColor,
  from: ChessSquare,
): ChessSquare[] {
  const moves: ChessSquare[] = [];
  for (let row = 0; row < CHESS_BOARD_SIZE; row++) {
    for (let col = 0; col < CHESS_BOARD_SIZE; col++) {
      if (isLegalMove(pieces, color, from, { row, col })) moves.push({ row, col });
    }
  }
  return moves;
}

export function hasLegalMoves(pieces: readonly ChessPiece[], color: ChessColor): boolean {
  return pieces
    .filter((p) => p.color === color)
    .some((p) =>
      legalMovesFrom(pieces, color, { row: p.row, col: p.col }).length > 0,
    );
}

/**
 * Game state for the side to move.
 * `winner` is the winning king's `id`; null while running or on stalemate.
 */
export function chessStatus(pieces: readonly ChessPiece[], colorToMove: ChessColor): ChessStatus {
  const inCheck = isInCheck(pieces, colorToMove);

  if (hasLegalMoves(pieces, colorToMove)) {
    return { finished: false, winner: null, inCheck, stalemate: false };
  }

  if (inCheck) {
    const winnerKing = kingOf(pieces, opponentOf(colorToMove));
    return { finished: true, winner: winnerKing?.id ?? null, inCheck: true, stalemate: false };
  }

  return { finished: true, winner: null, inCheck: false, stalemate: true };
}

/** When the match is over, why the side to move lost / drew (from final `currentSeat`). */
export function chessFinishReasonForSeat(
  pieces: readonly ChessPiece[],
  seatToMove: 1 | 2,
): 'stalemate' | 'checkmate' | null {
  const color: ChessColor = seatToMove === 1 ? 'white' : 'black';
  const status = chessStatus(pieces, color);
  if (!status.finished) {
    return null;
  }
  return status.stalemate ? 'stalemate' : 'checkmate';
}

export interface ChessTurnHistoryEntry {
  seat: number;
  summary: string;
}

export interface ChessMatchState {
  pieces: ChessPiece[];
  turnHistory?: ChessTurnHistoryEntry[];
}

const FILE_LABELS = 'abcdefgh';

export function squareName(row: number, col: number): string {
  return `${FILE_LABELS[col] ?? '?'}${CHESS_BOARD_SIZE - row}`;
}

export function summarizeChessMove(
  pieces: readonly ChessPiece[],
  from: ChessSquare,
  to: ChessSquare,
  promotion?: ChessPieceType,
): string {
  const mover = pieceAt(pieces, from.row, from.col);
  const captured = pieceAt(pieces, to.row, to.col);
  const castleSide =
    mover?.type === 'king' ? isCastleMove(pieces, mover, from, to) : null;
  if (castleSide) {
    return castleSide === 'kingside' ? 'Castles kingside (O-O)' : 'Castles queenside (O-O-O)';
  }
  const base = `${squareName(from.row, from.col)}→${squareName(to.row, to.col)}`;
  if (captured) {
    return `${base} (captures ${captured.type})`;
  }
  if (mover?.type === 'pawn' && (to.row === 0 || to.row === CHESS_BOARD_SIZE - 1)) {
    const piece = promotion ?? 'queen';
    return `${base} (promotes to ${piece})`;
  }
  return base;
}

/** Legacy matches persisted state as a bare piece array. */
export function normalizeChessState(
  state: ChessMatchState | readonly ChessPiece[] | ChessPiece[],
): ChessMatchState {
  if (Array.isArray(state)) {
    return { pieces: [...state], turnHistory: [] };
  }
  const match = state as ChessMatchState;
  return {
    pieces: match.pieces ?? [],
    turnHistory: match.turnHistory ?? [],
  };
}
