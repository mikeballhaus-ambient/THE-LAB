import type { PlatformLlmToolFeedbackTurn } from '@/shared/types/platform-llm-completion';
import type { GameDifficulty } from '@/shared/game-platform/types';
import { agentDifficultyLine, buildAgentSystemPrompt } from '@/shared/game-platform/difficulty-policy';
import {
  POKER_SUBMIT_MOVE_TOOL_ID,
  PokerAgentMoveSchema,
} from '../shared/poker-agent-move-schema';
import { HOLDEM_BIG_BLIND, HOLDEM_MIN_BET } from '../shared/holdem-stakes';
import {
  bestHandScore,
  handScore,
  legalActionsFor,
  toCallAmount,
  type Card,
  type PokerMove,
  type PokerState,
} from './rules';
import {
  POKER_AGENT_STRATEGY_BY_TIER,
  POKER_STRATEGY_CORE,
  POKER_USER_TURN_CHECKLIST,
} from './poker-agent-strategy';

const TIER_TIPS: Record<GameDifficulty, string> = {
  easy: 'Play loosely — call small bets, fold only the worst.',
  medium: 'Play your hand strength — fold weak holdings, value-bet strong ones.',
  hard: 'Play tightly — fold marginal hands; raise with clear strength.',
  boss: 'Fold anything without clear showdown value unless the pot is tiny.',
};

const AGENT_ROLE = "You are a Texas Hold'em opponent (Quarks play money).";

const TOOL_CONTRACT = `OUTPUT CONTRACT (required every turn):
- Call the tool \`${POKER_SUBMIT_MOVE_TOOL_ID}\` exactly once.
- Put the action ONLY in the tool arguments — never in assistant text.
- {"action":"check"}  no bet to call
- {"action":"call"}   match the current bet
- {"action":"fold"}   surrender the hand
- {"action":"bet","amount":N}   open for N Quarks (min ${HOLDEM_MIN_BET})
- {"action":"raise","amount":N}   raise the current bet to N Quarks
- Only choose an action listed as legal below.`;

function cardName(card: Card): string {
  return `${card.rank}${card.suit}`;
}

export function rankLabel(score: number): string {
  const labels: Array<[number, string]> = [
    [8_000_000, 'straight flush'],
    [7_000_000, 'four of a kind'],
    [6_000_000, 'full house'],
    [5_000_000, 'flush'],
    [4_000_000, 'straight'],
    [3_000_000, 'three of a kind'],
    [2_000_000, 'two pair'],
    [1_000_000, 'one pair'],
  ];
  for (const [floor, label] of labels) {
    if (score >= floor) {
      return label;
    }
  }
  return 'high card';
}

function streetName(boardCount: number): string {
  if (boardCount === 0) return 'pre-flop';
  if (boardCount === 3) return 'flop';
  if (boardCount === 4) return 'turn';
  if (boardCount === 5) return 'river';
  return 'in progress';
}

export function buildUserPrompt(
  state: PokerState,
  seat: number,
  difficulty: GameDifficulty,
  options?: { lastRejection?: string },
): string {
  const hole = state.holes[seat as 1 | 2] ?? [];
  const board = state.board;
  const legal = legalActionsFor(state, seat as 1 | 2);
  const toCall = toCallAmount(state, seat as 1 | 2);

  const lines = [
    agentDifficultyLine(difficulty, TIER_TIPS),
    '',
    `You are seat ${seat}. Street: ${streetName(board.length)}.`,
    '',
    `Your hole cards: ${hole.length ? hole.map(cardName).join(' ') : '(none)'}`,
    `Community cards: ${board.length ? board.map(cardName).join(' ') : '(none yet)'}`,
    `Pot: ${state.pot} Quarks. To call: ${toCall}. Big blind: ${HOLDEM_BIG_BLIND}.`,
  ];

  if (hole.length) {
    const score = board.length >= 3 ? bestHandScore([...hole, ...board]) : handScore(hole);
    lines.push(`Your best hand right now: ${rankLabel(score)}.`);
  }

  lines.push(
    '',
    `Legal actions this turn: ${legal.length ? legal.join(', ') : '(none — the hand is over)'}`,
  );

  if (options?.lastRejection) {
    lines.push('', `Your previous attempt was REJECTED: ${options.lastRejection}`);
  }

  const checklist =
    difficulty === 'hard' || difficulty === 'boss'
      ? POKER_USER_TURN_CHECKLIST[difficulty]
      : undefined;
  if (checklist) {
    lines.push('', checklist);
  }

  lines.push('', TOOL_CONTRACT);
  return lines.join('\n');
}

export function buildSystemPrompt(difficulty: GameDifficulty): string {
  return buildAgentSystemPrompt({
    baseRules: `${AGENT_ROLE}\n\n${TOOL_CONTRACT}\n\n${POKER_STRATEGY_CORE}`,
    difficulty,
    gameMechanicsByTier: POKER_AGENT_STRATEGY_BY_TIER,
  });
}

export function gradeAgentMove(raw: unknown, state: PokerState, playerSeat: number): PokerMove {
  const parsed = PokerAgentMoveSchema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new Error(`Invalid arguments: ${issue?.message ?? 'expected {"action": ...}.'}`);
  }
  const { action, amount } = parsed.data;

  if (state.completed) {
    throw new Error('The hand is already over — no further action is needed.');
  }

  const seat = playerSeat as 1 | 2;
  const legal = legalActionsFor(state, seat);
  if (!legal.includes(action)) {
    throw new Error(
      `"${action}" is not legal this turn. Legal actions: ${legal.join(', ')}.`,
    );
  }

  if (action === 'bet' || action === 'raise') {
    return { type: action, amount: amount! };
  }
  return { type: action };
}

export function toolResultHint(error: string): string | undefined {
  if (error.includes('not legal')) {
    return 'Choose one of the actions listed as legal in the first user message.';
  }
  if (error.includes('already over')) {
    return 'The hand has ended; no action is needed.';
  }
  if (error.includes('Minimum')) {
    return 'Use a valid bet/raise size in Quarks.';
  }
  return 'Submit one of the legal actions for this turn.';
}

export function retryUserHint(context: {
  lastRejection: string;
  priorTurns: readonly PlatformLlmToolFeedbackTurn[];
}): string {
  return (
    `Attempt ${context.priorTurns.length + 1} rejected: ${context.lastRejection} ` +
    'Pick a different action from the legal list.'
  );
}

export function attemptNote(_toolArguments: string, error: string): string {
  return `Tried an illegal action — ${error}`;
}
