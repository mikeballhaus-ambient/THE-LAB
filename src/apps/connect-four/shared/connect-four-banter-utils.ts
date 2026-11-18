import {
  COLS,
  dropRow,
  winnerOf,
  type CfCell,
  type ConnectFourState,
} from '@/apps/connect-four/back-end/rules';

function cloneBoard(board: readonly CfCell[][]): CfCell[][] {
  return board.map((row) => row.slice());
}

/** Columns where dropping now would let `seat` win on that turn. */
export function connectFourImmediateWinColumns(
  board: readonly CfCell[][],
  seat: 1 | 2,
): number[] {
  const cols: number[] = [];
  for (let c = 0; c < COLS; c++) {
    const r = dropRow(board, c);
    if (r < 0) {
      continue;
    }
    const trial = cloneBoard(board);
    trial[r]![c] = seat;
    if (winnerOf(trial) === seat) {
      cols.push(c);
    }
  }
  return cols;
}

function opponentOf(seat: 1 | 2): 1 | 2 {
  return seat === 1 ? 2 : 1;
}

/** Column where the board gained a new piece (last drop). */
export function connectFourLastDropColumn(prev: ConnectFourState, next: ConnectFourState): number | null {
  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r < next.board.length; r++) {
      const before = prev.board[r]?.[c] ?? null;
      const after = next.board[r]?.[c] ?? null;
      if (before === null && after !== null) {
        return c;
      }
    }
  }
  return null;
}

/**
 * True when the last move stopped an opponent immediate win (3-in-a-row threat).
 */
export function connectFourMoveWasBlock(prev: ConnectFourState, next: ConnectFourState): boolean {
  if (next.finished && next.winnerSeat != null) {
    return false;
  }
  const mover: 1 | 2 = prev.currentSeat;
  const opp = opponentOf(mover);
  const prevThreats = connectFourImmediateWinColumns(prev.board, opp);
  if (prevThreats.length === 0) {
    return false;
  }
  const nextThreats = connectFourImmediateWinColumns(next.board, opp);
  const dropCol = connectFourLastDropColumn(prev, next);
  if (dropCol != null && prevThreats.includes(dropCol)) {
    return true;
  }
  return nextThreats.length < prevThreats.length;
}
