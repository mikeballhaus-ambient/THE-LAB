import type {
  BilliardsAssignedGroup,
  BilliardsBall,
  BilliardsRulesProfile,
  BilliardsSeatGroups,
} from './billiards-types';
import { groupForBall, groupForSeat, tableIsOpen } from './billiards-rules';

export type BilliardsMatchTrayContext = {
  rulesProfile: BilliardsRulesProfile;
  phase: string;
  winnerSeat: number | null;
};

/**
 * The eight rolls in the **shooter’s** tray (by `pocketedBySeat`), not solids/stripes group routing.
 * During roll animation `pocketedBySeat` is not stamped yet — pass `impliedPocketSeat` from the client.
 */
export function eightBallBelongsInShooterTray(
  ball: BilliardsBall,
  traySeat: number,
  ctx: BilliardsMatchTrayContext,
  impliedPocketSeat?: number | null,
): boolean {
  if (ctx.rulesProfile !== 'eight-ball' || ball.number !== 8 || !ball.pocketed) {
    return false;
  }
  const attributedSeat = ball.pocketedBySeat ?? impliedPocketSeat ?? null;
  return attributedSeat === traySeat;
}

export function ballBelongsInEightBallMatchTray(
  ball: BilliardsBall,
  traySeat: number,
  assignedGroup: BilliardsAssignedGroup | null | undefined,
  ctx: BilliardsMatchTrayContext,
  impliedPocketSeat?: number | null,
): boolean {
  if (!ball.pocketed || ball.number <= 0) {
    return false;
  }
  if (ball.number === 8) {
    return eightBallBelongsInShooterTray(ball, traySeat, ctx, impliedPocketSeat);
  }
  if (assignedGroup != null) {
    return groupForBall(ball.number) === assignedGroup;
  }
  return ball.pocketedBySeat === traySeat;
}

/** Object balls in an assigned solids / stripes group (eight-ball), excluding the 8. */
export const BILLIARDS_EIGHT_BALL_GROUP_POCKET_TARGET = 7;

export function countEightBallLegalPocketedForSeat(
  balls: BilliardsBall[],
  seat: number,
  seatGroups: BilliardsSeatGroups,
): number {
  const group = groupForSeat(seatGroups, seat);
  if (!group || tableIsOpen(seatGroups)) {
    return 0;
  }
  /** Group clearance — any pocketed ball of your assignment counts, including opponent mistakes. */
  return balls.filter(
    (ball) =>
      ball.pocketed &&
      ball.number !== 8 &&
      groupForBall(ball.number) === group,
  ).length;
}

export function formatEightBallTrayProgress(
  balls: BilliardsBall[],
  seat: number,
  seatGroups: BilliardsSeatGroups,
): string | null {
  if (tableIsOpen(seatGroups)) {
    return null;
  }
  const group = groupForSeat(seatGroups, seat);
  if (!group) {
    return null;
  }
  const sunk = countEightBallLegalPocketedForSeat(balls, seat, seatGroups);
  return `${sunk}/${BILLIARDS_EIGHT_BALL_GROUP_POCKET_TARGET}`;
}
