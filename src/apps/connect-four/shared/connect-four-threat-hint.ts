import {
  applyMove,
  availableColumns,
  COLS,
  winnerOf,
  type ConnectFourState,
} from '../back-end/rules';

export interface ConnectFourThreatHint {
  col: number;
  kind: 'win' | 'block' | 'suggest';
}

function winningColumnsFor(state: ConnectFourState, who: 1 | 2): number[] {
  const hits: number[] = [];
  for (const col of availableColumns(state.board)) {
    const probe = applyMove(state, { type: 'drop', col });
    if (winnerOf(probe.board) === who) {
      hits.push(col);
    }
  }
  return hits;
}

function opponentWinsAfterDrop(state: ConnectFourState, col: number, who: 1 | 2): boolean {
  const after = applyMove(state, { type: 'drop', col });
  const opp = who === 1 ? 2 : 1;
  return winningColumnsFor({ ...after, currentSeat: opp }, opp as 1 | 2).length > 0;
}

/** One ply — avoids giving the opponent an immediate win on the reply. */
function suggestColumn(state: ConnectFourState): ConnectFourThreatHint | null {
  const seat = state.currentSeat;
  const cols = availableColumns(state.board);
  if (cols.length === 0) {
    return null;
  }
  let best: number | null = null;
  let bestScore = Number.NEGATIVE_INFINITY;
  for (const col of cols) {
    let score = 0;
    if (!opponentWinsAfterDrop(state, col, seat)) {
      score += 40;
    }
    score += (COLS - 1 - Math.abs(col - 3)) * 8;
    if (score > bestScore) {
      bestScore = score;
      best = col;
    } else if (score === bestScore && best != null && col < best) {
      best = col;
    }
  }
  if (best == null) {
    return null;
  }
  return { col: best, kind: 'suggest' };
}

/** Single column to win, block, or quiet suggest (one ply). */
export function computeConnectFourThreatHint(state: ConnectFourState): ConnectFourThreatHint | null {
  const seat = state.currentSeat;
  const wins = winningColumnsFor(state, seat);
  if (wins.length > 0) {
    return { col: wins[0]!, kind: 'win' };
  }
  const opp = seat === 1 ? 2 : 1;
  const blocks = winningColumnsFor(state, opp as 1 | 2);
  if (blocks.length > 0) {
    return { col: blocks[0]!, kind: 'block' };
  }
  return suggestColumn(state);
}
