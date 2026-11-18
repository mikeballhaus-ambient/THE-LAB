import {
  isCueCenterPastHeadString,
  isKitchenAimHeadStringFoul,
  shotRequiresKitchenHeadStringCross,
} from '@/apps/billiards/shared/billiards-kitchen-shot';
import { canPlaceBallAt } from '@/apps/billiards/shared/billiards-layout';
import {
  BALL_RADIUS,
  HEAD_STRING_Y,
  OPEN_BILLIARDS_SEAT_GROUPS,
  TABLE_HEIGHT,
  TABLE_WIDTH,
} from '@/apps/billiards/shared/billiards-types';
import type { BilliardsMatchState } from '@/apps/billiards/shared/billiards-types';

function aimState(overrides: Partial<BilliardsMatchState> = {}): BilliardsMatchState {
  return {
    phase: 'aim',
    layoutLocked: true,
    rulesProfile: 'eight-ball',
    balls: [{ id: 'cue', number: 0, x: 200, y: 80, pocketed: false }],
    ballInHand: false,
    ballInHandSeat: null,
    placementZone: 'table',
    turnHistory: [],
    shotsTaken: 1,
    seatGroups: { ...OPEN_BILLIARDS_SEAT_GROUPS },
    resultMessage: null,
    winnerSeat: null,
    ...overrides,
  };
}

describe('billiards kitchen head-string shot', () => {
  test('past head string when center y exceeds line', () => {
    expect(isCueCenterPastHeadString(HEAD_STRING_Y + 1)).toBe(true);
    expect(isCueCenterPastHeadString(HEAD_STRING_Y - BALL_RADIUS)).toBe(false);
  });

  test('rule applies when placementZone is kitchen', () => {
    expect(shotRequiresKitchenHeadStringCross(aimState({ placementZone: 'kitchen' }))).toBe(true);
  });

  test('rule does not apply when cue sits in kitchen after a legal table-zone shot', () => {
    expect(
      shotRequiresKitchenHeadStringCross(
        aimState({
          placementZone: 'table',
          balls: [{ id: 'cue', number: 0, x: 100, y: HEAD_STRING_Y - BALL_RADIUS, pocketed: false }],
        }),
      ),
    ).toBe(false);
  });

  test('aim foul when first contact in kitchen before crossing head string', () => {
    const state = aimState({
      placementZone: 'kitchen',
      balls: [
        { id: 'cue', number: 0, x: 200, y: 80, pocketed: false },
        { id: '3', number: 3, x: 220, y: 90, pocketed: false },
      ],
    });
    const balls = state.balls;
    expect(isKitchenAimHeadStringFoul(state, { x: 200, y: 80 }, Math.PI / 2 + 2.8, balls)).toBe(true);
  });

  test('aim legal when shot crosses head string before contact', () => {
    const state = aimState({
      placementZone: 'kitchen',
      balls: [
        { id: 'cue', number: 0, x: 200, y: 80, pocketed: false },
        { id: '3', number: 3, x: 500, y: 250, pocketed: false },
      ],
    });
    const angle = Math.atan2(250 - 80, 500 - 200);
    expect(
      isKitchenAimHeadStringFoul(state, { x: 200, y: 80 }, angle, state.balls),
    ).toBe(false);
  });
});

describe('canPlaceBallAt placement zone', () => {
  const balls: BilliardsMatchState['balls'] = [
    { id: '3', number: 3, x: 500, y: 250, pocketed: false },
  ];

  test('kitchen zone rejects a point below the head string', () => {
    expect(canPlaceBallAt(balls, 200, HEAD_STRING_Y + BALL_RADIUS * 2, 'cue', 'kitchen')).toBe(
      false,
    );
  });

  test('missing zone still enforces table bounds — not a free pass', () => {
    expect(canPlaceBallAt(balls, -50, TABLE_HEIGHT + 200, 'cue', undefined as never)).toBe(false);
    expect(canPlaceBallAt(balls, TABLE_WIDTH * 0.25, TABLE_HEIGHT * 0.75, 'cue', undefined as never)).toBe(
      true,
    );
  });

  test('missing zone falls back to table, not kitchen', () => {
    expect(
      canPlaceBallAt(balls, 200, HEAD_STRING_Y + BALL_RADIUS * 2, 'cue', undefined as never),
    ).toBe(true);
  });
});
