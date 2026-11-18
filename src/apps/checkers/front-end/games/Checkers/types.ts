/**
 * Board-level piece shape as sent by the match view.
 *
 * Kept in a plain module (not a `.vue`) so both the board and the app shell can
 * import it — Vue SFCs do not re-export types.
 */
export interface BoardPiece {
  id: number;
  row: number;
  col: number;
  /** 1 = red, 2 = black, matching the server adapter. */
  color: 1 | 2;
  isKing: boolean;
}
