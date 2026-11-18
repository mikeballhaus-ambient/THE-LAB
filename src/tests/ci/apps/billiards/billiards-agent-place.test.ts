import { gradeAgentPlaceCue } from '@/apps/billiards/back-end/agent';
import type { BilliardsMatchState } from '@/apps/billiards/shared/billiards-types';
import { OPEN_BILLIARDS_SEAT_GROUPS } from '@/apps/billiards/shared/billiards-types';

function placeState(overrides: Partial<BilliardsMatchState> = {}): BilliardsMatchState {
  return {
    phase: 'place_cue',
    layoutLocked: true,
    rulesProfile: 'eight-ball',
    balls: [
      { id: '3', number: 3, x: 500, y: 250, pocketed: false },
      { id: '10', number: 10, x: 520, y: 260, pocketed: false },
    ],
    ballInHand: true,
    ballInHandSeat: 2,
    placementZone: 'table',
    turnHistory: [{ seat: 1, summary: 'Scratch — ball in hand' }],
    shotsTaken: 1,
    seatGroups: { ...OPEN_BILLIARDS_SEAT_GROUPS },
    resultMessage: null,
    winnerSeat: null,
    ...overrides,
  };
}

describe('gradeAgentPlaceCue', () => {
  test('accepts open table placement', () => {
    const move = gradeAgentPlaceCue({ x: 220, y: 200 }, placeState(), 2);
    expect(move).toEqual({ type: 'cue/place', x: 220, y: 200 });
  });

  test('rejects kitchen violation', () => {
    expect(() =>
      gradeAgentPlaceCue({ x: 220, y: 400 }, placeState({ placementZone: 'kitchen' }), 2),
    ).toThrow(/kitchen/i);
  });

  test('rejects wrong seat', () => {
    expect(() => gradeAgentPlaceCue({ x: 220, y: 200 }, placeState(), 1)).toThrow(/another seat/i);
  });
});
