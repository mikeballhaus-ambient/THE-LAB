import {
  applyMove,
  createInitialState,
  revealNextStreet,
  resolveShowdown,
  toCallAmount,
} from '@/apps/poker-holdem/back-end/rules';
import {
  HOLDEM_BIG_BLIND,
  HOLDEM_MIN_BET,
  HOLDEM_SMALL_BLIND,
} from '@/apps/poker-holdem/shared/holdem-stakes';

describe('poker-holdem rules streets', () => {
  test('opens with blinds in the pot', () => {
    const state = createInitialState(() => 0.5);
    expect(state.pot).toBe(HOLDEM_SMALL_BLIND + HOLDEM_BIG_BLIND);
    expect(state.currentBet).toBe(HOLDEM_BIG_BLIND);
    expect(toCallAmount(state, 1)).toBe(HOLDEM_BIG_BLIND - HOLDEM_SMALL_BLIND);
  });

  test('auto-deals flop after preflop betting completes', () => {
    let state = createInitialState(() => 0.5);
    expect(state.board).toHaveLength(0);

    state = applyMove(state, { type: 'call' }, 1);
    expect(state.board).toHaveLength(0);
    state = applyMove(state, { type: 'check' }, 2);
    expect(state.board).toHaveLength(3);
    expect(state.turnHistory.some((e) => e.summary.includes('Dealt the flop'))).toBe(true);
  });

  test('applyMove appends player actions to turnHistory', () => {
    const state = createInitialState(() => 0.5);
    const next = applyMove(state, { type: 'fold' }, 2);
    expect(next.turnHistory.at(-1)).toEqual({ seat: 2, summary: 'Folded' });
  });

  test('check does not advance the board without completing betting', () => {
    const state = createInitialState(() => 0.5);
    const next = applyMove(state, { type: 'check' }, 1);
    expect(next.board).toHaveLength(0);
  });

  test('bet and call add to pot', () => {
    let state = createInitialState(() => 0.5);
    state = applyMove(state, { type: 'call' }, 1);
    state = applyMove(state, { type: 'check' }, 2);
    const before = state.pot;
    state = applyMove(state, { type: 'bet', amount: HOLDEM_MIN_BET }, 1);
    state = applyMove(state, { type: 'call' }, 2);
    expect(state.pot).toBe(before + HOLDEM_MIN_BET * 2);
  });

  test('fold awards pot to the other seat', () => {
    const state = createInitialState(() => 0.5);
    const next = applyMove(state, { type: 'fold' }, 2);
    expect(next.completed).toBe(true);
    expect(next.foldedSeat).toBe(2);
    expect(next.winnerSeat).toBe(1);
  });

  test('showdown after river', () => {
    let state = createInitialState(() => 0.5);
    while (state.board.length < 5) {
      state = revealNextStreet(state);
    }
    state = resolveShowdown(state);
    expect(state.completed).toBe(true);
  });
});
