import { describe, expect, test } from '@jest/globals';
import { chooseChessSearchMove } from '@/apps/chess/back-end/chess-search';
import { applyChessMove, type ChessPiece } from '@/apps/chess/back-end/rules';
import { chooseTicTacToeSearchMove } from '@/apps/tic-tac-toe/back-end/tic-tac-toe-search';
import type { TicTacToeState } from '@/apps/tic-tac-toe/back-end/rules';
import { chooseConnectFourSearchMove } from '@/apps/connect-four/back-end/connect-four-search';
import type { ConnectFourState } from '@/apps/connect-four/back-end/rules';

describe('game search (minimax)', () => {
  test('chess search finds immediate queen capture on boss depth', () => {
    const pieces: ChessPiece[] = [
      { id: 1, row: 7, col: 4, type: 'king', color: 'white', hasMoved: true },
      { id: 2, row: 4, col: 3, type: 'queen', color: 'white', hasMoved: true },
      { id: 3, row: 0, col: 4, type: 'king', color: 'black', hasMoved: true },
      { id: 4, row: 4, col: 4, type: 'rook', color: 'black', hasMoved: true },
    ];
    const move = chooseChessSearchMove({ pieces, turnHistory: [] }, 2, 'boss');
    expect(move).not.toBeNull();
    expect(move?.from).toEqual({ row: 4, col: 4 });
    expect(move?.to).toEqual({ row: 4, col: 3 });
  });

  test('tic-tac-toe search blocks an immediate win threat', () => {
    const state: TicTacToeState = {
      board: [1, 1, null, 2, 2, null, null, null, null],
      currentSeat: 1,
      winnerSeat: null,
      finished: false,
      moveCount: 4,
    };
    const move = chooseTicTacToeSearchMove(state, 1, 'boss');
    expect(move?.index).toBe(2);
  });

  test('connect-four search takes a winning drop when available', () => {
    const board: ConnectFourState['board'] = Array.from({ length: 6 }, () =>
      Array.from({ length: 7 }, () => null),
    );
    board[5]![3] = 2;
    board[4]![3] = 2;
    board[3]![3] = 2;
    const state: ConnectFourState = {
      board,
      currentSeat: 2,
      winnerSeat: null,
      finished: false,
      moveCount: 3,
    };
    const move = chooseConnectFourSearchMove(state, 2, 'boss');
    expect(move?.col).toBe(3);
  });

  test('chess search prefers recapture over random quiet move at hard depth', () => {
    const pieces: ChessPiece[] = [
      { id: 1, row: 7, col: 4, type: 'king', color: 'white', hasMoved: true },
      { id: 2, row: 4, col: 4, type: 'queen', color: 'white', hasMoved: true },
      { id: 3, row: 0, col: 4, type: 'king', color: 'black', hasMoved: true },
      { id: 4, row: 5, col: 3, type: 'rook', color: 'black', hasMoved: true },
      { id: 5, row: 4, col: 3, type: 'knight', color: 'black', hasMoved: true },
    ];
    const afterWhiteCapture = applyChessMove(pieces, { row: 4, col: 4 }, { row: 4, col: 3 });
    const move = chooseChessSearchMove({ pieces: afterWhiteCapture, turnHistory: [] }, 2, 'hard');
    expect(move?.from).toEqual({ row: 5, col: 3 });
    expect(move?.to).toEqual({ row: 4, col: 3 });
  });
});
