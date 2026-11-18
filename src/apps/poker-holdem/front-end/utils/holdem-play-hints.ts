import type { PokerMove } from '../../back-end/rules';
import { formatLabQuarksNumber } from '@/shared/constants/lab-quarks-currency';

export interface HoldemPlayHint {
  id: string;
  action: PokerMove['type'];
  title: string;
  detail: string;
}

export interface HoldemPlayHintsContext {
  legalActions: PokerMove['type'][];
  toCall: number;
  minBet: number;
  minRaiseTo: number;
  pot: number;
  boardLength: number;
  isMyTurn: boolean;
  handOver: boolean;
  opponentThinking: boolean;
}

export function holdemPlayHintsLead(ctx: HoldemPlayHintsContext): string {
  if (ctx.handOver) {
    return 'This hand is finished. Start another match from the lobby or play again.';
  }
  if (ctx.opponentThinking) {
    return 'Your opponent is choosing an action. The Your action box beside your hand activates on your turn.';
  }
  if (!ctx.isMyTurn) {
    return 'Wait for your opponent. You will see Call, Check, Bet, and other options when it is your turn.';
  }
  if (ctx.boardLength === 0) {
    return 'Pre-flop: blinds are already in the pot. Match the bet, raise, or fold — when both players match, the flop appears automatically.';
  }
  return 'Choose an action in the box beside your hand. Only highlighted buttons are allowed this turn. Community cards appear automatically when betting is matched.';
}

export function holdemPlayHintsForTurn(ctx: HoldemPlayHintsContext): HoldemPlayHint[] {
  if (ctx.handOver || !ctx.isMyTurn || ctx.opponentThinking) {
    return [];
  }

  const hints: HoldemPlayHint[] = [];
  const push = (action: PokerMove['type'], title: string, detail: string) => {
    if (!ctx.legalActions.includes(action)) {
      return;
    }
    hints.push({ id: action, action, title, detail });
  };

  push(
    'call',
    ctx.toCall > 0 ? `Call ${formatLabQuarksNumber(ctx.toCall)} Quarks` : 'Call',
    'Put in the amount needed to match the current bet and stay in the hand.',
  );
  push(
    'check',
    'Check',
    'Pass without putting in more Quarks — only when you already match the current bet.',
  );
  push(
    'fold',
    'Fold',
    'Leave the hand. Your opponent wins the pot; you will not see more cards this hand.',
  );
  push(
    'bet',
    `Bet ${formatLabQuarksNumber(ctx.minBet)}+ Quarks`,
    `Open the betting for at least ${formatLabQuarksNumber(ctx.minBet)} Quarks when no one has bet this street yet.`,
  );
  push(
    'raise',
    `Raise to ${formatLabQuarksNumber(ctx.minRaiseTo)} Quarks`,
    `Increase the bet to at least ${formatLabQuarksNumber(ctx.minRaiseTo)} Quarks. Opponent must match or fold.`,
  );

  return hints;
}

export function holdemPlayHintsSubtitle(ctx: HoldemPlayHintsContext): string {
  if (ctx.handOver) {
    return 'Hand complete';
  }
  if (ctx.opponentThinking) {
    return 'Opponent thinking…';
  }
  if (!ctx.isMyTurn) {
    return 'Waiting for opponent';
  }
  return 'Your turn — pick an action';
}
