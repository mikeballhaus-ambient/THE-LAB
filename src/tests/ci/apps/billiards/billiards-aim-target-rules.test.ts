import { isRiskyFirstContactTarget } from '@/apps/billiards/shared/billiards-aim-target-rules';
import type { BilliardsMatchState } from '@/apps/billiards/shared/billiards-types';
import { OPEN_BILLIARDS_SEAT_GROUPS } from '@/apps/billiards/shared/billiards-types';

function state(overrides: Partial<BilliardsMatchState> = {}): BilliardsMatchState {
  return {
    phase: 'aim',
    layoutLocked: true,
    rulesProfile: 'eight-ball',
    balls: [
      { id: 'cue', number: 0, x: 200, y: 250, pocketed: false },
      { id: '3', number: 3, x: 500, y: 250, pocketed: false },
      { id: '11', number: 11, x: 520, y: 260, pocketed: false },
    ],
    ballInHand: false,
    ballInHandSeat: null,
    placementZone: 'table',
    turnHistory: [],
    shotsTaken: 1,
    seatGroups: { 1: 'stripes', 2: 'solids' },
    resultMessage: null,
    winnerSeat: null,
    ...overrides,
  };
}

describe('isRiskyFirstContactTarget', () => {
  test('open table: any contact is allowed', () => {
    const s = state({ seatGroups: { ...OPEN_BILLIARDS_SEAT_GROUPS } });
    expect(isRiskyFirstContactTarget(s, 1, 3)).toBe(false);
  });

  test('closed table: opponent group is risky', () => {
    expect(isRiskyFirstContactTarget(state(), 1, 3)).toBe(true);
    expect(isRiskyFirstContactTarget(state(), 1, 11)).toBe(false);
  });

  test('nine-ball: not lowest ball is risky', () => {
    const s = state({
      rulesProfile: 'nine-ball',
      seatGroups: { ...OPEN_BILLIARDS_SEAT_GROUPS },
      balls: [
        { id: 'cue', number: 0, x: 200, y: 250, pocketed: false },
        { id: '1', number: 1, x: 500, y: 250, pocketed: false },
        { id: '2', number: 2, x: 520, y: 260, pocketed: false },
      ],
    });
    expect(isRiskyFirstContactTarget(s, 1, 2)).toBe(true);
    expect(isRiskyFirstContactTarget(s, 1, 1)).toBe(false);
  });
});
