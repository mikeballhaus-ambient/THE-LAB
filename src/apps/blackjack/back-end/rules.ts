/**
 * Blackjack — shared scripted dealer, Quarks play money.
 *
 * **Vs AI:** one human at the table; the **dealer is the house** (not an LLM player seat).
 * **PvP:** **heads-up only** — one human vs one human, two player spots, same dealer.
 * Three-or-more-player tables are out of scope for now.
 */

import type { MatchCreateConfig } from '@/shared/game-platform/types';
import { BLACKJACK_DEFAULT_BET } from '../shared/blackjack-stakes';

export const SUITS = ['s', 'h', 'd', 'c'] as const;
export const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'] as const;

export type Suit = (typeof SUITS)[number];
export type Rank = (typeof RANKS)[number];
export type PlayerSeat = 1 | 2;

export interface Card {
  rank: Rank;
  suit: Suit;
}

export interface TurnHistoryEntry {
  seat: number;
  summary: string;
}

export interface BlackjackState {
  deck: Card[];
  dealerHand: Card[];
  hands: Record<PlayerSeat, Card[]>;
  bet: number;
  committed: Record<PlayerSeat, number>;
  /** After split: one stack per hand; when absent, `hands[seat]` is the only stack. */
  splitHands?: Partial<Record<PlayerSeat, Card[][]>>;
  splitCommitted?: Partial<Record<PlayerSeat, number[]>>;
  splitDone?: Partial<Record<PlayerSeat, boolean[]>>;
  /** Which split stack index is active for `activeSeat`. */
  activeHandIndex?: number;
  /** Heads-up PvP — winner compares both seats' net vs the dealer. */
  headsUp: boolean;
  /** Two player hands vs the same dealer (PvP or AI tablemate on seat 2). */
  twoHandTable: boolean;
  activeSeat: PlayerSeat | null;
  seatDone: Record<PlayerSeat, boolean>;
  dealerHoleHidden: boolean;
  completed: boolean;
  winnerSeat: number | null;
  seatDelta: Record<PlayerSeat, number>;
  turnHistory: TurnHistoryEntry[];
  totals: Record<PlayerSeat, number>;
  dealerUpTotal: number;
  dealerTotal: number;
  /** Vs AI only: both player seats lost — seat 1 Quark loss halved. */
  tablemateLossRelief?: boolean;
}

export type BlackjackMove =
  | { type: 'hit' }
  | { type: 'stand' }
  | { type: 'double' }
  | { type: 'split' };

const RANK_VALUE: Record<Rank, number> = {
  '2': 2,
  '3': 3,
  '4': 4,
  '5': 5,
  '6': 6,
  '7': 7,
  '8': 8,
  '9': 9,
  'T': 10,
  'J': 10,
  'Q': 10,
  'K': 10,
  'A': 11,
};

const EMPTY_NUM: Record<PlayerSeat, number> = { 1: 0, 2: 0 };
const EMPTY_BOOL: Record<PlayerSeat, boolean> = { 1: false, 2: false };

export function createDeck(random: () => number = Math.random): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ rank, suit });
    }
  }
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [deck[i], deck[j]] = [deck[j] as Card, deck[i] as Card];
  }
  return deck;
}

export function handTotals(cards: readonly Card[]): { total: number; soft: boolean } {
  let total = 0;
  let aces = 0;
  for (const c of cards) {
    if (c.rank === 'A') {
      aces += 1;
      total += 11;
    } else {
      total += RANK_VALUE[c.rank];
    }
  }
  while (total > 21 && aces > 0) {
    total -= 10;
    aces -= 1;
  }
  return { total, soft: aces > 0 && total <= 21 };
}

export function isNaturalBlackjack(cards: readonly Card[]): boolean {
  return cards.length === 2 && handTotals(cards).total === 21;
}

function dealerShouldHit(cards: readonly Card[]): boolean {
  return handTotals(cards).total < 17;
}

function appendHistory(state: BlackjackState, seat: number, summary: string): TurnHistoryEntry[] {
  return [...state.turnHistory, { seat, summary }];
}

function seatStackList(state: BlackjackState, seat: PlayerSeat): Card[][] {
  const split = state.splitHands?.[seat];
  if (split && split.length > 0) {
    return split;
  }
  const single = state.hands[seat];
  return single.length > 0 ? [single] : [];
}

function activeStackIndex(state: BlackjackState, seat: PlayerSeat): number {
  if (state.activeSeat !== seat) {
    return 0;
  }
  const stacks = seatStackList(state, seat);
  const idx = state.activeHandIndex ?? 0;
  return Math.min(idx, Math.max(0, stacks.length - 1));
}

function activeStackCards(state: BlackjackState, seat: PlayerSeat): Card[] {
  const stacks = seatStackList(state, seat);
  const idx = activeStackIndex(state, seat);
  return stacks[idx] ?? [];
}

function stackCommittedAmount(state: BlackjackState, seat: PlayerSeat, stackIndex: number): number {
  const split = state.splitCommitted?.[seat];
  if (split && split[stackIndex] != null) {
    return split[stackIndex] as number;
  }
  return state.committed[seat];
}

function ranksMatchForSplit(a: Rank, b: Rank): boolean {
  return a === b;
}

function setStackCards(
  state: BlackjackState,
  seat: PlayerSeat,
  stackIndex: number,
  cards: Card[],
): BlackjackState {
  const split = state.splitHands?.[seat];
  if (split && split.length > 0) {
    const nextStacks = split.map((stack, i) => (i === stackIndex ? cards : stack));
    return {
      ...state,
      splitHands: { ...state.splitHands, [seat]: nextStacks },
      hands: { ...state.hands, [seat]: nextStacks[activeStackIndex(state, seat)] ?? cards },
    };
  }
  return { ...state, hands: { ...state.hands, [seat]: cards } };
}

function withTotals(state: BlackjackState): BlackjackState {
  const dealerTotal = handTotals(state.dealerHand).total;
  const dealerUpTotal =
    state.dealerHoleHidden && state.dealerHand.length >= 2
      ? handTotals([state.dealerHand[0] as Card]).total
      : dealerTotal;
  return {
    ...state,
    totals: {
      1: handTotals(activeStackCards(state, 1)).total,
      2: handTotals(activeStackCards(state, 2)).total,
    },
    dealerUpTotal,
    dealerTotal,
  };
}

function draw(state: BlackjackState): { state: BlackjackState; card: Card | null } {
  const deck = state.deck.slice();
  if (deck.length === 0) {
    return { state, card: null };
  }
  const card = deck.pop() as Card;
  return { state: { ...state, deck }, card };
}

function seatProfitVsDealer(
  hand: readonly Card[],
  committed: number,
  bet: number,
  dealerTotal: number,
  dealerBust: boolean,
  dealerBj: boolean,
  allowNaturalBonus: boolean,
): number {
  const total = handTotals(hand).total;
  if (total > 21) {
    return -committed;
  }
  if (allowNaturalBonus && isNaturalBlackjack(hand) && committed === bet && !dealerBj) {
    return Math.floor((bet * 3) / 2);
  }
  if (dealerBj && isNaturalBlackjack(hand)) {
    return 0;
  }
  if (dealerBj) {
    return -committed;
  }
  if (dealerBust) {
    return committed;
  }
  if (total > dealerTotal) {
    return committed;
  }
  if (total < dealerTotal) {
    return -committed;
  }
  return 0;
}

function settleSeatStacks(
  state: BlackjackState,
  seat: PlayerSeat,
  dealerTotal: number,
  dealerBust: boolean,
  dealerBj: boolean,
): number {
  const stacks = seatStackList(state, seat);
  if (stacks.length === 0) {
    return 0;
  }
  const splitBonus = !state.splitHands?.[seat];
  let net = 0;
  for (let i = 0; i < stacks.length; i++) {
    net += seatProfitVsDealer(
      stacks[i] as Card[],
      stackCommittedAmount(state, seat, i),
      state.bet,
      dealerTotal,
      dealerBust,
      dealerBj,
      splitBonus,
    );
  }
  return net;
}

/** Vs AI: when you and the tablemate both lose vs the dealer, halve seat 1's Quark loss. */
function applyAiTablemateLossRelief(
  state: BlackjackState,
  seatDelta: Record<PlayerSeat, number>,
): { seatDelta: Record<PlayerSeat, number>; relief: boolean } {
  if (!state.twoHandTable || state.headsUp) {
    return { seatDelta, relief: false };
  }
  if (seatDelta[1] >= 0 || seatDelta[2] >= 0) {
    return { seatDelta, relief: false };
  }
  return {
    seatDelta: { ...seatDelta, 1: Math.ceil(seatDelta[1] / 2) },
    relief: true,
  };
}

function pickMatchWinner(state: BlackjackState): number | null {
  if (!state.headsUp) {
    const d = state.seatDelta[1];
    if (d > 0) {
      return 1;
    }
    if (d < 0) {
      return 2;
    }
    return null;
  }
  const d1 = state.seatDelta[1];
  const d2 = state.seatDelta[2];
  if (d1 > d2) {
    return 1;
  }
  if (d2 > d1) {
    return 2;
  }
  return null;
}

function finalizeHand(state: BlackjackState, note: string): BlackjackState {
  let next: BlackjackState = { ...state, dealerHoleHidden: false, activeSeat: null };
  while (dealerShouldHit(next.dealerHand)) {
    const drawn = draw(next);
    if (!drawn.card) {
      break;
    }
    next = {
      ...drawn.state,
      dealerHand: [...next.dealerHand, drawn.card],
      turnHistory: appendHistory(next, 0, 'Dealer hits'),
    };
  }
  next = withTotals(next);
  const dealerBust = next.dealerTotal > 21;
  const dealerBj = isNaturalBlackjack(next.dealerHand);
  const seatDelta: Record<PlayerSeat, number> = { 1: 0, 2: 0 };
  if (next.hands[1].length > 0 || (next.splitHands?.[1]?.length ?? 0) > 0) {
    seatDelta[1] = settleSeatStacks(next, 1, next.dealerTotal, dealerBust, dealerBj);
  }
  if (next.twoHandTable && (next.hands[2].length > 0 || (next.splitHands?.[2]?.length ?? 0) > 0)) {
    seatDelta[2] = settleSeatStacks(next, 2, next.dealerTotal, dealerBust, dealerBj);
  }
  const relief = applyAiTablemateLossRelief(next, seatDelta);
  next = {
    ...next,
    seatDelta: relief.seatDelta,
    tablemateLossRelief: relief.relief,
    completed: true,
    turnHistory: relief.relief
      ? appendHistory(next, 0, 'Tablemate relief — half your Quark loss')
      : next.turnHistory,
  };
  next = { ...next, turnHistory: appendHistory(next, 0, note) };
  next = { ...next, winnerSeat: pickMatchWinner(next) };
  return next;
}

function advanceAfterSeatDone(state: BlackjackState): BlackjackState {
  if (state.twoHandTable && !state.seatDone[2] && seatStackList(state, 2).length > 0) {
    return withTotals({ ...state, activeSeat: 2, activeHandIndex: 0 });
  }
  return finalizeHand(state, 'Dealer resolves the hand.');
}

function advanceAfterStackDone(state: BlackjackState, seat: PlayerSeat): BlackjackState {
  const stacks = seatStackList(state, seat);
  const done = state.splitDone?.[seat];
  const idx = activeStackIndex(state, seat);
  if (stacks.length > 1 && done) {
    const nextDone = done.map((d, i) => (i === idx ? true : d));
    const nextIdx = nextDone.findIndex((d) => !d);
    if (nextIdx >= 0) {
      return withTotals({
        ...state,
        splitDone: { ...state.splitDone, [seat]: nextDone },
        activeHandIndex: nextIdx,
        hands: { ...state.hands, [seat]: stacks[nextIdx] as Card[] },
        activeSeat: seat,
      });
    }
    const next = withTotals({
      ...state,
      splitDone: { ...state.splitDone, [seat]: nextDone },
      seatDone: { ...state.seatDone, [seat]: true },
      activeSeat: null,
      activeHandIndex: 0,
    });
    return advanceAfterSeatDone(next);
  }
  const next = withTotals({
    ...state,
    seatDone: { ...state.seatDone, [seat]: true },
    activeSeat: null,
    activeHandIndex: 0,
  });
  return advanceAfterSeatDone(next);
}

function markStackBust(state: BlackjackState, seat: PlayerSeat): BlackjackState {
  const idx = activeStackIndex(state, seat);
  const loss = -stackCommittedAmount(state, seat, idx);
  const stacks = seatStackList(state, seat);
  const seatDelta = { ...state.seatDelta, [seat]: state.seatDelta[seat] + loss };

  if (stacks.length > 1 && state.splitDone?.[seat]) {
    const nextDone = state.splitDone[seat].map((d, i) => (i === idx ? true : d));
    const nextIdx = nextDone.findIndex((d) => !d);
    const next = withTotals({
      ...state,
      splitDone: { ...state.splitDone, [seat]: nextDone },
      seatDelta,
      turnHistory: appendHistory(state, seat, `Bust (hand ${idx + 1})`),
      activeSeat: nextIdx >= 0 ? seat : null,
      activeHandIndex: nextIdx >= 0 ? nextIdx : 0,
      hands:
        nextIdx >= 0
          ? { ...state.hands, [seat]: stacks[nextIdx] as Card[] }
          : state.hands,
    });
    if (nextIdx >= 0) {
      return next;
    }
    const finishedSeat = withTotals({
      ...next,
      seatDone: { ...next.seatDone, [seat]: true },
    });
    if (state.twoHandTable && !finishedSeat.seatDone[2] && seat === 1) {
      return { ...finishedSeat, activeSeat: 2, activeHandIndex: 0 };
    }
    return finalizeHand(finishedSeat, 'Dealer resolves the hand.');
  }

  const next = withTotals({
    ...state,
    seatDone: { ...state.seatDone, [seat]: true },
    seatDelta,
    turnHistory: appendHistory(state, seat, 'Bust'),
    activeSeat: null,
  });
  if (state.twoHandTable && seat === 1 && !next.seatDone[2]) {
    return { ...next, activeSeat: 2 };
  }
  if (state.twoHandTable && seat === 2) {
    return finalizeHand(next, 'Dealer resolves the hand.');
  }
  return finalizeHand(next, 'Dealer resolves the hand.');
}

function resolveImmediateDealerBlackjack(state: BlackjackState): BlackjackState | null {
  if (!isNaturalBlackjack(state.dealerHand)) {
    return null;
  }
  return finalizeHand(state, 'Dealer blackjack.');
}

export function createInitialState(
  config?: MatchCreateConfig,
  random: () => number = Math.random,
): BlackjackState {
  const bet = BLACKJACK_DEFAULT_BET;
  const headsUp = config?.opponentKind === 'human';
  const twoHandTable = config?.opponentKind === 'human' || config?.opponentKind === 'ai';
  const deck = createDeck(random);
  const hands: Record<PlayerSeat, Card[]> = {
    1: [deck.pop() as Card, deck.pop() as Card],
    2: twoHandTable ? [deck.pop() as Card, deck.pop() as Card] : [],
  };
  const dealerHand: Card[] = [deck.pop() as Card, deck.pop() as Card];
  const state: BlackjackState = withTotals({
    deck,
    dealerHand,
    hands,
    bet,
    committed: { 1: bet, 2: twoHandTable ? bet : 0 },
    headsUp,
    twoHandTable,
    activeSeat: 1,
    seatDone: { ...EMPTY_BOOL },
    dealerHoleHidden: true,
    completed: false,
    winnerSeat: null,
    seatDelta: { ...EMPTY_NUM },
    turnHistory: [
      {
        seat: 1,
        summary: headsUp
          ? `Bet ${bet} Quarks each — deal (shared dealer).`
          : twoHandTable
            ? `Bet ${bet} Quarks each — you and the Lab Assistant vs the dealer.`
            : `Bet ${bet} Quarks — deal.`,
      },
    ],
    totals: { ...EMPTY_NUM },
    dealerUpTotal: 0,
    dealerTotal: 0,
  });

  const dealerSnap = resolveImmediateDealerBlackjack(state);
  if (dealerSnap) {
    return dealerSnap;
  }

  if (isNaturalBlackjack(state.hands[1]) && !twoHandTable) {
    return finalizeHand(state, 'Blackjack!');
  }

  return state;
}

export function parseMove(move: unknown): BlackjackMove | null {
  if (!move || typeof move !== 'object') {
    return null;
  }
  const t = (move as { type?: unknown }).type;
  if (t === 'hit' || t === 'stand' || t === 'double' || t === 'split') {
    return { type: t };
  }
  return null;
}

export function legalActions(state: BlackjackState, seat: PlayerSeat): BlackjackMove['type'][] {
  if (state.completed || state.activeSeat !== seat || state.seatDone[seat]) {
    return [];
  }
  const actions: BlackjackMove['type'][] = ['hit', 'stand'];
  const hand = activeStackCards(state, seat);
  const idx = activeStackIndex(state, seat);
  const stackBet = stackCommittedAmount(state, seat, idx);
  if (hand.length === 2 && stackBet === state.bet) {
    actions.push('double');
  }
  if (
    hand.length === 2 &&
    !state.splitHands?.[seat] &&
    state.committed[seat] === state.bet &&
    ranksMatchForSplit(hand[0]?.rank as Rank, hand[1]?.rank as Rank)
  ) {
    actions.push('split');
  }
  return actions;
}

export function validateMove(
  state: BlackjackState,
  move: BlackjackMove,
  playerSeat: number,
): { ok: true } | { ok: false; error: string } {
  if (state.completed) {
    return { ok: false, error: 'Hand is over' };
  }
  const seat = playerSeat as PlayerSeat;
  if (seat !== 1 && seat !== 2) {
    return { ok: false, error: 'Invalid seat' };
  }
  if (state.activeSeat !== seat) {
    return { ok: false, error: 'Not your turn' };
  }
  if (!legalActions(state, seat).includes(move.type)) {
    return { ok: false, error: 'Illegal action' };
  }
  return { ok: true };
}

function hit(state: BlackjackState, seat: PlayerSeat): BlackjackState {
  const idx = activeStackIndex(state, seat);
  const drawn = draw(state);
  if (!drawn.card) {
    return state;
  }
  const nextCards = [...activeStackCards(state, seat), drawn.card];
  let next = setStackCards(
    withTotals({
      ...drawn.state,
      turnHistory: appendHistory(state, seat, stacksLabel(state, seat, 'Hit')),
    }),
    seat,
    idx,
    nextCards,
  );
  next = withTotals(next);
  if (handTotals(nextCards).total > 21) {
    return markStackBust(next, seat);
  }
  return next;
}

function stacksLabel(state: BlackjackState, seat: PlayerSeat, verb: string): string {
  const stacks = seatStackList(state, seat);
  if (stacks.length > 1) {
    return `${verb} (hand ${activeStackIndex(state, seat) + 1})`;
  }
  return verb;
}

function stand(state: BlackjackState, seat: PlayerSeat): BlackjackState {
  const next = withTotals({
    ...state,
    turnHistory: appendHistory(state, seat, stacksLabel(state, seat, 'Stand')),
  });
  return advanceAfterStackDone(next, seat);
}

function doubleDown(state: BlackjackState, seat: PlayerSeat): BlackjackState {
  const idx = activeStackIndex(state, seat);
  const prev = stackCommittedAmount(state, seat, idx);
  const doubled = prev + state.bet;
  let next: BlackjackState = {
    ...state,
    turnHistory: appendHistory(
      state,
      seat,
      `Double — ${doubled} Quarks${seatStackList(state, seat).length > 1 ? ` (hand ${idx + 1})` : ''}`,
    ),
  };
  if (next.splitCommitted?.[seat]) {
    const splitCommitted = next.splitCommitted[seat].map((c, i) => (i === idx ? doubled : c));
    next = {
      ...next,
      splitCommitted: { ...next.splitCommitted, [seat]: splitCommitted },
      committed: {
        ...next.committed,
        [seat]: splitCommitted.reduce((a, b) => a + b, 0),
      },
    };
  } else {
    next = {
      ...next,
      committed: { ...next.committed, [seat]: doubled },
    };
  }
  next = hit(next, seat);
  if (next.completed) {
    return next;
  }
  if (next.activeSeat === seat && !next.seatDone[seat]) {
    next = stand(next, seat);
  }
  return next;
}

function split(state: BlackjackState, seat: PlayerSeat): BlackjackState {
  const hand = state.hands[seat];
  if (hand.length !== 2) {
    return state;
  }
  const [c1, c2] = hand;
  let next: BlackjackState = {
    ...state,
    splitHands: { ...state.splitHands, [seat]: [[c1 as Card], [c2 as Card]] },
    splitCommitted: { ...state.splitCommitted, [seat]: [state.bet, state.bet] },
    splitDone: { ...state.splitDone, [seat]: [false, false] },
    committed: { ...state.committed, [seat]: state.bet * 2 },
    activeHandIndex: 0,
    hands: { ...state.hands, [seat]: [c1 as Card] },
    turnHistory: appendHistory(state, seat, `Split — ${state.bet * 2} Quarks total`),
  };
  for (let i = 0; i < 2; i++) {
    const drawn = draw(next);
    if (!drawn.card) {
      break;
    }
    const stacks = seatStackList(drawn.state, seat);
    const stack = stacks[i] ?? [];
    next = setStackCards(
      { ...drawn.state, turnHistory: next.turnHistory },
      seat,
      i,
      [...stack, drawn.card],
    );
  }
  next = withTotals(next);
  return next;
}

export function applyMove(state: BlackjackState, move: BlackjackMove, playerSeat: number): BlackjackState {
  const seat = playerSeat as PlayerSeat;
  if (move.type === 'hit') {
    return hit(state, seat);
  }
  if (move.type === 'stand') {
    return stand(state, seat);
  }
  if (move.type === 'split') {
    return split(state, seat);
  }
  return doubleDown(state, seat);
}

export function onTimeout(state: BlackjackState, playerSeat: number): BlackjackState {
  if (state.completed || state.activeSeat !== playerSeat) {
    return state;
  }
  return stand(state, playerSeat as PlayerSeat);
}

export function nextSeatAfterMove(state: BlackjackState): number | null {
  if (state.completed) {
    return null;
  }
  return state.activeSeat ?? 1;
}

/** Net Quark deltas per seat after a completed hand. */
export function quarkSettlementDeltas(
  state: BlackjackState,
): { seat: PlayerSeat; delta: number }[] {
  if (!state.completed) {
    return [];
  }
  const lines: { seat: PlayerSeat; delta: number }[] = [];
  if (state.seatDelta[1] !== 0) {
    lines.push({ seat: 1, delta: state.seatDelta[1] });
  }
  if (state.headsUp && state.seatDelta[2] !== 0) {
    lines.push({ seat: 2, delta: state.seatDelta[2] });
  }
  return lines;
}

export function summarizeMove(move: BlackjackMove): string {
  if (move.type === 'hit') {
    return 'Hit';
  }
  if (move.type === 'stand') {
    return 'Stand';
  }
  if (move.type === 'split') {
    return 'Split';
  }
  return 'Double down';
}

/** Wire-format stacks for UI (active hand highlighted by server seat turn). */
export function playerHandViews(
  state: BlackjackState,
  seat: PlayerSeat,
): { cards: Card[]; total: number; active: boolean }[] {
  const stacks = seatStackList(state, seat);
  const activeIdx = state.activeSeat === seat ? activeStackIndex(state, seat) : -1;
  return stacks.map((cards, i) => ({
    cards,
    total: handTotals(cards).total,
    active: i === activeIdx,
  }));
}

/** Basic-strategy pair split for the scripted tablemate (dealer up-card aware). */
export function shouldCompanionSplit(pairRank: Rank, dealerUpTotal: number): boolean {
  if (pairRank === 'A' || pairRank === '8') {
    return true;
  }
  if (pairRank === '9') {
    return dealerUpTotal !== 7 && dealerUpTotal !== 10 && dealerUpTotal !== 11;
  }
  if (pairRank === '7') {
    return dealerUpTotal <= 7;
  }
  if (pairRank === '6') {
    return dealerUpTotal <= 6;
  }
  if (pairRank === '2' || pairRank === '3') {
    return dealerUpTotal <= 7;
  }
  return false;
}

/** Basic-strategy reference move — used in tests and as an LLM advisory hint in `agent.ts`. */
export function chooseCompanionMove(state: BlackjackState, seat: PlayerSeat): BlackjackMove {
  const actions = legalActions(state, seat);
  const hand = activeStackCards(state, seat);
  const total = handTotals(hand).total;
  if (isNaturalBlackjack(hand) || total >= 21) {
    return { type: 'stand' };
  }
  if (actions.includes('split') && hand.length === 2 && hand[0]?.rank === hand[1]?.rank) {
    const rank = hand[0].rank;
    if (shouldCompanionSplit(rank, state.dealerUpTotal)) {
      return { type: 'split' };
    }
  }
  if (actions.includes('double') && (total === 11 || total === 10)) {
    return { type: 'double' };
  }
  if (total < 17 && actions.includes('hit')) {
    return { type: 'hit' };
  }
  return { type: 'stand' };
}
