import { gradeAgentMove } from '@/apps/blackjack/back-end/agent';
import { createInitialState, type BlackjackState } from '@/apps/blackjack/back-end/rules';

const aiTableConfig = {
  gameId: 'blackjack',
  opponentKind: 'ai' as const,
  player1Id: 1,
  player2Id: 0,
};

/** Random deals can end immediately (e.g. dealer blackjack); keep agent tests on an open hand. */
function seat2Turn(state: BlackjackState): BlackjackState {
  return {
    ...state,
    completed: false,
    winnerSeat: null,
    activeSeat: 2,
    seatDone: { 1: true, 2: false },
    dealerHoleHidden: true,
  };
}

describe('blackjack agent', () => {
  test('gradeAgentMove accepts legal hit', () => {
    const state = seat2Turn(createInitialState(aiTableConfig));
    expect(gradeAgentMove({ action: 'hit' }, state, 2)).toEqual({ type: 'hit' });
  });

  test('gradeAgentMove rejects illegal split on non-pair', () => {
    const state = seat2Turn(createInitialState(aiTableConfig));
    const hand = state.hands[2];
    if (hand?.length === 2 && hand[0]?.rank === hand[1]?.rank) {
      hand[1] = { ...hand[1], rank: '5' };
    }
    expect(() => gradeAgentMove({ action: 'split' }, state, 2)).toThrow(/not legal/);
  });
});
