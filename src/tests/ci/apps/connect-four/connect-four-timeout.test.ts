import { describe, expect, test } from '@jest/globals';
import { applyMove, applyTurnTimeout, createInitialState } from '@/apps/connect-four/back-end/rules';

describe('connect-four turn timeout', () => {
  test('applyTurnTimeout passes turn without changing the board', () => {
    const s0 = createInitialState();
    const s1 = applyMove(s0, { type: 'drop', col: 3 });
    expect(s1.currentSeat).toBe(2);
    expect(s1.moveCount).toBe(1);

    const timedOut = applyTurnTimeout(s1, 2);
    expect(timedOut.board).toEqual(s1.board);
    expect(timedOut.moveCount).toBe(1);
    expect(timedOut.currentSeat).toBe(1);
    expect(timedOut.finished).toBe(false);
  });
});
