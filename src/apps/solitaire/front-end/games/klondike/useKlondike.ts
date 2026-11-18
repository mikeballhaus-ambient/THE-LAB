import { computed, ref } from 'vue';
import type { KlondikeDragSource, KlondikeDropTarget } from './klondike-dnd';
import { klondikeFoundationIndexForSuit } from './klondike-foundation-layout';

export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Rank = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13;

export interface Card {
  id: string;
  suit: Suit;
  rank: Rank;
  faceUp: boolean;
}

const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];

function buildDeck(): Card[] {
  const cards: Card[] = [];
  let n = 0;
  for (const suit of SUITS) {
    for (let rank = 1; rank <= 13; rank++) {
      cards.push({
        id: `c-${n++}`,
        suit,
        rank: rank as Rank,
        faceUp: false,
      });
    }
  }
  return cards;
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function isRed(suit: Suit): boolean {
  return suit === 'hearts' || suit === 'diamonds';
}

function rankLabel(rank: Rank): string {
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

export function useKlondike() {
  const stock = ref<Card[]>([]);
  const waste = ref<Card[]>([]);
  const foundations = ref<Card[][]>([[], [], [], []]);
  const tableau = ref<Card[][]>([[], [], [], [], [], [], []]);
  const moves = ref(0);

  function deal(): void {
    const deck = shuffle(buildDeck());
    const cols: Card[][] = [[], [], [], [], [], [], []];
    let idx = 0;
    for (let col = 0; col < 7; col++) {
      for (let row = 0; row <= col; row++) {
        const card = deck[idx++];
        cols[col].push({ ...card, faceUp: row === col });
      }
    }
    tableau.value = cols;
    stock.value = deck.slice(idx).map((c) => ({ ...c, faceUp: false }));
    waste.value = [];
    foundations.value = [[], [], [], []];
    moves.value = 0;
    resetTimer();
  }

  function drawStock(): void {
    if (stock.value.length === 0) {
      if (waste.value.length === 0) {
        return;
      }
      stock.value = waste.value.map((c) => ({ ...c, faceUp: false })).reverse();
      waste.value = [];
      moves.value += 1;
      return;
    }
    const card = stock.value.pop();
    if (card) {
      waste.value.push({ ...card, faceUp: true });
      moves.value += 1;
    }
  }

  function foundationIndexForSuit(suit: Suit): number {
    return klondikeFoundationIndexForSuit(suit);
  }

  function canPlaceOnFoundation(card: Card, pile: Card[]): boolean {
    if (!card.faceUp) {
      return false;
    }
    if (pile.length === 0) {
      return card.rank === 1;
    }
    const top = pile[pile.length - 1];
    return card.suit === top.suit && card.rank === top.rank + 1;
  }

  function canPlaceOnTableau(card: Card, destPile: Card[]): boolean {
    if (!card.faceUp) {
      return false;
    }
    if (destPile.length === 0) {
      return card.rank === 13;
    }
    const dest = destPile[destPile.length - 1];
    if (!dest.faceUp) {
      return false;
    }
    return isRed(dest.suit) !== isRed(card.suit) && dest.rank === card.rank + 1;
  }

  function getTableauStack(col: number, fromIndex: number): Card[] {
    const pile = tableau.value[col];
    for (let i = fromIndex; i < pile.length; i++) {
      if (!pile[i].faceUp) {
        return [];
      }
    }
    return pile.slice(fromIndex);
  }

  function flipTableauTop(col: number): void {
    const pile = tableau.value[col];
    const top = pile[pile.length - 1];
    if (top && !top.faceUp) {
      tableau.value[col] = [...pile.slice(0, -1), { ...top, faceUp: true }];
    }
  }

  function removeFromSource(source: KlondikeDragSource): Card[] {
    if (source.kind === 'waste') {
      const top = waste.value[waste.value.length - 1];
      if (!top) {
        return [];
      }
      waste.value = waste.value.slice(0, -1);
      return [top];
    }

    const stack = getTableauStack(source.col, source.fromIndex);
    if (stack.length === 0) {
      return [];
    }

    const pile = tableau.value[source.col];
    tableau.value[source.col] = pile.slice(0, source.fromIndex);
    flipTableauTop(source.col);
    return stack;
  }

  function tryMoveStack(stack: Card[], target: KlondikeDropTarget): boolean {
    if (stack.length === 0) {
      return false;
    }
    const moving = stack[0];

    if (target.kind === 'foundation') {
      if (stack.length !== 1) {
        return false;
      }
      const pile = foundations.value[target.index];
      if (!canPlaceOnFoundation(moving, pile)) {
        return false;
      }
      foundations.value[target.index] = [...pile, moving];
      moves.value += 1;
      return true;
    }

    const dest = tableau.value[target.col];
    if (!canPlaceOnTableau(moving, dest)) {
      return false;
    }
    tableau.value[target.col] = [...dest, ...stack];
    moves.value += 1;
    return true;
  }

  function applyDrop(source: KlondikeDragSource, target: KlondikeDropTarget): boolean {
    if (source.kind === 'tableau' && target.kind === 'tableau' && source.col === target.col) {
      return false;
    }

    const stack = removeFromSource(source);
    if (stack.length === 0) {
      return false;
    }

    if (tryMoveStack(stack, target)) {
      return true;
    }

    if (source.kind === 'waste') {
      waste.value = [...waste.value, ...stack];
    } else {
      const pile = tableau.value[source.col];
      tableau.value[source.col] = [...pile, ...stack];
    }
    return false;
  }

  function autoToFoundation(source: KlondikeDragSource): boolean {
    let card: Card | undefined;
    if (source.kind === 'waste') {
      card = waste.value[waste.value.length - 1];
    } else {
      const pile = tableau.value[source.col];
      if (source.fromIndex !== pile.length - 1) {
        return false;
      }
      card = pile[pile.length - 1];
    }

    if (!card) {
      return false;
    }

    const idx = foundationIndexForSuit(card.suit);
    return applyDrop(source, { kind: 'foundation', index: idx });
  }

  function canDragSource(source: KlondikeDragSource): boolean {
    if (source.kind === 'waste') {
      return Boolean(waste.value[waste.value.length - 1]);
    }
    const pile = tableau.value[source.col];
    return source.fromIndex < pile.length && pile[source.fromIndex]?.faceUp === true;
  }

  const won = computed(() => foundations.value.every((f) => f.length === 13));

  const elapsedAnchor = ref(Date.now());
  const clockTick = ref(0);

  function elapsedMs(): number {
    return Date.now() - elapsedAnchor.value;
  }

  function resetTimer(): void {
    elapsedAnchor.value = Date.now();
    clockTick.value += 1;
  }

  function pokeClock(): void {
    clockTick.value += 1;
  }

  const formattedTime = computed(() => {
    void clockTick.value;
    const sec = Math.floor(elapsedMs() / 1000);
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  });

  deal();

  return {
    stock,
    waste,
    foundations,
    tableau,
    moves,
    won,
    deal,
    drawStock,
    applyDrop,
    autoToFoundation,
    canDragSource,
    getTableauStack,
    foundationIndexForSuit,
    canPlaceOnFoundation,
    elapsedMs,
    resetTimer,
    pokeClock,
    formattedTime,
    isRed,
    rankLabel,
  };
}
