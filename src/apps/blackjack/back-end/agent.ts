import type { PlatformLlmToolFeedbackTurn } from '@/shared/types/platform-llm-completion';
import type { GameDifficulty } from '@/shared/game-platform/types';
import { agentDifficultyLine, buildAgentSystemPrompt } from '@/shared/game-platform/difficulty-policy';
import {
  BLACKJACK_SUBMIT_MOVE_TOOL_ID,
  BlackjackAgentMoveSchema,
} from '../shared/blackjack-agent-move-schema';
import {
  BLACKJACK_AGENT_STRATEGY_BY_TIER,
  BLACKJACK_STRATEGY_CORE,
  BLACKJACK_USER_TURN_CHECKLIST,
} from './blackjack-agent-strategy';
import {
  chooseCompanionMove,
  handTotals,
  legalActions,
  playerHandViews,
  type BlackjackMove,
  type BlackjackState,
  type Card,
  type PlayerSeat,
} from './rules';

const TIER_TIPS: Record<GameDifficulty, string> = {
  easy: 'Play casually — stand on stiff hands when unsure.',
  medium: 'Standard basic strategy — use the advisory when stuck.',
  hard: 'Play sharp — doubles and splits when legal and sensible.',
  boss: 'Near-optimal seat-2 decisions every turn.',
};

const AGENT_ROLE =
  'You are the Lab Assistant tablemate on seat 2 — one of two player hands vs the house dealer.';

const TOOL_CONTRACT = `OUTPUT CONTRACT (required every turn):
- Call the tool \`${BLACKJACK_SUBMIT_MOVE_TOOL_ID}\` exactly once with {"action": "hit"|"stand"|"double"|"split"}.
- Put the move ONLY in the tool arguments — never in assistant text.
- Only actions listed as legal this turn may be chosen.
- BASIC STRATEGY ADVISORY (when present) is a hint only — you still choose the move.
- If a previous attempt was rejected, the reason is given below — do not repeat it.`;

function formatCard(c: Card): string {
  const rank =
    c.rank === 'T' ? '10' : c.rank === 'A' ? 'A' : c.rank === 'J' ? 'J' : c.rank === 'Q' ? 'Q' : c.rank === 'K' ? 'K' : c.rank;
  const suit = { s: '♠', h: '♥', d: '♦', c: '♣' }[c.suit] ?? c.suit;
  return `${rank}${suit}`;
}

function formatHand(cards: readonly Card[]): string {
  if (!cards.length) {
    return '(empty)';
  }
  const { total, soft } = handTotals(cards);
  return `${cards.map(formatCard).join(' ')} (${total}${soft ? ' soft' : ''})`;
}

function renderDealerUp(state: BlackjackState): string {
  const up = state.dealerHand[0];
  if (!up) {
    return '(none)';
  }
  if (state.dealerHoleHidden) {
    return `${formatCard(up)} + hidden hole`;
  }
  return formatHand(state.dealerHand);
}

export function buildUserPrompt(
  state: BlackjackState,
  seat: number,
  difficulty: GameDifficulty,
  options?: { lastRejection?: string },
): string {
  const playerSeat = seat as PlayerSeat;
  const legal = legalActions(state, playerSeat);
  const views = playerHandViews(state, playerSeat);

  const lines = [
    agentDifficultyLine(difficulty, TIER_TIPS),
    '',
    `You are seat ${seat} (Lab Assistant tablemate). Seat 1 is the human. The dealer is the house — not your opponent seat.`,
    `Bet per stack: ${state.bet} Quarks. Your committed total this hand: ${state.committed[playerSeat]}.`,
    '',
    'Dealer showing:',
    renderDealerUp(state),
    '',
    'Your hand(s):',
  ];

  views.forEach((view, i) => {
    const label = views.length > 1 ? `Hand ${i + 1}${view.active ? ' (active)' : ''}` : 'Active hand';
    lines.push(`- ${label}: ${formatHand(view.cards)}`);
  });

  lines.push(
    '',
    `Legal actions this turn: ${legal.length ? legal.join(', ') : '(none — not your turn or hand is done)'}`,
  );

  if (state.turnHistory.length) {
    const recent = state.turnHistory.slice(-6).map((e) => `Seat ${e.seat}: ${e.summary}`);
    lines.push('', 'Recent table log:', ...recent.map((r) => `- ${r}`));
  }

  if (options?.lastRejection) {
    lines.push('', `Your previous attempt was REJECTED: ${options.lastRejection}`);
  }

  if (legal.length) {
    const advisory = chooseCompanionMove(state, playerSeat);
    lines.push(
      '',
      `Basic-strategy advisory (hint only — you choose): ${advisory.type}`,
    );
  }

  const checklist =
    difficulty === 'hard' || difficulty === 'boss'
      ? BLACKJACK_USER_TURN_CHECKLIST[difficulty]
      : undefined;
  if (checklist) {
    lines.push('', checklist);
  }

  lines.push('', TOOL_CONTRACT);
  return lines.join('\n');
}

export function buildSystemPrompt(difficulty: GameDifficulty): string {
  return buildAgentSystemPrompt({
    baseRules: `${AGENT_ROLE}\n\n${TOOL_CONTRACT}\n\n${BLACKJACK_STRATEGY_CORE}`,
    difficulty,
    gameMechanicsByTier: BLACKJACK_AGENT_STRATEGY_BY_TIER,
  });
}

export function gradeAgentMove(
  raw: unknown,
  state: BlackjackState,
  playerSeat: number,
): BlackjackMove {
  const parsed = BlackjackAgentMoveSchema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new Error(`Invalid arguments: ${issue?.message ?? 'expected {"action": ...}.'}`);
  }
  const action = parsed.data.action;
  const seat = playerSeat as PlayerSeat;

  if (state.completed) {
    throw new Error('The hand is already over — no further action is needed.');
  }
  if (state.activeSeat !== seat) {
    throw new Error('It is not your turn on seat 2.');
  }
  const legal = legalActions(state, seat);
  if (!legal.includes(action)) {
    throw new Error(
      `"${action}" is not legal this turn. Legal actions: ${legal.length ? legal.join(', ') : '(none)'}.`,
    );
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
  if (error.includes('not your turn')) {
    return 'Wait until seat 2 is active — only submit when it is your turn.';
  }
  return 'Submit hit, stand, double, or split as listed legal this turn.';
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
