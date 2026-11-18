import {
  POKER_SUBMIT_MOVE_TOOL_ID,
  PokerAgentMoveSchema,
} from './poker-agent-move-schema';

/**
 * Poker (Texas Hold'em) structural tool descriptor. Core registers it with
 * `registerStructuralToolFromApp()`; the schema stays app-owned.
 */
export const POKER_AGENT_TOOL = {
  id: POKER_SUBMIT_MOVE_TOOL_ID,
  description:
    'Submit your Poker action: check, fold, call, bet, or raise. Include an amount for bet and raise. ' +
    'Use only actions listed as legal for the current betting round.',
  params: PokerAgentMoveSchema,
} as const;

/** Purpose suffix scoping this tool to Poker agent turns. */
export const POKER_AGENT_PURPOSE_SUFFIX = '.poker-holdem.agent-turn';
