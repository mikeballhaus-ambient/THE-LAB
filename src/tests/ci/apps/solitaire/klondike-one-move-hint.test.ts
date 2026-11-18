import type { Card } from '@/apps/solitaire/front-end/games/klondike/useKlondike';
import { klondikeFoundationIndexForSuit } from '@/apps/solitaire/front-end/games/klondike/klondike-foundation-layout';
import {
  describeKlondikeOneMoveHint,
  findKlondikeOneMove,
  type KlondikeStateSnapshot,
} from '@/apps/solitaire/front-end/games/klondike/klondike-one-move-hint';

function card(
  rank: Card['rank'],
  suit: Card['suit'],
  faceUp = true,
  id = `${rank}-${suit}`,
): Card {
  return { id, rank, suit, faceUp };
}

function emptySnapshot(): KlondikeStateSnapshot {
  return {
    stock: [],
    waste: [],
    foundations: [[], [], [], []],
    tableau: [[], [], [], [], [], [], []],
  };
}

describe('klondikeFoundationIndexForSuit', () => {
  test('matches left-to-right placeholders ♠ ♥ ♦ ♣', () => {
    expect(klondikeFoundationIndexForSuit('spades')).toBe(0);
    expect(klondikeFoundationIndexForSuit('hearts')).toBe(1);
    expect(klondikeFoundationIndexForSuit('diamonds')).toBe(2);
    expect(klondikeFoundationIndexForSuit('clubs')).toBe(3);
  });
});

describe('findKlondikeOneMove', () => {
  test('foundation hint uses the diamonds column (♦), not spades', () => {
    const snapshot: KlondikeStateSnapshot = {
      ...emptySnapshot(),
      waste: [card(1, 'diamonds')],
    };
    const hint = findKlondikeOneMove(snapshot);
    expect(hint).toEqual({
      kind: 'move',
      source: { kind: 'waste' },
      target: { kind: 'foundation', index: 2 },
    });
    expect(describeKlondikeOneMoveHint(hint, snapshot)).toBe(
      'Drag A♦ to the ♦ foundation pile.',
    );
  });

  test('tableau hint names source and destination in copy', () => {
    const snapshot: KlondikeStateSnapshot = {
      ...emptySnapshot(),
      tableau: [
        [],
        [],
        [card(10, 'clubs')],
        [card(8, 'spades')],
        [card(9, 'diamonds')],
        [],
        [],
      ],
    };
    const hint = findKlondikeOneMove(snapshot);
    expect(hint?.kind).toBe('move');
    const line = describeKlondikeOneMoveHint(hint, snapshot);
    expect(line).toMatch(/Drag 8♠ onto 9♦ in column 5/);
  });

  test('prefers a tableau move that flips a hidden card under the source stack', () => {
    const snapshot: KlondikeStateSnapshot = {
      ...emptySnapshot(),
      tableau: [
        [],
        [],
        [card(10, 'clubs')],
        [card(5, 'clubs', false), card(8, 'spades')],
        [card(9, 'diamonds')],
        [],
        [],
      ],
    };
    const hint = findKlondikeOneMove(snapshot);
    expect(hint).toEqual({
      kind: 'move',
      source: { kind: 'tableau', col: 3, fromIndex: 1 },
      target: { kind: 'tableau', col: 4 },
    });
  });
});
