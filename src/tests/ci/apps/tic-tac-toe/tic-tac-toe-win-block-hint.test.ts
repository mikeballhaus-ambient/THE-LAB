import { describe, expect, test } from '@jest/globals';
import { computeTicTacToeWinBlockHint } from '@/apps/tic-tac-toe/shared/tic-tac-toe-win-block-hint';
import type { TicTacToeState } from '@/apps/tic-tac-toe/back-end/rules';

describe('computeTicTacToeWinBlockHint', () => {
  test('suggests center on empty board', () => {
    const state: TicTacToeState = {
      board: Array.from({ length: 9 }, () => null),
      currentSeat: 1,
      winnerSeat: null,
      finished: false,
      moveCount: 0,
    };
    const hint = computeTicTacToeWinBlockHint(state);
    expect(hint).toEqual({ index: 4, kind: 'suggest' });
  });

  test('suggests winning cell for seat 1 on bottom row', () => {
    const state: TicTacToeState = {
      board: [1, 1, null, 2, 2, null, null, null, null],
      currentSeat: 1,
      winnerSeat: null,
      finished: false,
      moveCount: 4,
    };
    const hint = computeTicTacToeWinBlockHint(state);
    expect(hint).toEqual({ index: 2, kind: 'win' });
  });
});
