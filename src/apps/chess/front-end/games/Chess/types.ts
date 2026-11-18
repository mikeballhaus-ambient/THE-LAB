/**
 * Chess board shapes as sent by the match view.
 *
 * Kept in a plain module (not a `.vue`) so both the board and the app shell can
 * import it — Vue SFCs do not re-export types.
 */
export type ChessColor = 'white' | 'black';
export type ChessPieceType = 'king' | 'queen' | 'rook' | 'bishop' | 'knight' | 'pawn';

export interface ChessBoardPiece {
  id: number;
  type: ChessPieceType;
  color: ChessColor;
  row: number;
  col: number;
}

export interface ChessSquareRef {
  row: number;
  col: number;
}

export type PromotionChoice = Exclude<ChessPieceType, 'king' | 'pawn'>;
