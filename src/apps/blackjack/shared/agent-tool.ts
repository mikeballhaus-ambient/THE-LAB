import {
  BLACKJACK_SUBMIT_MOVE_TOOL_ID,
  BlackjackAgentMoveSchema,
} from './blackjack-agent-move-schema';

export const BLACKJACK_AGENT_TOOL = {
  id: BLACKJACK_SUBMIT_MOVE_TOOL_ID,
  description:
    'Submit your Blackjack action for your active hand: hit, stand, double, or split. ' +
    'Use only actions listed as legal this turn.',
  params: BlackjackAgentMoveSchema,
} as const;

export const BLACKJACK_AGENT_PURPOSE_SUFFIX = '.blackjack.agent-turn';
