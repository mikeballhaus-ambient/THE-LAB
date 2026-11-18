/**
 * Connect Four rules — pure, framework-free.
 *
 * Board is 6 rows × 7 columns. `board[row][col]`, row 0 is the TOP row.
 * Gravity means a piece always falls to the lowest empty row in its column.
 */

export const COLS = 7;
export const ROWS = 6;
export const CONNECT_LENGTH = 4;

export type CfCell = 1 | 2 | null;

export interface ConnectFourState {
  /** `board[row][col]` — row 0 is the top row. */
  board: CfCell[][];
  currentSeat: 1 | 2;
  winnerSeat: number | null;
  finished: boolean;
  moveCount: number;
}

export interface ConnectFourMove {
  type: 'drop';
  col: number;
}

export function createInitialState(): ConnectFourState {
  return {
    board: Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () => null)),
    currentSeat: 1,
    winnerSeat: null,
    finished: false,
    moveCount: 0,
  };
}

/** Lowest empty row in a column, or -1 when the column is full. */
export function dropRow(board: readonly CfCell[][], col: number): number {
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r]?.[col] === null) return r;
  }
  return -1;
}

export function isColumnFull(board: readonly CfCell[][], col: number): boolean {
  return dropRow(board, col) === -1;
}

/** Winning seat, or null. Checks every direction from every occupied cell. */
export function winnerOf(board: readonly CfCell[][]): number | null {
  const dirs: readonly [number, number][] = [
    [0, 1], // horizontal
    [1, 0], // vertical
    [1, 1], // diagonal down-right
    [1, -1], // diagonal down-left
  ];

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const v = board[r]?.[c];
      if (v === null || v === undefined) continue;
      for (const [dr, dc] of dirs) {
        let count = 1;
        for (let i = 1; i < CONNECT_LENGTH; i++) {
          const nr = r + dr * i;
          const nc = c + dc * i;
          if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) break;
          if (board[nr]?.[nc] !== v) break;
          count++;
        }
        if (count >= CONNECT_LENGTH) return v;
      }
    }
  }
  return null;
}

export function isBoardFull(board: readonly CfCell[][]): boolean {
  return board[0]?.every((_, col) => isColumnFull(board, col)) ?? false;
}

export function parseMove(move: unknown): ConnectFourMove | null {
  if (!move || typeof move !== 'object') return null;
  const m = move as { type?: unknown; col?: unknown };
  if (m.type !== undefined && m.type !== 'drop') return null;
  const col = Number(m.col);
  if (!Number.isInteger(col) || col < 0 || col >= COLS) return null;
  return { type: 'drop', col };
}

export function validateMove(
  state: ConnectFourState,
  move: ConnectFourMove,
  playerSeat: number,
): { ok: true } | { ok: false; error: string } {
  if (state.finished) return { ok: false, error: 'Match is already finished' };
  if (playerSeat !== state.currentSeat) {
    return { ok: false, error: `Not seat ${playerSeat}'s turn` };
  }
  if (isColumnFull(state.board, move.col)) {
    return { ok: false, error: `Column ${move.col} is full` };
  }
  return { ok: true };
}

export function applyMove(state: ConnectFourState, move: ConnectFourMove): ConnectFourState {
  const row = dropRow(state.board, move.col);
  if (row < 0) return state;

  const board = state.board.map((r) => r.slice());
  board[row]![move.col] = state.currentSeat;

  const winner = winnerOf(board);
  const full = isBoardFull(board);

  return {
    board,
    currentSeat: state.currentSeat === 1 ? 2 : 1,
    winnerSeat: winner,
    finished: winner !== null || full,
    moveCount: state.moveCount + 1,
  };
}

/** Columns that still accept a piece. */
export function availableColumns(board: readonly CfCell[][]): number[] {
  return Array.from({ length: COLS }, (_, c) => c).filter((c) => !isColumnFull(board, c));
}

/** Clock expired — pass turn without dropping (board unchanged). */
export function applyTurnTimeout(state: ConnectFourState, playerSeat: number): ConnectFourState {
  if (state.finished) {
    return state;
  }
  const nextSeat: 1 | 2 = playerSeat === 1 ? 2 : 1;
  return {
    ...state,
    currentSeat: nextSeat,
  };
}
