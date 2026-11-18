import {
  CHESS_SUBMIT_MOVE_TOOL_ID,
  ChessAgentMoveSchema,
} from './chess-agent-move-schema';

/**
 * Chess's structural tool descriptor. Core registers it with
 * `registerStructuralToolFromApp()`; the schema stays app-owned.
 */
export const CHESS_AGENT_TOOL = {
  id: CHESS_SUBMIT_MOVE_TOOL_ID,
  description:
    'Submit your Chess move as origin and destination squares. Row 0 is rank 8, row 7 is rank 1; ' +
    'column 0 is the a-file, column 7 the h-file. Include a promotion piece when a pawn reaches the last rank.',
  params: ChessAgentMoveSchema,
} as const;

/** Purpose suffix scoping this tool to Chess agent turns. */
export const CHESS_AGENT_PURPOSE_SUFFIX = '.chess.agent-turn';
