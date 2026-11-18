/**
 * Texas Hold'em (heads-up, Quarks) — pure rules.
 *
 * Blinds post at hand start; betting rounds on each street; the house deals
 * community cards when a betting round completes.
 */

import {
  HOLDEM_BIG_BLIND,
  HOLDEM_MIN_BET,
  HOLDEM_MIN_RAISE,
  HOLDEM_SMALL_BLIND,
} from '../shared/holdem-stakes';
import { summarizeHoldemMoveForFeed } from '../shared/holdem-move-summary';
import { canDealNextStreetBoard, nextStreetName } from '../shared/poker-street';

export const SUITS = ['s', 'h', 'd', 'c'] as const;
export const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'] as const;

export type Suit = (typeof SUITS)[number];
export type Rank = (typeof RANKS)[number];

export interface Card {
  rank: Rank;
  suit: Suit;
}

export interface TurnHistoryEntry {
  seat: number;
  summary: string;
}

export interface PokerState {
  deck: Card[];
  holes: Record<1 | 2, Card[]>;
  board: Card[];
  /** Total Quarks in the pot this hand. */
  pot: number;
  /** Total Quarks each seat has put in this hand (for ledger settlement). */
  committed: Record<1 | 2, number>;
  /** Quarks each seat has put in during the current betting round. */
  streetCommitted: Record<1 | 2, number>;
  /** Target street commitment (big blind level or last raise). */
  currentBet: number;
  actedThisStreet: Record<1 | 2, boolean>;
  completed: boolean;
  winnerSeat: number | null;
  foldedSeat: number | null;
  turnHistory: TurnHistoryEntry[];
}

const MAX_TURN_HISTORY = 100;

function appendHistory(state: PokerState, seat: number, summary: string): PokerState {
  const prior = state.turnHistory ?? [];
  return {
    ...state,
    turnHistory: [...prior, { seat, summary }].slice(-MAX_TURN_HISTORY),
  };
}

export function summarizeMoveForHistory(move: PokerMove, state: PokerState, seat: 1 | 2): string {
  return summarizeHoldemMoveForFeed(move, toCallAmount(state, seat));
}

function recordDealerAdvance(before: PokerState, after: PokerState): PokerState {
  if (after.board.length > before.board.length) {
    const street = nextStreetName(before.board.length);
    return appendHistory(
      after,
      0,
      street ? `Dealt the ${street}` : 'Dealt community cards',
    );
  }
  if (!before.completed && after.completed && after.foldedSeat == null && after.board.length >= 5) {
    return appendHistory(after, 0, 'Showdown');
  }
  return after;
}

function finishPlayerMove(
  before: PokerState,
  move: PokerMove,
  seat: 1 | 2,
  after: PokerState,
): PokerState {
  let next = appendHistory(after, seat, summarizeMoveForHistory(move, before, seat));
  if (next.completed && next.foldedSeat != null) {
    return next;
  }
  const preAdvance = next;
  next = applyDealerAdvance(next);
  return recordDealerAdvance(preAdvance, next);
}

export type PokerMove =
  | { type: 'fold' }
  | { type: 'check' }
  | { type: 'call' }
  | { type: 'bet'; amount: number }
  | { type: 'raise'; amount: number };

const RANK_VALUE: Record<Rank, number> = RANKS.reduce(
  (acc, r, i) => ({ ...acc, [r]: i + 2 }),
  {} as Record<Rank, number>,
);

const EMPTY_STREET = (): Record<1 | 2, number> => ({ 1: 0, 2: 0 });
const EMPTY_ACTED = (): Record<1 | 2, boolean> => ({ 1: false, 2: false });

export function createDeck(random: () => number = Math.random): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) deck.push({ rank, suit });
  }
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [deck[i], deck[j]] = [deck[j] as Card, deck[i] as Card];
  }
  return deck;
}

export function createInitialState(random: () => number = Math.random): PokerState {
  const deck = createDeck(random);
  const holes: Record<1 | 2, Card[]> = {
    1: [deck.pop() as Card, deck.pop() as Card],
    2: [deck.pop() as Card, deck.pop() as Card],
  };
  const sb = HOLDEM_SMALL_BLIND;
  const bb = HOLDEM_BIG_BLIND;
  return {
    deck,
    holes,
    board: [],
    pot: sb + bb,
    committed: { 1: sb, 2: bb },
    streetCommitted: { 1: sb, 2: bb },
    currentBet: bb,
    actedThisStreet: { 1: false, 2: false },
    completed: false,
    winnerSeat: null,
    foldedSeat: null,
    turnHistory: [
      {
        seat: 0,
        summary: `Blinds posted (${sb}/${bb} Quarks)`,
      },
    ],
  };
}

export function toCallAmount(state: PokerState, seat: 1 | 2): number {
  return Math.max(0, state.currentBet - state.streetCommitted[seat]);
}

export function isBettingRoundComplete(state: PokerState): boolean {
  if (state.completed || state.foldedSeat != null) {
    return true;
  }
  return (
    state.actedThisStreet[1] &&
    state.actedThisStreet[2] &&
    state.streetCommitted[1] === state.streetCommitted[2]
  );
}

export function canDealNextStreet(state: PokerState): boolean {
  return (
    isBettingRoundComplete(state) &&
    canDealNextStreetBoard(state.board.length, state.completed)
  );
}

/** After a betting round closes, the house deals the next street or runs showdown. */
export function applyDealerAdvance(state: PokerState): PokerState {
  if (state.completed || state.foldedSeat != null) {
    return state;
  }
  if (!isBettingRoundComplete(state)) {
    return state;
  }
  if (state.board.length >= 5) {
    return resolveShowdown(state);
  }
  return revealNextStreet(state);
}

export { nextStreetName } from '../shared/poker-street';

export function revealNextStreet(state: PokerState): PokerState {
  const deck = state.deck.slice();
  const board = state.board.slice();
  if (board.length >= 5 || deck.length === 0) {
    return state;
  }
  const toDeal = board.length === 0 ? 3 : 1;
  for (let i = 0; i < toDeal && board.length < 5 && deck.length > 0; i++) {
    board.push(deck.pop() as Card);
  }
  return {
    ...state,
    deck,
    board,
    streetCommitted: EMPTY_STREET(),
    currentBet: 0,
    actedThisStreet: EMPTY_ACTED(),
  };
}

export function revealBoard(state: PokerState): PokerState {
  let next = state;
  while (!next.completed && next.board.length < 5) {
    next = revealNextStreet(next);
  }
  if (!next.completed && next.board.length >= 5) {
    next = resolveShowdown(next);
  }
  return next;
}

export function parseMove(move: unknown): PokerMove | null {
  if (!move || typeof move !== 'object') return null;
  const m = move as { type?: unknown; amount?: unknown };
  if (m.type === 'fold' || m.type === 'check' || m.type === 'call') {
    return { type: m.type };
  }
  if (m.type === 'bet' || m.type === 'raise') {
    const amount = typeof m.amount === 'number' ? Math.trunc(m.amount) : Number.NaN;
    if (!Number.isFinite(amount) || amount <= 0) {
      return null;
    }
    return { type: m.type, amount };
  }
  return null;
}

function commitQuarks(state: PokerState, seat: 1 | 2, extra: number): PokerState {
  if (extra <= 0) {
    return state;
  }
  return {
    ...state,
    pot: state.pot + extra,
    committed: { ...state.committed, [seat]: state.committed[seat] + extra },
    streetCommitted: { ...state.streetCommitted, [seat]: state.streetCommitted[seat] + extra },
  };
}

export function legalActionsFor(state: PokerState, seat: 1 | 2): PokerMove['type'][] {
  if (state.completed) {
    return [];
  }
  const actions: PokerMove['type'][] = ['fold'];
  const toCall = toCallAmount(state, seat);
  if (toCall === 0) {
    actions.push('check');
  } else {
    actions.push('call');
  }
  if (state.currentBet === 0) {
    actions.push('bet');
  } else {
    actions.push('raise');
  }
  return actions;
}

export function validateMove(
  state: PokerState,
  move: PokerMove,
  playerSeat: number,
): { ok: true } | { ok: false; error: string } {
  if (state.completed) return { ok: false, error: 'Hand is already complete' };
  const seat = playerSeat as 1 | 2;
  const legal = legalActionsFor(state, seat);
  if (!legal.includes(move.type)) {
    return { ok: false, error: `${move.type} is not legal this turn` };
  }
  const toCall = toCallAmount(state, seat);
  if (move.type === 'check' && toCall > 0) {
    return { ok: false, error: 'You must call or raise' };
  }
  if (move.type === 'call' && toCall === 0) {
    return { ok: false, error: 'Nothing to call' };
  }
  if (move.type === 'bet') {
    if (state.currentBet > 0) {
      return { ok: false, error: 'Use raise when facing a bet' };
    }
    if (move.amount < HOLDEM_MIN_BET) {
      return { ok: false, error: `Minimum bet is ${HOLDEM_MIN_BET} Quarks` };
    }
  }
  if (move.type === 'raise') {
    if (move.amount <= state.currentBet) {
      return { ok: false, error: 'Raise must exceed the current bet' };
    }
    if (move.amount < state.currentBet + HOLDEM_MIN_RAISE) {
      return { ok: false, error: `Minimum raise is ${HOLDEM_MIN_RAISE} Quarks above the current bet` };
    }
  }
  return { ok: true };
}

export function applyMove(state: PokerState, move: PokerMove, playerSeat: number): PokerState {
  const seat = playerSeat as 1 | 2;

  if (move.type === 'fold') {
    const winner = seat === 1 ? 2 : 1;
    return finishPlayerMove(state, move, seat, {
      ...state,
      completed: true,
      foldedSeat: seat,
      winnerSeat: winner,
    });
  }

  let next = { ...state, actedThisStreet: { ...state.actedThisStreet, [seat]: true } };

  if (move.type === 'check') {
    return finishPlayerMove(state, move, seat, next);
  }

  if (move.type === 'call') {
    const toCall = toCallAmount(state, seat);
    return finishPlayerMove(state, move, seat, commitQuarks(next, seat, toCall));
  }

  if (move.type === 'bet') {
    next = commitQuarks(next, seat, move.amount);
    next = { ...next, currentBet: next.streetCommitted[seat] };
    return finishPlayerMove(state, move, seat, next);
  }

  if (move.type === 'raise') {
    const target = move.amount;
    const extra = target - state.streetCommitted[seat];
    next = commitQuarks(next, seat, extra);
    next = { ...next, currentBet: target };
    return finishPlayerMove(state, move, seat, next);
  }

  return next;
}

export function handScore(cards: readonly Card[]): number {
  const values = cards.map((c) => RANK_VALUE[c.rank]).sort((a, b) => b - a);
  const counts = new Map<number, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  const groups = [...counts.values()].sort((a, b) => b - a);
  const flush = cards.length === 5 && new Set(cards.map((c) => c.suit)).size === 1;
  const straight = values.length === 5 && values[0]! - values[4]! === 4 && new Set(values).size === 5;
  if (straight && flush) return 8_000_000 + values[0]!;
  if (groups[0] === 4) return 7_000_000 + values[0]!;
  if (groups[0] === 3 && groups[1] === 2) return 6_000_000 + values[0]!;
  if (flush) return 5_000_000 + values[0]!;
  if (straight) return 4_000_000 + values[0]!;
  if (groups[0] === 3) return 3_000_000 + values[0]!;
  if (groups[0] === 2 && groups[1] === 2) return 2_000_000 + values[0]!;
  if (groups[0] === 2) return 1_000_000 + values[0]!;
  return values[0]!;
}

export function bestHandScore(cards: readonly Card[]): number {
  if (cards.length <= 5) return handScore(cards);
  let best = 0;
  const n = cards.length;
  for (let a = 0; a < n; a++)
    for (let b = a + 1; b < n; b++)
      for (let c = b + 1; c < n; c++)
        for (let d = c + 1; d < n; d++)
          for (let e = d + 1; e < n; e++) {
            const score = handScore([
              cards[a] as Card,
              cards[b] as Card,
              cards[c] as Card,
              cards[d] as Card,
              cards[e] as Card,
            ]);
            if (score > best) best = score;
          }
  return best;
}

export function resolveShowdown(state: PokerState): PokerState {
  if (state.completed || state.board.length < 5) return state;
  const s1 = bestHandScore([...state.holes[1], ...state.board]);
  const s2 = bestHandScore([...state.holes[2], ...state.board]);
  const winnerSeat = s1 === s2 ? null : s1 > s2 ? 1 : 2;
  return { ...state, completed: true, winnerSeat };
}

/** Net Quark deltas for platform ledger after a completed hand. */
export function quarkSettlementDeltas(state: PokerState): { seat: 1 | 2; delta: number }[] {
  if (!state.completed) {
    return [];
  }
  const pot = state.pot;
  const c1 = state.committed[1];
  const c2 = state.committed[2];
  if (state.winnerSeat === 1) {
    return [
      { seat: 1, delta: pot - c1 },
      { seat: 2, delta: -c2 },
    ];
  }
  if (state.winnerSeat === 2) {
    return [
      { seat: 1, delta: -c1 },
      { seat: 2, delta: pot - c2 },
    ];
  }
  const half = Math.floor(pot / 2);
  return [
    { seat: 1, delta: half - c1 },
    { seat: 2, delta: pot - half - c2 },
  ];
}
