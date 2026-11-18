import { describe, expect, test } from '@jest/globals';
import {
  applyChessMove,
  createInitialPieces,
  isLegalMove,
  pieceAt,
  hasLegalMoves,
  chessStatus,
  chessFinishReasonForSeat,
  type ChessPiece,
} from '@/apps/chess/back-end/rules';

describe('chess rules', () => {
  test('initial position has 32 pieces and white to move', () => {
    const pieces = createInitialPieces();
    expect(pieces).toHaveLength(32);
    expect(hasLegalMoves(pieces, 'white')).toBe(true);
    expect(hasLegalMoves(pieces, 'black')).toBe(true);
  });

  test('applyMove relocates the moving piece and removes only the captured piece', () => {
    const pieces = createInitialPieces();
    // White e2 pawn (row 6, col 4) to e4 (row 4).
    const before = pieces.length;
    const next = applyChessMove(pieces, { row: 6, col: 4 }, { row: 4, col: 4 });
    expect(next).toHaveLength(before); // no capture
    expect(pieceAt(next, 6, 4)).toBeNull();
    expect(pieceAt(next, 4, 4)?.type).toBe('pawn');
    expect(pieceAt(next, 4, 4)?.color).toBe('white');
  });

  test('a capture removes the opponent piece and keeps the mover', () => {
    const pieces: ChessPiece[] = [
      { id: 1, row: 7, col: 4, type: 'king', color: 'white', hasMoved: false },
      { id: 2, row: 0, col: 0, type: 'king', color: 'black', hasMoved: false },
      { id: 3, row: 4, col: 4, type: 'rook', color: 'white', hasMoved: true },
      { id: 4, row: 4, col: 6, type: 'pawn', color: 'black', hasMoved: true },
    ];
    const next = applyChessMove(pieces, { row: 4, col: 4 }, { row: 4, col: 6 });
    expect(pieceAt(next, 4, 6)?.id).toBe(3); // mover now on target
    expect(next.find((p) => p.id === 4)).toBeUndefined(); // captured removed
    expect(next.find((p) => p.id === 3)?.row).toBe(4);
  });

  test('illegal moves are rejected (own piece, blocked path, off-turn color)', () => {
    const pieces = createInitialPieces();
    expect(isLegalMove(pieces, 'white', { row: 7, col: 0 }, { row: 6, col: 0 })).toBe(false); // rook blocked
    expect(isLegalMove(pieces, 'white', { row: 6, col: 0 }, { row: 5, col: 1 })).toBe(false); // pawn can't capture empty
    expect(isLegalMove(pieces, 'black', { row: 6, col: 4 }, { row: 4, col: 4 })).toBe(false); // not black's piece
  });

  test('a king may not move into check', () => {
    const pieces: ChessPiece[] = [
      { id: 1, row: 7, col: 4, type: 'king', color: 'white', hasMoved: false },
      { id: 2, row: 0, col: 0, type: 'king', color: 'black', hasMoved: false },
      { id: 3, row: 5, col: 4, type: 'rook', color: 'black', hasMoved: true },
    ];
    // Moving to (7,3) stays on the e-file? No â€” rook attacks the e-file (col 4).
    expect(isLegalMove(pieces, 'white', { row: 7, col: 4 }, { row: 7, col: 3 })).toBe(true);
    expect(isLegalMove(pieces, 'white', { row: 7, col: 4 }, { row: 6, col: 4 })).toBe(false);
  });

  test('checkmate detection ends the game for the winning seat', () => {
    // Back-rank mate: black rook on a1, white king on g1 walled in by its pawns.
    const pieces: ChessPiece[] = [
      { id: 1, row: 7, col: 6, type: 'king', color: 'white', hasMoved: true },
      { id: 2, row: 0, col: 0, type: 'king', color: 'black', hasMoved: true },
      { id: 3, row: 7, col: 0, type: 'rook', color: 'black', hasMoved: true },
      { id: 4, row: 6, col: 5, type: 'pawn', color: 'white', hasMoved: false },
      { id: 5, row: 6, col: 6, type: 'pawn', color: 'white', hasMoved: false },
      { id: 6, row: 6, col: 7, type: 'pawn', color: 'white', hasMoved: false },
    ];
    const status = chessStatus(pieces, 'white');
    expect(status.finished).toBe(true);
    expect(status.winner).toBe(2);
  });

  test('pawn promotion defaults to queen', () => {
    const pieces: ChessPiece[] = [
      { id: 1, row: 7, col: 4, type: 'king', color: 'white', hasMoved: true },
      { id: 2, row: 0, col: 0, type: 'king', color: 'black', hasMoved: true },
      { id: 3, row: 1, col: 4, type: 'pawn', color: 'white', hasMoved: true },
    ];
    const next = applyChessMove(pieces, { row: 1, col: 4 }, { row: 0, col: 4 });
    expect(pieceAt(next, 0, 4)?.type).toBe('queen');
  });

  test('pawn promotion accepts chosen piece', () => {
    const pieces: ChessPiece[] = [
      { id: 1, row: 7, col: 4, type: 'king', color: 'white', hasMoved: true },
      { id: 2, row: 0, col: 0, type: 'king', color: 'black', hasMoved: true },
      { id: 3, row: 1, col: 4, type: 'pawn', color: 'white', hasMoved: true },
    ];
    const next = applyChessMove(pieces, { row: 1, col: 4 }, { row: 0, col: 4 }, 'knight');
    expect(pieceAt(next, 0, 4)?.type).toBe('knight');
  });

  test('white can castle kingside when path is clear and not in check', () => {
    const pieces: ChessPiece[] = [
      { id: 1, row: 7, col: 4, type: 'king', color: 'white', hasMoved: false },
      { id: 2, row: 7, col: 7, type: 'rook', color: 'white', hasMoved: false },
      { id: 3, row: 0, col: 4, type: 'king', color: 'black', hasMoved: true },
    ];
    expect(isLegalMove(pieces, 'white', { row: 7, col: 4 }, { row: 7, col: 6 })).toBe(true);
    const next = applyChessMove(pieces, { row: 7, col: 4 }, { row: 7, col: 6 });
    expect(pieceAt(next, 7, 6)?.type).toBe('king');
    expect(pieceAt(next, 7, 5)?.type).toBe('rook');
    expect(pieceAt(next, 7, 4)).toBeNull();
    expect(pieceAt(next, 7, 7)).toBeNull();
  });

  test('castling is illegal when king is in check', () => {
    const pieces: ChessPiece[] = [
      { id: 1, row: 7, col: 4, type: 'king', color: 'white', hasMoved: false },
      { id: 2, row: 7, col: 7, type: 'rook', color: 'white', hasMoved: false },
      { id: 3, row: 0, col: 4, type: 'king', color: 'black', hasMoved: true },
      { id: 4, row: 4, col: 4, type: 'rook', color: 'black', hasMoved: true },
    ];
    expect(isLegalMove(pieces, 'white', { row: 7, col: 4 }, { row: 7, col: 6 })).toBe(false);
  });

  test('chessFinishReasonForSeat reports stalemate for side with no legal moves', () => {
    const pieces: ChessPiece[] = [
      { id: 1, row: 7, col: 4, type: 'king', color: 'white', hasMoved: true },
      { id: 2, row: 2, col: 0, type: 'queen', color: 'white', hasMoved: true },
      { id: 3, row: 0, col: 1, type: 'queen', color: 'white', hasMoved: true },
      { id: 4, row: 1, col: 7, type: 'queen', color: 'white', hasMoved: true },
      { id: 5, row: 7, col: 2, type: 'bishop', color: 'white', hasMoved: true },
      { id: 6, row: 3, col: 3, type: 'bishop', color: 'white', hasMoved: true },
      { id: 7, row: 3, col: 4, type: 'knight', color: 'white', hasMoved: true },
      { id: 8, row: 0, col: 7, type: 'knight', color: 'white', hasMoved: true },
      { id: 9, row: 7, col: 0, type: 'rook', color: 'white', hasMoved: true },
      { id: 10, row: 7, col: 7, type: 'rook', color: 'white', hasMoved: true },
      { id: 11, row: 6, col: 0, type: 'pawn', color: 'white', hasMoved: true },
      { id: 12, row: 4, col: 5, type: 'pawn', color: 'white', hasMoved: true },
      { id: 13, row: 5, col: 6, type: 'pawn', color: 'white', hasMoved: true },
      { id: 14, row: 6, col: 7, type: 'pawn', color: 'white', hasMoved: true },
      { id: 15, row: 1, col: 4, type: 'king', color: 'black', hasMoved: true },
      { id: 16, row: 1, col: 6, type: 'pawn', color: 'black', hasMoved: true },
    ];
    expect(chessFinishReasonForSeat(pieces, 2)).toBe('stalemate');
  });
});
