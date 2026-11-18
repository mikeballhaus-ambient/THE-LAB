import {
  applyMove,
  chooseCompanionMove,
  createInitialState,
  handTotals,
  legalActions,
  shouldCompanionSplit,
  type BlackjackState,
} from '@/apps/blackjack/back-end/rules';

function playable(state: BlackjackState): BlackjackState {
  return {
    ...state,
    completed: false,
    winnerSeat: null,
    activeSeat: 1,
    seatDone: { 1: false, 2: false },
    seatDelta: { 1: 0, 2: 0 },
    dealerHoleHidden: true,
  };
}

describe('blackjack rules', () => {
  test('vs dealer — deals AI tablemate on seat 2', () => {
    const state = createInitialState({
      gameId: 'blackjack',
      opponentKind: 'ai',
      player1Id: 1,
      player2Id: 0,
    });
    expect(state.twoHandTable).toBe(true);
    expect(state.headsUp).toBe(false);
    expect(state.hands[2].length).toBe(2);
    expect(state.committed[2]).toBe(state.bet);
  });

  test('vs dealer — seat 1 then companion stand triggers dealer', () => {
    let state = playable(
      createInitialState({ gameId: 'blackjack', opponentKind: 'ai', player1Id: 1, player2Id: 0 }),
    );
    state = {
      ...state,
      deck: [{ rank: 'T', suit: 's' }],
      dealerHand: [{ rank: '6', suit: 'h' }, { rank: 'T', suit: 'c' }],
      hands: {
        1: [{ rank: '8', suit: 'd' }, { rank: '7', suit: 'c' }],
        2: [{ rank: '9', suit: 'd' }, { rank: '8', suit: 'c' }],
      },
      committed: { 1: 50, 2: 50 },
      bet: 50,
      twoHandTable: true,
    };
    state = {
      ...state,
      totals: { 1: 15, 2: 17 },
      dealerUpTotal: 6,
      dealerTotal: 16,
    };
    state = applyMove(state, { type: 'stand' }, 1);
    expect(state.activeSeat).toBe(2);
    state = applyMove(state, { type: 'stand' }, 2);
    expect(state.completed).toBe(true);
    expect(state.seatDelta[1]).toBe(50);
  });

  test('vs AI — both lose vs dealer halves seat 1 Quark loss', () => {
    let state: BlackjackState = {
      deck: [],
      dealerHand: [{ rank: 'T', suit: 'h' }, { rank: 'T', suit: 'c' }],
      hands: {
        1: [{ rank: '9', suit: 'd' }, { rank: '9', suit: 'c' }],
        2: [{ rank: '9', suit: 's' }, { rank: '8', suit: 'h' }],
      },
      bet: 50,
      committed: { 1: 50, 2: 50 },
      headsUp: false,
      twoHandTable: true,
      activeSeat: 1,
      seatDone: { 1: false, 2: false },
      dealerHoleHidden: true,
      completed: false,
      winnerSeat: null,
      seatDelta: { 1: 0, 2: 0 },
      turnHistory: [],
      totals: { 1: 18, 2: 17 },
      dealerUpTotal: 10,
      dealerTotal: 20,
    };
    state = applyMove(state, { type: 'stand' }, 1);
    state = applyMove(state, { type: 'stand' }, 2);
    expect(state.completed).toBe(true);
    expect(state.seatDelta[1]).toBe(-25);
    expect(state.seatDelta[2]).toBe(-50);
    expect(state.tablemateLossRelief).toBe(true);
  });

  test('heads-up — no tablemate relief when both lose', () => {
    let state: BlackjackState = {
      deck: [],
      dealerHand: [{ rank: 'T', suit: 'h' }, { rank: 'T', suit: 'c' }],
      hands: {
        1: [{ rank: '9', suit: 'd' }, { rank: '9', suit: 'c' }],
        2: [{ rank: '9', suit: 's' }, { rank: '8', suit: 'h' }],
      },
      bet: 50,
      committed: { 1: 50, 2: 50 },
      headsUp: true,
      twoHandTable: true,
      activeSeat: 1,
      seatDone: { 1: false, 2: false },
      dealerHoleHidden: true,
      completed: false,
      winnerSeat: null,
      seatDelta: { 1: 0, 2: 0 },
      turnHistory: [],
      totals: { 1: 18, 2: 17 },
      dealerUpTotal: 10,
      dealerTotal: 20,
    };
    state = applyMove(state, { type: 'stand' }, 1);
    state = applyMove(state, { type: 'stand' }, 2);
    expect(state.seatDelta[1]).toBe(-50);
    expect(state.tablemateLossRelief).toBeFalsy();
  });

  test('pair of aces — split then stand both wins when dealer busts', () => {
    let state = playable(
      createInitialState({ gameId: 'blackjack', opponentKind: 'ai', player1Id: 1, player2Id: 0 }),
    );
    state = {
      ...state,
      deck: [
        { rank: 'T', suit: 's' },
        { rank: '5', suit: 'h' },
        { rank: '6', suit: 'd' },
      ],
      dealerHand: [{ rank: '6', suit: 'h' }, { rank: 'T', suit: 'c' }],
      hands: { 1: [{ rank: 'A', suit: 'd' }, { rank: 'A', suit: 's' }], 2: [{ rank: 'K', suit: 'h' }, { rank: '9', suit: 'c' }] },
      committed: { 1: 50, 2: 50 },
      bet: 50,
      twoHandTable: true,
    };
    state = { ...state, totals: { 1: 12, 2: 19 }, dealerUpTotal: 6, dealerTotal: 16 };
    expect(legalActions(state, 1)).toContain('split');
    state = applyMove(state, { type: 'split' }, 1);
    expect(state.splitHands?.[1]?.length).toBe(2);
    expect(state.committed[1]).toBe(100);
    state = applyMove(state, { type: 'stand' }, 1);
    expect(state.completed).toBe(false);
    expect(state.activeHandIndex).toBe(1);
    state = applyMove(state, { type: 'stand' }, 1);
    expect(state.activeSeat).toBe(2);
    state = applyMove(state, { type: 'stand' }, 2);
    expect(state.completed).toBe(true);
    expect(state.seatDelta[1]).toBe(100);
  });

  test('face cards count as ten — A+Q is 21 and companion stands', () => {
    expect(handTotals([{ rank: 'A', suit: 's' }, { rank: 'Q', suit: 'd' }]).total).toBe(21);
    const state: BlackjackState = {
      deck: [],
      dealerHand: [{ rank: '6', suit: 'h' }, { rank: 'T', suit: 'c' }],
      hands: {
        1: [{ rank: '8', suit: 'd' }, { rank: '7', suit: 'c' }],
        2: [{ rank: 'A', suit: 's' }, { rank: 'Q', suit: 'd' }],
      },
      bet: 50,
      committed: { 1: 50, 2: 50 },
      headsUp: false,
      twoHandTable: true,
      activeSeat: 2,
      seatDone: { 1: true, 2: false },
      dealerHoleHidden: true,
      completed: false,
      winnerSeat: null,
      seatDelta: { 1: 0, 2: 0 },
      turnHistory: [],
      totals: { 1: 15, 2: 21 },
      dealerUpTotal: 6,
      dealerTotal: 16,
    };
    expect(chooseCompanionMove(state, 2)).toEqual({ type: 'stand' });
  });

  test('split — one win and one loss vs dealer nets zero Quarks', () => {
    let state = playable(
      createInitialState({ gameId: 'blackjack', opponentKind: 'ai', player1Id: 1, player2Id: 0 }),
    );
    state = {
      ...state,
      deck: [{ rank: 'T', suit: 's' }, { rank: '4', suit: 'h' }],
      dealerHand: [{ rank: '8', suit: 'h' }, { rank: 'T', suit: 'c' }],
      hands: {
        1: [{ rank: '9', suit: 'd' }, { rank: '9', suit: 'c' }],
        2: [{ rank: 'A', suit: 's' }, { rank: 'Q', suit: 'd' }],
      },
      committed: { 1: 50, 2: 50 },
      bet: 50,
      twoHandTable: true,
    };
    state = applyMove(state, { type: 'split' }, 1);
    state = applyMove(state, { type: 'stand' }, 1);
    state = applyMove(state, { type: 'stand' }, 1);
    expect(state.activeSeat).toBe(2);
    state = applyMove(state, { type: 'stand' }, 2);
    expect(state.completed).toBe(true);
    expect(state.seatDelta[1]).toBe(0);
    expect(state.winnerSeat).toBeNull();
  });

  test('chooseCompanionMove — seat 2 splits 8,8 vs dealer 6', () => {
    const state: BlackjackState = {
      deck: [{ rank: 'T', suit: 's' }, { rank: '5', suit: 'h' }],
      dealerHand: [{ rank: '6', suit: 'h' }, { rank: 'T', suit: 'c' }],
      hands: {
        1: [{ rank: 'K', suit: 'h' }, { rank: '9', suit: 'c' }],
        2: [{ rank: '8', suit: 'd' }, { rank: '8', suit: 's' }],
      },
      bet: 50,
      committed: { 1: 50, 2: 50 },
      headsUp: false,
      twoHandTable: true,
      activeSeat: 2,
      seatDone: { 1: true, 2: false },
      dealerHoleHidden: true,
      completed: false,
      winnerSeat: null,
      seatDelta: { 1: 0, 2: 0 },
      turnHistory: [],
      totals: { 1: 19, 2: 16 },
      dealerUpTotal: 6,
      dealerTotal: 16,
    };
    expect(shouldCompanionSplit('8', 6)).toBe(true);
    expect(chooseCompanionMove(state, 2)).toEqual({ type: 'split' });
  });

  test('AI tablemate — split 8,8 then finish both stacks', () => {
    let state = playable(
      createInitialState({ gameId: 'blackjack', opponentKind: 'ai', player1Id: 1, player2Id: 0 }),
    );
    state = {
      ...state,
      deck: [
        { rank: 'T', suit: 's' },
        { rank: 'T', suit: 'h' },
        { rank: '5', suit: 'd' },
        { rank: '6', suit: 'c' },
      ],
      dealerHand: [{ rank: '6', suit: 'h' }, { rank: 'T', suit: 'c' }],
      hands: {
        1: [{ rank: 'K', suit: 'h' }, { rank: '9', suit: 'c' }],
        2: [{ rank: '8', suit: 'd' }, { rank: '8', suit: 's' }],
      },
      committed: { 1: 50, 2: 50 },
      bet: 50,
      twoHandTable: true,
      activeSeat: 2,
      seatDone: { 1: true, 2: false },
      totals: { 1: 19, 2: 16 },
      dealerUpTotal: 6,
      dealerTotal: 16,
    };
    state = applyMove(state, { type: 'split' }, 2);
    expect(state.splitHands?.[2]?.length).toBe(2);
    expect(state.committed[2]).toBe(100);
    state = applyMove(state, { type: 'stand' }, 2);
    state = applyMove(state, { type: 'stand' }, 2);
    expect(state.completed).toBe(true);
    expect(state.seatDelta[2]).toBe(100);
  });

  test('heads-up — seat 1 then seat 2 before dealer', () => {
    let state = playable(
      createInitialState({
        gameId: 'blackjack',
        opponentKind: 'human',
        player1Id: 1,
        player2Id: 2,
      }),
    );
    state = {
      ...state,
      headsUp: true,
      twoHandTable: true,
      hands: {
        1: [{ rank: '8', suit: 'h' }, { rank: '7', suit: 'd' }],
        2: [{ rank: '9', suit: 'c' }, { rank: '7', suit: 's' }],
      },
      dealerHand: [{ rank: '6', suit: 'h' }, { rank: '9', suit: 'c' }],
      deck: [{ rank: 'T', suit: 's' }],
      committed: { 1: 50, 2: 50 },
      bet: 50,
    };
    expect(state.activeSeat).toBe(1);
    state = applyMove(state, { type: 'stand' }, 1);
    expect(state.completed).toBe(false);
    expect(state.activeSeat).toBe(2);
    state = applyMove(state, { type: 'stand' }, 2);
    expect(state.completed).toBe(true);
    expect(state.dealerHoleHidden).toBe(false);
  });
});
