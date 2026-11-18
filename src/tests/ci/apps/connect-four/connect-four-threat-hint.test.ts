import { describe, expect, test } from '@jest/globals';
import { computeConnectFourThreatHint } from '@/apps/connect-four/shared/connect-four-threat-hint';
import { createInitialState, type ConnectFourState } from '@/apps/connect-four/back-end/rules';

describe('computeConnectFourThreatHint', () => {
  test('opening suggests a center column', () => {
    const state = createInitialState();
    const hint = computeConnectFourThreatHint(state);
    expect(hint).not.toBeNull();
    expect(hint!.kind).toBe('suggest');
    expect(hint!.col).toBe(3);
  });

  test('detects a winning drop column', () => {
    const board: ConnectFourState['board'] = createInitialState().board.map((row) => [...row]);
    board[5]![0] = 1;
    board[5]![1] = 1;
    board[5]![2] = 1;
    const state: ConnectFourState = {
      board,
      currentSeat: 1,
      winnerSeat: null,
      finished: false,
      moveCount: 3,
    };
    const hint = computeConnectFourThreatHint(state);
    expect(hint?.kind).toBe('win');
    expect(hint?.col).toBe(3);
  });
});
