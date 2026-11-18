import {
  BATTLESHIP_SUBMIT_MOVE_TOOL_ID,
  BattleshipAgentMoveSchema,
} from './battleship-agent-move-schema';

/**
 * Battleship's structural tool descriptor. Core registers it with
 * `registerStructuralToolFromApp()`; the schema stays app-owned.
 */
export const BATTLESHIP_AGENT_TOOL = {
  id: BATTLESHIP_SUBMIT_MOVE_TOOL_ID,
  description:
    'Submit your Battleship shot: a row and column on the ENEMY board. Never fire at a cell you ' +
    'have already shot. Sink every enemy ship to win.',
  params: BattleshipAgentMoveSchema,
} as const;

/** Purpose suffix scoping this tool to Battleship agent turns. */
export const BATTLESHIP_AGENT_PURPOSE_SUFFIX = '.battleship.agent-turn';
