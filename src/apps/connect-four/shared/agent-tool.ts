import {
  CONNECT_FOUR_SUBMIT_MOVE_TOOL_ID,
  ConnectFourAgentMoveSchema,
} from './connect-four-agent-move-schema';

/**
 * Connect Four's structural tool descriptor. Core registers it with
 * `registerStructuralToolFromApp()`; the schema stays app-owned.
 */
export const CONNECT_FOUR_AGENT_TOOL = {
  id: CONNECT_FOUR_SUBMIT_MOVE_TOOL_ID,
  description:
    'Submit your Connect Four move: the column (0-6, left to right) to drop a disc into. ' +
    'The disc falls to the lowest empty row in that column, so choose a column that is not full.',
  params: ConnectFourAgentMoveSchema,
} as const;

/** Purpose suffix scoping this tool to Connect Four agent turns. */
export const CONNECT_FOUR_AGENT_PURPOSE_SUFFIX = '.connect-four.agent-turn';
