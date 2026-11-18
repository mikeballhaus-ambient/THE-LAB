/** Blinds and betting limits (Quarks). */
export const HOLDEM_SMALL_BLIND = 25;
export const HOLDEM_BIG_BLIND = 50;
export const HOLDEM_MIN_BET = 50;
export const HOLDEM_MIN_RAISE = 25;

/** @deprecated Use pot + {@link HOLDEM_BIG_BLIND} semantics; kept for migration references. */
export const HOLDEM_HAND_STAKE = HOLDEM_BIG_BLIND;
