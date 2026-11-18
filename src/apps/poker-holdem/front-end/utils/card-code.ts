/** Wire format matches server rules: rank + suit letter (e.g. `Ah`, `Td`). */
export type HoldemSuit = 's' | 'h' | 'd' | 'c';

const SUIT_SYMBOL: Record<HoldemSuit, string> = {
  s: '♠',
  h: '♥',
  d: '♦',
  c: '♣',
};

const SUIT_NAME: Record<HoldemSuit, string> = {
  s: 'spades',
  h: 'hearts',
  d: 'diamonds',
  c: 'clubs',
};

const SUIT_LETTERS: HoldemSuit[] = ['s', 'h', 'd', 'c'];

export function parseCardCode(code: string): { rank: string; suit: HoldemSuit } | null {
  if (!code || code.length < 2) {
    return null;
  }
  const suit = code.slice(-1).toLowerCase() as HoldemSuit;
  const rank = code.slice(0, -1);
  if (!SUIT_LETTERS.includes(suit)) {
    return null;
  }
  return { rank, suit };
}

/** Normalise server `Card` objects or wire codes for {@link HoldemPlayingCard}. */
export function cardToWireCode(card: unknown): string | null {
  if (typeof card === 'string') {
    const trimmed = card.trim();
    if (!trimmed) {
      return null;
    }
    if (parseCardCode(trimmed)) {
      return trimmed.slice(0, -1) + trimmed.slice(-1).toLowerCase();
    }
    const lowered = trimmed.slice(0, -1) + trimmed.slice(-1).toLowerCase();
    return parseCardCode(lowered) ? lowered : null;
  }
  if (!card || typeof card !== 'object') {
    return null;
  }
  const o = card as { rank?: unknown; suit?: unknown };
  const rank = o.rank != null ? String(o.rank).trim() : '';
  const suitRaw = o.suit != null ? String(o.suit).trim().toLowerCase() : '';
  if (!rank || !suitRaw) {
    return null;
  }
  const suitMap: Record<string, HoldemSuit> = {
    s: 's',
    h: 'h',
    d: 'd',
    c: 'c',
    spades: 's',
    hearts: 'h',
    diamonds: 'd',
    clubs: 'c',
  };
  const suit = suitMap[suitRaw];
  if (!suit) {
    return null;
  }
  const code = `${rank}${suit}`;
  return parseCardCode(code) ? code : null;
}

export function rankDisplay(rank: string): string {
  if (rank === 'T') {
    return '10';
  }
  return rank;
}

export function suitSymbol(suit: HoldemSuit): string {
  return SUIT_SYMBOL[suit];
}

export function isRedSuit(suit: HoldemSuit): boolean {
  return suit === 'h' || suit === 'd';
}

export function cardAriaLabel(code: string): string {
  const parsed = parseCardCode(code);
  if (!parsed) {
    return code;
  }
  return `${rankDisplay(parsed.rank)} of ${SUIT_NAME[parsed.suit]}`;
}
