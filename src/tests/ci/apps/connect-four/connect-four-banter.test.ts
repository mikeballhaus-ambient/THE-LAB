import { describe, expect, test } from '@jest/globals';
import {
  connectFourImmediateWinColumns,
  connectFourMoveWasBlock,
} from '@/apps/connect-four/shared/connect-four-banter-utils';
import { applyMove, type ConnectFourState } from '@/apps/connect-four/back-end/rules';
import { detectConnectFourBanterMoment } from '@/shared/game-platform/lab-assistant-banter/detectors';
import type { MatchView } from '@/shared/game-platform/types';

describe('connect-four banter utils', () => {
  test('detects a block when opponent had an immediate win column', () => {
    const board: ConnectFourState['board'] = Array.from({ length: 6 }, () =>
      Array.from({ length: 7 }, () => null),
    );
    board[5]![0] = 2;
    board[5]![1] = 2;
    board[5]![2] = 2;
    board[4]![3] = 1;

    const prev: ConnectFourState = {
      board,
      currentSeat: 1,
      winnerSeat: null,
      finished: false,
      moveCount: 4,
    };
    expect(connectFourImmediateWinColumns(prev.board, 2)).toContain(3);

    const next = applyMove(prev, { type: 'drop', col: 3 });
    expect(connectFourMoveWasBlock(prev, next)).toBe(true);
  });
});

function baseMatch(state: ConnectFourState, overrides: Partial<MatchView>): MatchView {
  return {
    matchId: 'm1',
    gameId: 'connect-four',
    status: 'active',
    opponentKind: 'ai',
    difficulty: 'medium',
    yourSeat: 1,
    currentSeat: state.currentSeat,
    state,
    scores: { 1: 0, 2: 0 },
    turnRemainingMs: 60_000,
    winnerUserId: null,
    player1Id: 10,
    player2Id: 20,
    ...overrides,
  };
}

describe('detectConnectFourBanterMoment', () => {
  test('returns block moment when a threat is stopped', () => {
    const board: ConnectFourState['board'] = Array.from({ length: 6 }, () =>
      Array.from({ length: 7 }, () => null),
    );
    board[5]![0] = 2;
    board[5]![1] = 2;
    board[5]![2] = 2;
    board[4]![3] = 1;

    const prevState: ConnectFourState = {
      board,
      currentSeat: 1,
      winnerSeat: null,
      finished: false,
      moveCount: 4,
    };
    const nextState = applyMove(prevState, { type: 'drop', col: 3 });
    const prev = baseMatch(prevState, { currentSeat: 1 });
    const next = baseMatch(nextState, { currentSeat: 2 });
    expect(detectConnectFourBanterMoment(prev, next)).toEqual({ kind: 'block', moverSeat: 1 });
  });
});
