import type { Suit } from './useKlondike';

/** Left-to-right foundation columns — matches suit placeholders in the UI. */
export const KLONDIKE_FOUNDATION_SUIT_ORDER: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs'];

export const KLONDIKE_FOUNDATION_PLACEHOLDERS = ['♠', '♥', '♦', '♣'] as const;

export function klondikeFoundationIndexForSuit(suit: Suit): number {
  const index = KLONDIKE_FOUNDATION_SUIT_ORDER.indexOf(suit);
  if (index < 0) {
    throw new Error(`Unknown suit: ${suit}`);
  }
  return index;
}
