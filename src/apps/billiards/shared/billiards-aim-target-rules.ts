import type { BilliardsMatchState } from './billiards-types';
import {
  countGroupRemaining,
  groupForBall,
  groupForSeat,
  lowestLiveBallNumber,
  normalizeBilliardsSeatGroups,
  tableIsOpen,
} from './billiards-rules';

/**
 * True when the aimed first contact would be a rules foul (8-ball / 9-ball competitive).
 * Open 8-ball table: any object ball is fine to contact.
 */
export function isRiskyFirstContactTarget(
  state: BilliardsMatchState,
  shooterSeat: number,
  firstHitNumber: number,
): boolean {
  if (state.rulesProfile === 'free') {
    return false;
  }
  if (state.rulesProfile === 'nine-ball') {
    const lowest = lowestLiveBallNumber(state.balls);
    if (lowest == null) {
      return false;
    }
    return firstHitNumber !== lowest;
  }
  const seatGroups = normalizeBilliardsSeatGroups(state);
  if (tableIsOpen(seatGroups)) {
    return false;
  }
  const shooterGroup = groupForSeat(seatGroups, shooterSeat);
  if (shooterGroup == null) {
    return false;
  }
  if (firstHitNumber === 8) {
    return countGroupRemaining(state.balls, shooterGroup) > 0;
  }
  const hitGroup = groupForBall(firstHitNumber);
  return hitGroup != null && hitGroup !== shooterGroup;
}
