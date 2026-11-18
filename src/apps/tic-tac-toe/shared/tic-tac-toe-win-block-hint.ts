import {
  availableMoves,
  winnerOf,
  type Cell,
  type TicTacToeState,
} from '../back-end/rules';

export interface TicTacToeWinBlockHint {
  index: number;
  kind: 'win' | 'block' | 'suggest';
}

/** Opening / quiet positions — center, then corners, then edges. */
const SUGGEST_PRIORITY = [4, 0, 2, 6, 8, 1, 3, 5, 7] as const;

function winningCellsFor(board: readonly Cell[], who: 1 | 2): number[] {
  const hits: number[] = [];
  for (const i of availableMoves(board)) {
    const probe = [...board];
    probe[i] = who;
    if (winnerOf(probe) === who) {
      hits.push(i);
    }
  }
  return hits;
}

function opponentWinsAfterPlace(board: readonly Cell[], index: number, who: 1 | 2): boolean {
  const probe = [...board];
  probe[index] = who;
  const opp = who === 1 ? 2 : 1;
  return winningCellsFor(probe, opp).length > 0;
}

/** One ply — avoid gifting an immediate opponent win on the reply. */
function suggestCell(state: TicTacToeState): TicTacToeWinBlockHint | null {
  const seat = state.currentSeat;
  const moves = availableMoves(state.board);
  if (moves.length === 0) {
    return null;
  }
  let best: number | null = null;
  let bestScore = Number.NEGATIVE_INFINITY;
  for (const index of moves) {
    let score = 0;
    const priority = SUGGEST_PRIORITY.indexOf(index as (typeof SUGGEST_PRIORITY)[number]);
    if (priority >= 0) {
      score += (SUGGEST_PRIORITY.length - priority) * 10;
    }
    if (!opponentWinsAfterPlace(state.board, index, seat)) {
      score += 40;
    }
    if (score > bestScore) {
      bestScore = score;
      best = index;
    } else if (score === bestScore && best != null && index < best) {
      best = index;
    }
  }
  if (best == null) {
    return null;
  }
  return { index: best, kind: 'suggest' };
}

/** Cell to win, block, or quiet suggest (one ply). */
export function computeTicTacToeWinBlockHint(state: TicTacToeState): TicTacToeWinBlockHint | null {
  const seat = state.currentSeat;
  const wins = winningCellsFor(state.board, seat);
  if (wins.length > 0) {
    return { index: wins[0]!, kind: 'win' };
  }
  const opp = seat === 1 ? 2 : 1;
  const blocks = winningCellsFor(state.board, opp);
  if (blocks.length > 0) {
    return { index: blocks[0]!, kind: 'block' };
  }
  return suggestCell(state);
}
