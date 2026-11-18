type HoldemFeedMove =
  | { type: 'fold' }
  | { type: 'check' }
  | { type: 'call' }
  | { type: 'bet'; amount: number }
  | { type: 'raise'; amount: number };

/** One-line move text for player-turns feed (UI + rules). */
export function summarizeHoldemMoveForFeed(
  move: HoldemFeedMove,
  toCallAmount: number,
): string {
  if (move.type === 'fold') {
    return 'Folded';
  }
  if (move.type === 'check') {
    return 'Checked';
  }
  if (move.type === 'call') {
    return toCallAmount > 0 ? `Called ${toCallAmount} Quarks` : 'Called';
  }
  if (move.type === 'bet') {
    return `Bet ${move.amount} Quarks`;
  }
  if (move.type === 'raise') {
    return `Raised to ${move.amount} Quarks`;
  }
  return 'Move';
}
