import type { Card, Rank, Suit } from './useKlondike';
import type { KlondikeDragSource, KlondikeDropTarget } from './klondike-dnd';
import {
  KLONDIKE_FOUNDATION_PLACEHOLDERS,
  klondikeFoundationIndexForSuit,
} from './klondike-foundation-layout';

export interface KlondikeStateSnapshot {
  stock: Card[];
  waste: Card[];
  foundations: Card[][];
  tableau: Card[][];
}

export type KlondikeOneMoveHint =
  | { kind: 'stock' }
  | { kind: 'move'; source: KlondikeDragSource; target: KlondikeDropTarget };

function isRed(suit: Suit): boolean {
  return suit === 'hearts' || suit === 'diamonds';
}

function canPlaceOnFoundation(card: Card, pile: Card[]): boolean {
  if (!card.faceUp) {
    return false;
  }
  if (pile.length === 0) {
    return card.rank === 1;
  }
  const top = pile[pile.length - 1]!;
  return card.suit === top.suit && card.rank === top.rank + 1;
}

function canPlaceOnTableau(card: Card, destPile: Card[]): boolean {
  if (!card.faceUp) {
    return false;
  }
  if (destPile.length === 0) {
    return card.rank === 13;
  }
  const dest = destPile[destPile.length - 1]!;
  if (!dest.faceUp) {
    return false;
  }
  return isRed(dest.suit) !== isRed(card.suit) && dest.rank === card.rank + 1;
}

function tryFoundationFromWaste(snapshot: KlondikeStateSnapshot): KlondikeOneMoveHint | null {
  const top = snapshot.waste[snapshot.waste.length - 1];
  if (!top?.faceUp) {
    return null;
  }
  const idx = klondikeFoundationIndexForSuit(top.suit);
  if (canPlaceOnFoundation(top, snapshot.foundations[idx] ?? [])) {
    return { kind: 'move', source: { kind: 'waste' }, target: { kind: 'foundation', index: idx } };
  }
  return null;
}

function tryFoundationFromTableau(snapshot: KlondikeStateSnapshot): KlondikeOneMoveHint | null {
  for (let col = 0; col < snapshot.tableau.length; col += 1) {
    const pile = snapshot.tableau[col] ?? [];
    const top = pile[pile.length - 1];
    if (!top?.faceUp) {
      continue;
    }
    const idx = klondikeFoundationIndexForSuit(top.suit);
    if (canPlaceOnFoundation(top, snapshot.foundations[idx] ?? [])) {
      return {
        kind: 'move',
        source: { kind: 'tableau', col, fromIndex: pile.length - 1 },
        target: { kind: 'foundation', index: idx },
      };
    }
  }
  return null;
}

function revealHiddenBelowScore(snapshot: KlondikeStateSnapshot, source: KlondikeDragSource): number {
  if (source.kind !== 'tableau') {
    return 0;
  }
  const pile = snapshot.tableau[source.col] ?? [];
  const below = pile[source.fromIndex - 1];
  return below !== undefined && !below.faceUp ? 20 : 0;
}

function tableauMoveScore(snapshot: KlondikeStateSnapshot, hint: KlondikeOneMoveHint): number {
  if (hint.kind !== 'move' || hint.target.kind !== 'tableau') {
    return 0;
  }
  let score = 0;
  if (hint.source.kind === 'waste') {
    score += 8;
  }
  score += revealHiddenBelowScore(snapshot, hint.source);
  const dest = snapshot.tableau[hint.target.col] ?? [];
  if (dest.length === 0) {
    score += 4;
  }
  return score;
}

function tryTableauMoves(snapshot: KlondikeStateSnapshot): KlondikeOneMoveHint | null {
  const sources: KlondikeDragSource[] = [];
  if (snapshot.waste.length > 0) {
    sources.push({ kind: 'waste' });
  }
  for (let col = 0; col < snapshot.tableau.length; col += 1) {
    const pile = snapshot.tableau[col] ?? [];
    for (let fromIndex = 0; fromIndex < pile.length; fromIndex += 1) {
      if (pile[fromIndex]?.faceUp) {
        sources.push({ kind: 'tableau', col, fromIndex });
      }
    }
  }

  const candidates: KlondikeOneMoveHint[] = [];
  for (const source of sources) {
    const moving = movingCard(snapshot, source);
    if (!moving) {
      continue;
    }
    for (let col = 0; col < snapshot.tableau.length; col += 1) {
      if (source.kind === 'tableau' && source.col === col) {
        continue;
      }
      const dest = snapshot.tableau[col] ?? [];
      if (canPlaceOnTableau(moving, dest)) {
        candidates.push({ kind: 'move', source, target: { kind: 'tableau', col } });
      }
    }
  }
  if (candidates.length === 0) {
    return null;
  }
  candidates.sort((a, b) => tableauMoveScore(snapshot, b) - tableauMoveScore(snapshot, a));
  return candidates[0] ?? null;
}

function movingCard(snapshot: KlondikeStateSnapshot, source: KlondikeDragSource): Card | undefined {
  if (source.kind === 'waste') {
    return snapshot.waste[snapshot.waste.length - 1];
  }
  const pile = snapshot.tableau[source.col] ?? [];
  return pile[source.fromIndex];
}

/** One legal stock draw, foundation lift, or tableau move — classic solitaire hint. */
export function findKlondikeOneMove(snapshot: KlondikeStateSnapshot): KlondikeOneMoveHint | null {
  const foundation =
    tryFoundationFromWaste(snapshot) ?? tryFoundationFromTableau(snapshot);
  if (foundation) {
    return foundation;
  }
  const tableau = tryTableauMoves(snapshot);
  if (tableau) {
    return tableau;
  }
  if (snapshot.stock.length > 0 || snapshot.waste.length > 0) {
    return { kind: 'stock' };
  }
  return null;
}

export function rankLabel(rank: Rank): string {
  if (rank === 1) {
    return 'A';
  }
  if (rank === 11) {
    return 'J';
  }
  if (rank === 12) {
    return 'Q';
  }
  if (rank === 13) {
    return 'K';
  }
  return String(rank);
}

function suitGlyph(suit: Suit): string {
  switch (suit) {
    case 'hearts':
      return '♥';
    case 'diamonds':
      return '♦';
    case 'clubs':
      return '♣';
    case 'spades':
      return '♠';
    default:
      return '';
  }
}

function cardLabel(card: Card): string {
  return `${rankLabel(card.rank)}${suitGlyph(card.suit)}`;
}

function cardForSource(
  snapshot: KlondikeStateSnapshot,
  source: KlondikeDragSource,
): Card | undefined {
  return movingCard(snapshot, source);
}

/** Player-facing copy for the Quarks hint aside when the overlay is unlocked. */
export function describeKlondikeOneMoveHint(
  hint: KlondikeOneMoveHint | null,
  snapshot: KlondikeStateSnapshot,
): string | null {
  if (!hint) {
    return null;
  }
  if (hint.kind === 'stock') {
    return 'Draw a card from the stock.';
  }
  const card = cardForSource(snapshot, hint.source);
  if (!card) {
    return 'Make the highlighted move.';
  }
  const fromLabel = cardLabel(card);
  if (hint.target.kind === 'foundation') {
    const glyph = KLONDIKE_FOUNDATION_PLACEHOLDERS[hint.target.index] ?? 'foundation';
    return `Drag ${fromLabel} to the ${glyph} foundation pile.`;
  }
  const destCol = hint.target.col + 1;
  const destPile = snapshot.tableau[hint.target.col] ?? [];
  if (destPile.length === 0) {
    return `Drag ${fromLabel} to empty column ${destCol} (Kings only).`;
  }
  const destTop = destPile[destPile.length - 1]!;
  return `Drag ${fromLabel} onto ${cardLabel(destTop)} in column ${destCol}.`;
}
