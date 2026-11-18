import {
  CHECKERS_SUBMIT_MOVE_TOOL_ID,
  CheckersAgentMoveSchema,
} from './checkers-agent-move-schema';

/**
 * Checkers' structural tool descriptor. Core registers it with
 * `registerStructuralToolFromApp()`; the schema stays app-owned.
 */
export const CHECKERS_AGENT_TOOL = {
  id: CHECKERS_SUBMIT_MOVE_TOOL_ID,
  description:
    'Submit your Checkers move: the id of one of your pieces and its destination square. ' +
    'Use only moves listed as legal for you. Quiet moves and captures are both allowed when listed.',
  params: CheckersAgentMoveSchema,
} as const;

/** Purpose suffix scoping this tool to Checkers agent turns. */
export const CHECKERS_AGENT_PURPOSE_SUFFIX = '.checkers.agent-turn';
