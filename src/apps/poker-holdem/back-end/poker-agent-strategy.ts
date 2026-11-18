import type { GameAgentDifficultyMechanics } from '@/shared/game-platform/difficulty-policy';

export const POKER_STRATEGY_CORE = `TEXAS HOLD'EM FUNDAMENTALS (all tiers):
- You see your hole cards, community cards, pot size, amount to call, and legal actions only.
- Actions: check (no bet facing), call (match), fold (forfeit hand), bet/raise (size in Quarks, minimum shown in contract).
- Hand strength label in the user message reflects your best five-card hand so far — use it with street context.
- Play money (Quarks): avoid spewing large pots with weak holdings; value-bet when clearly ahead.

STREET AWARENESS:
- Pre-flop: high pairs and broadway cards play stronger; suited connectors need good implied odds.
- Post-flop: respect paired boards and obvious draws; fold when the label is weak and facing large bets.
- Bluff sparingly on easy; increase pressure on hard/boss when board favors your represented range.`;

export const POKER_AGENT_STRATEGY_BY_TIER: GameAgentDifficultyMechanics = {
  easy: `HOLD'EM PLAY (easy):
- Call small bets with any pair or high card; fold only very weak hands facing big bets.
- Check when allowed rather than building huge pots without a strong label.
- Occasionally call too wide — human should win often.`,

  medium: `HOLD'EM PLAY (medium):
- Fold weak high-card hands to significant bets on later streets.
- Bet or raise when the hand label is two pair or better on the river, or strong trips+ earlier.
- Call reasonable bets with one pair or decent draws; fold obvious losers.`,

  hard: `HOLD'EM PLAY (hard):
- Fold marginal one-pair hands to large raises on scary boards.
- Value-bet and raise with two pair+, strong draws with good pot odds, and top pair on dry boards.
- Do not call large pots with only high card after the flop unless the bet is tiny.`,

  boss: `HOLD'EM PLAY (boss):
- Treat pot odds: if to-call is large relative to pot, need strong showdown value or a clear draw.
- Fold anything below one pair facing substantial aggression unless the pot is very small.
- Raise for value with sets+, two pair+ on safe boards, and strong top pair; check-call only with medium strength.
- Bluff at most one street when blockers fit; default is tight-aggressive value play.`,
};

export const POKER_USER_TURN_CHECKLIST: Partial<Record<'hard' | 'boss', string>> = {
  hard: `Turn checklist: read hand label + street → fold weak hands to big bets, call with pair+, value-raise with two pair+.`,
  boss: `Turn checklist: pot odds vs label — fold marginal holdings to pressure; raise with clear value; pick one legal action.`,
};
