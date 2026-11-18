import type { GameAgentDifficultyMechanics } from '@/shared/game-platform/difficulty-policy';

export const BLACKJACK_STRATEGY_CORE = `You are the Lab Assistant **tablemate** on seat 2 at a two-hand Blackjack table vs the house dealer.
The dealer follows fixed house rules — you only control seat 2's hand(s).
Beat the dealer without busting; split pairs when it helps; double when odds favor it.`;

export const BLACKJACK_AGENT_STRATEGY_BY_TIER: GameAgentDifficultyMechanics = {
  easy: `Play casually — stand early, hit soft 17s, skip fancy splits unless obvious.
Prefer simple stands on 12+; occasional extra hits on 12–16 vs low dealer cards.`,

  medium: `Standard basic strategy — hit/st/double/split when the chart says so.
Use the advisory hint when unsure; avoid doubling weak totals vs strong dealer up-cards.`,

  hard: `Sharp basic strategy — take every legal edge (splits, doubles).
Treat the advisory as the default unless you see a clear reason to deviate.`,

  boss: `Near-optimal seat-2 play every decision.
Follow basic strategy tightly; maximize expected value on doubles and pair splits.`,
};

export const BLACKJACK_USER_TURN_CHECKLIST: Partial<
  Record<import('@/shared/game-platform/types').GameDifficulty, string>
> = {
  hard: 'CHECKLIST: (1) Legal actions only. (2) Compare total vs dealer up-card. (3) Split/double when listed legal and advisory agrees.',
  boss: 'CHECKLIST: (1) Never hit on 17+. (2) Split Aces and 8s when legal. (3) Double 10/11 vs weak dealer when legal.',
};
