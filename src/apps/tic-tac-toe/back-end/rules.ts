/**
 * Tic-Tac-Toe rules — pure, framework-free.
 *
 * Board is a flat array of 9 cells, index 0..8 read left-to-right, top-to-bottom.
 * `null` = empty, otherwise the seat number (1 or 2) that claimed it.
 */

export const BOARD_SIZE = 9;

/** All eight winning lines (rows, columns, diagonals). */
export const WIN_LINES: readonly (readonly [number, number, number])[] = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

export type Cell = 1 | 2 | null;

export interface TicTacToeState {
  board: Cell[];
  /** Seat whose turn it is (1 or 2). */
  currentSeat: 1 | 2;
  /** Winning seat, or null while running / drawn. */
  winnerSeat: number | null;
  /** True once the board is full or someone won. */
  finished: boolean;
  /** Number of moves played — used to enforce turn order. */
  moveCount: number;
}

export interface TicTacToeMove {
  type: 'place';
  /** Board index 0..8. */
  index: number;
}

export function createInitialState(config?: { startingSeat?: number }): TicTacToeState {
  const seat: 1 | 2 = config?.startingSeat === 2 ? 2 : 1;
  return {
    board: Array.from({ length: BOARD_SIZE }, () => null),
    currentSeat: seat,
    winnerSeat: null,
    finished: false,
    moveCount: 0,
  };
}

/** The seat that owns a winning line, or null. */
export function winnerOf(board: readonly Cell[]): number | null {
  for (const [a, b, c] of WIN_LINES) {
    const v = board[a];
    if (v !== null && v === board[b] && v === board[c]) return v;
  }
  return null;
}

export function isBoardFull(board: readonly Cell[]): boolean {
  return board.every((c) => c !== null);
}

/** Parse a move payload coming off the wire. */
export function parseMove(move: unknown): TicTacToeMove | null {
  if (!move || typeof move !== 'object') return null;
  const m = move as { type?: unknown; index?: unknown };
  const index = typeof m.index === 'number' ? m.index : Number(m.index);
  if (!Number.isInteger(index) || index < 0 || index >= BOARD_SIZE) return null;
  if (m.type !== undefined && m.type !== 'place') return null;
  return { type: 'place', index };
}

export function validateMove(
  state: TicTacToeState,
  move: TicTacToeMove,
  playerSeat: number,
): { ok: true } | { ok: false; error: string } {
  if (state.finished) return { ok: false, error: 'Match is already finished' };
  if (playerSeat !== state.currentSeat) {
    return { ok: false, error: `Not seat ${playerSeat}'s turn` };
  }
  if (state.board[move.index] !== null) {
    return { ok: false, error: `Cell ${move.index} is already taken` };
  }
  return { ok: true };
}

/** Apply a placement. Caller must have validated first. */
export function applyMove(state: TicTacToeState, move: TicTacToeMove): TicTacToeState {
  const board = state.board.slice();
  board[move.index] = state.currentSeat;

  const winner = winnerOf(board);
  const full = isBoardFull(board);
  const finished = winner !== null || full;

  return {
    board,
    currentSeat: state.currentSeat === 1 ? 2 : 1,
    winnerSeat: winner,
    finished,
    moveCount: state.moveCount + 1,
  };
}

/**
 * Pick a legal move for the agent.
 *
 * Deliberately deterministic-simple: win if possible, block if necessary,
 * otherwise take the first free cell. This is the *agent's* move choice, not a
 * heuristic fallback — the LLM still decides; this only supplies a candidate
 * when asked to enumerate options. See the adapter for how the kit calls it.
 */
export function availableMoves(board: readonly Cell[]): number[] {
  return board.reduce<number[]>((acc, cell, i) => {
    if (cell === null) acc.push(i);
    return acc;
  }, []);
}
