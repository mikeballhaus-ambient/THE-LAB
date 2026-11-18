import { billiardsEightBallAdapter } from '@/apps/billiards/back-end/adapter';
import {
  billiardsWagerStakeForDifficulty,
  resolveBilliardsAiMatchWagerQuarks,
  resolveBilliardsPvpWagerQuarks,
} from '@/apps/billiards/shared/billiards-wager-stakes';
import type { BilliardsMatchState } from '@/apps/billiards/shared/billiards-types';
import { OPEN_BILLIARDS_SEAT_GROUPS } from '@/apps/billiards/shared/billiards-types';

describe('billiards wager stakes', () => {
  test('fixed tier amounts', () => {
    expect(billiardsWagerStakeForDifficulty('easy')).toBe(50);
    expect(billiardsWagerStakeForDifficulty('medium')).toBe(250);
    expect(billiardsWagerStakeForDifficulty('hard')).toBe(500);
    expect(billiardsWagerStakeForDifficulty('boss')).toBe(1000);
  });

  test('resolvePvpWagerQuarks allows tier list only', () => {
    expect(resolveBilliardsPvpWagerQuarks(250)).toBe(250);
    expect(resolveBilliardsPvpWagerQuarks(0)).toBe(0);
    expect(() => resolveBilliardsPvpWagerQuarks(100)).toThrow();
  });

  test('resolveAiMatchWagerQuarks rejects wrong amount for tier', () => {
    expect(() => resolveBilliardsAiMatchWagerQuarks('easy', 250)).toThrow(/50/);
    expect(resolveBilliardsAiMatchWagerQuarks('boss', 1000)).toBe(1000);
    expect(resolveBilliardsAiMatchWagerQuarks('hard', 0)).toBe(0);
    expect(resolveBilliardsAiMatchWagerQuarks('hard', undefined)).toBe(0);
  });

  test('virtualBankSettlements credits human win and debits loss', () => {
    const finishedWin: BilliardsMatchState = {
      phase: 'finished',
      layoutLocked: true,
      rulesProfile: 'eight-ball',
      balls: [],
      ballInHand: false,
      ballInHandSeat: null,
      placementZone: 'table',
      turnHistory: [],
      shotsTaken: 3,
      seatGroups: { ...OPEN_BILLIARDS_SEAT_GROUPS, 1: 'solids', 2: 'stripes' },
      resultMessage: 'You win',
      winnerSeat: 1,
      wagerQuarks: 250,
    };
    const ctx = { matchId: 'm1', player1Id: 9, player2Id: 0 };
    expect(billiardsEightBallAdapter.virtualBankSettlements?.(finishedWin, ctx)).toEqual([
      {
        labUserId: 9,
        delta: 250,
        reasonCode: 'game_pot_win',
        reasonLabel: '8-ball wager won',
        sourceRef: 'm1',
      },
    ]);

    const finishedLoss = { ...finishedWin, winnerSeat: 2 as const };
    expect(billiardsEightBallAdapter.virtualBankSettlements?.(finishedLoss, ctx)).toEqual([
      {
        labUserId: 9,
        delta: -250,
        reasonCode: 'game_pot_loss',
        reasonLabel: '8-ball wager lost',
        sourceRef: 'm1',
      },
    ]);
  });

  test('virtualBankSettlements debits both humans on PvP wager', () => {
    const finished: BilliardsMatchState = {
      phase: 'finished',
      layoutLocked: true,
      rulesProfile: 'eight-ball',
      balls: [],
      ballInHand: false,
      ballInHandSeat: null,
      placementZone: 'table',
      turnHistory: [],
      shotsTaken: 3,
      seatGroups: { ...OPEN_BILLIARDS_SEAT_GROUPS, 1: 'solids', 2: 'stripes' },
      resultMessage: 'P2 wins',
      winnerSeat: 2,
      wagerQuarks: 500,
    };
    const ctx = { matchId: 'm2', player1Id: 9, player2Id: 12 };
    expect(billiardsEightBallAdapter.virtualBankSettlements?.(finished, ctx)).toEqual([
      {
        labUserId: 12,
        delta: 500,
        reasonCode: 'game_pot_win',
        reasonLabel: '8-ball wager won',
        sourceRef: 'm2',
      },
      {
        labUserId: 9,
        delta: -500,
        reasonCode: 'game_pot_loss',
        reasonLabel: '8-ball wager lost',
        sourceRef: 'm2',
      },
    ]);
  });
});
