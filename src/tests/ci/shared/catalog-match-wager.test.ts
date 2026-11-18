import { checkersAdapter } from '@/apps/checkers/back-end/adapter';
import {
  catalogWagerStakeForDifficulty,
  catalogHeadToHeadWagerSettlementLines,
  resolveCatalogAiMatchWagerQuarks,
  resolveCatalogPvpWagerQuarks,
} from '@/shared/game-platform/catalog-match-wager';

describe('catalog match wager', () => {
  test('fixed tier amounts', () => {
    expect(catalogWagerStakeForDifficulty('easy')).toBe(50);
    expect(catalogWagerStakeForDifficulty('medium')).toBe(250);
    expect(catalogWagerStakeForDifficulty('hard')).toBe(500);
    expect(catalogWagerStakeForDifficulty('boss')).toBe(1000);
  });

  test('resolveCatalogPvpWagerQuarks allows tier list only', () => {
    expect(resolveCatalogPvpWagerQuarks(250)).toBe(250);
    expect(resolveCatalogPvpWagerQuarks(0)).toBe(0);
    expect(() => resolveCatalogPvpWagerQuarks(100)).toThrow();
  });

  test('resolveCatalogAiMatchWagerQuarks rejects wrong amount for tier', () => {
    expect(() => resolveCatalogAiMatchWagerQuarks('easy', 250)).toThrow(/50/);
    expect(resolveCatalogAiMatchWagerQuarks('boss', 1000)).toBe(1000);
    expect(resolveCatalogAiMatchWagerQuarks('hard', 0)).toBe(0);
    expect(resolveCatalogAiMatchWagerQuarks('hard', undefined)).toBe(0);
  });

  test('catalogHeadToHeadWagerSettlementLines credits human win and debits loss', () => {
    const finishedWin = {
      finished: true,
      winnerSeat: 1 as const,
      wagerQuarks: 250,
      pieces: [],
    };
    const ctx = { matchId: 'm1', player1Id: 9, player2Id: 0 };
    expect(
      catalogHeadToHeadWagerSettlementLines(
        finishedWin,
        ctx,
        'Checkers',
        () => checkersAdapter.isFinished(finishedWin),
        () => checkersAdapter.winnerSeat(finishedWin),
      ),
    ).toEqual([
      {
        labUserId: 9,
        delta: 250,
        reasonCode: 'game_pot_win',
        reasonLabel: 'Checkers wager won',
        sourceRef: 'm1',
      },
    ]);

    const finishedLoss = { ...finishedWin, winnerSeat: 2 as const };
    expect(
      catalogHeadToHeadWagerSettlementLines(
        finishedLoss,
        ctx,
        'Checkers',
        () => checkersAdapter.isFinished(finishedLoss),
        () => checkersAdapter.winnerSeat(finishedLoss),
      ),
    ).toEqual([
      {
        labUserId: 9,
        delta: -250,
        reasonCode: 'game_pot_loss',
        reasonLabel: 'Checkers wager lost',
        sourceRef: 'm1',
      },
    ]);
  });

  test('catalogHeadToHeadWagerSettlementLines debits both humans on PvP wager', () => {
    const finished = {
      finished: true,
      winnerSeat: 2 as const,
      wagerQuarks: 500,
      pieces: [],
    };
    const ctx = { matchId: 'm2', player1Id: 9, player2Id: 12 };
    expect(
      catalogHeadToHeadWagerSettlementLines(
        finished,
        ctx,
        'Checkers',
        () => checkersAdapter.isFinished(finished),
        () => checkersAdapter.winnerSeat(finished),
      ),
    ).toEqual([
      {
        labUserId: 12,
        delta: 500,
        reasonCode: 'game_pot_win',
        reasonLabel: 'Checkers wager won',
        sourceRef: 'm2',
      },
      {
        labUserId: 9,
        delta: -500,
        reasonCode: 'game_pot_loss',
        reasonLabel: 'Checkers wager lost',
        sourceRef: 'm2',
      },
    ]);
  });
});
