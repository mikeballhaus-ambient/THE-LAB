import {
  BILLIARDS_EIGHT_BALL_GROUP_POCKET_TARGET,
  ballBelongsInEightBallMatchTray,
  countEightBallLegalPocketedForSeat,
  eightBallBelongsInShooterTray,
  formatEightBallTrayProgress,
} from '@/apps/billiards/front-end/utils/billiards-match-tray-progress';
import type { BilliardsBall } from '@/apps/billiards/shared/billiards-types';

function ball(
  partial: Pick<BilliardsBall, 'id' | 'number'> &
    Partial<Pick<BilliardsBall, 'pocketed' | 'pocketedBySeat'>>,
): BilliardsBall {
  return {
    id: partial.id,
    number: partial.number,
    x: 0,
    y: 0,
    pocketed: partial.pocketed ?? false,
    pocketedBySeat: partial.pocketedBySeat,
  };
}

describe('billiards match tray progress', () => {
  test('counts assigned-group balls off the table for a seat', () => {
    const balls = [
      ball({ id: '3', number: 3, pocketed: true, pocketedBySeat: 1 }),
      ball({ id: '11', number: 11, pocketed: true, pocketedBySeat: 1 }),
      ball({ id: '5', number: 5, pocketed: true, pocketedBySeat: 2 }),
    ];
    const seatGroups = { 1: 'solids' as const, 2: 'stripes' as const };
    expect(countEightBallLegalPocketedForSeat(balls, 1, seatGroups)).toBe(2);
    expect(formatEightBallTrayProgress(balls, 1, seatGroups)).toBe(
      `2/${BILLIARDS_EIGHT_BALL_GROUP_POCKET_TARGET}`,
    );
    expect(countEightBallLegalPocketedForSeat(balls, 2, seatGroups)).toBe(1);
  });

  test('foul eight rolls into shooter tray only', () => {
    const eight = ball({ id: '8', number: 8, pocketed: true, pocketedBySeat: 2 });
    const ctx = { rulesProfile: 'eight-ball' as const, phase: 'place_cue', winnerSeat: null };
    expect(eightBallBelongsInShooterTray(eight, 2, ctx)).toBe(true);
    expect(eightBallBelongsInShooterTray(eight, 1, ctx)).toBe(false);
    expect(
      ballBelongsInEightBallMatchTray(eight, 2, 'stripes', ctx),
    ).toBe(true);
    expect(
      ballBelongsInEightBallMatchTray(eight, 2, 'solids', ctx),
    ).toBe(true);
  });

  test('legal winning eight rolls into winner tray', () => {
    const eight = ball({ id: '8', number: 8, pocketed: true, pocketedBySeat: 1 });
    const ctx = { rulesProfile: 'eight-ball' as const, phase: 'finished', winnerSeat: 1 };
    expect(eightBallBelongsInShooterTray(eight, 1, ctx)).toBe(true);
    expect(eightBallBelongsInShooterTray(eight, 2, ctx)).toBe(false);
  });

  test('pocketed eight during roll animation uses implied shooter seat', () => {
    const eight = ball({ id: '8', number: 8, pocketed: true });
    const ctx = { rulesProfile: 'eight-ball' as const, phase: 'rolling', winnerSeat: null };
    expect(eightBallBelongsInShooterTray(eight, 1, ctx, 1)).toBe(true);
    expect(eightBallBelongsInShooterTray(eight, 2, ctx, 1)).toBe(false);
  });

  test('returns null progress while table is open', () => {
    const balls = [ball({ id: '2', number: 2, pocketed: true, pocketedBySeat: 1 })];
    const seatGroups = { 1: null, 2: null };
    expect(formatEightBallTrayProgress(balls, 1, seatGroups)).toBeNull();
  });
});
