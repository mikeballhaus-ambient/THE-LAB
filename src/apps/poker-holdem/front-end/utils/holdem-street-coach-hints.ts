import { formatLabQuarksNumber } from '@/shared/constants/lab-quarks-currency';
import type { HoldemPlayHint } from './holdem-play-hints';

export interface HoldemStreetCoachInput {
  holeCards: { rank: string; suit: string }[];
  boardCards: { rank: string; suit: string }[];
  toCall: number;
  pot: number;
}

const RANK_VALUE: Record<string, number> = {
  '2': 2,
  '3': 3,
  '4': 4,
  '5': 5,
  '6': 6,
  '7': 7,
  '8': 8,
  '9': 9,
  T: 10,
  J: 11,
  Q: 12,
  K: 13,
  A: 14,
};

function rankValue(rank: string): number {
  return RANK_VALUE[rank.toUpperCase()] ?? 0;
}

function coarseHandBand(
  hole: { rank: string; suit: string }[],
  board: { rank: string; suit: string }[],
): { title: string; detail: string } {
  const cards = [...hole, ...board];
  if (cards.length < 2) {
    return { title: 'Hand strength', detail: 'Waiting for cards.' };
  }
  const ranks = cards.map((c) => c.rank.toUpperCase());
  const counts = new Map<string, number>();
  for (const r of ranks) {
    counts.set(r, (counts.get(r) ?? 0) + 1);
  }
  const freq = [...counts.values()].sort((a, b) => b - a);
  if (freq[0]! >= 4) {
    return { title: 'Hand strength — very strong', detail: 'You likely have quads or a near-nuts hand on this board.' };
  }
  if (freq[0] === 3) {
    return { title: 'Hand strength — strong', detail: 'Trips or better is on the table — bet for value when behind is unlikely.' };
  }
  if (freq[0] === 2 && freq[1] === 2) {
    return { title: 'Hand strength — solid', detail: 'Two pair territory — good for value, beware bigger straights or flushes.' };
  }
  if (freq[0] === 2) {
    return { title: 'Hand strength — medium', detail: 'A pair or overpair — ahead of many high-card hands, not invincible.' };
  }
  const high = Math.max(...hole.map((c) => rankValue(c.rank)));
  if (high >= 13) {
    return { title: 'Hand strength — marginal', detail: 'High-card or weak pair potential — only continue if the price is cheap.' };
  }
  return { title: 'Hand strength — weak', detail: 'No made pair yet — folding is reasonable unless you have a strong draw (not computed here).' };
}

function potOddsBand(toCall: number, pot: number): { title: string; detail: string } {
  if (toCall <= 0) {
    return {
      title: 'Pot odds',
      detail: 'No call required — checking is free; only bet if you want to build the pot.',
    };
  }
  const total = pot + toCall;
  const pct = total > 0 ? Math.round((toCall / total) * 100) : 0;
  const need = 100 - pct;
  return {
    title: `Pot odds (~${pct}% to call)`,
    detail: `Calling ${formatLabQuarksNumber(toCall)} wins you about ${formatLabQuarksNumber(pot)} — you need to win roughly ${need}% of the time for a break-even call.`,
  };
}

/** Paid coach overlay — augment free play guide, never recommends a specific sizing. */
export function holdemStreetCoachHints(input: HoldemStreetCoachInput): HoldemPlayHint[] {
  const strength = coarseHandBand(input.holeCards, input.boardCards);
  const odds = potOddsBand(input.toCall, input.pot);
  return [
    { id: 'street-coach-odds', action: 'call', title: odds.title, detail: odds.detail },
    { id: 'street-coach-strength', action: 'check', title: strength.title, detail: strength.detail },
  ];
}
