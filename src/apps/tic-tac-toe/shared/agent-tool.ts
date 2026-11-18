import {
  TIC_TAC_TOE_SUBMIT_MOVE_TOOL_ID,
  TicTacToeAgentMoveSchema,
} from './tic-tac-toe-agent-move-schema';

/**
 * Tic-Tac-Toe's structural tool descriptor. Core registers it with
 * `registerStructuralToolFromApp()`; the schema stays app-owned.
 */
export const TIC_TAC_TOE_AGENT_TOOL = {
  id: TIC_TAC_TOE_SUBMIT_MOVE_TOOL_ID,
  description:
    'Submit your Tic-Tac-Toe move by claiming one empty cell. The board is numbered 0-8 ' +
    'left-to-right then top-to-bottom: 0|1|2 / 3|4|5 / 6|7|8. Only cells listed as empty are legal.',
  params: TicTacToeAgentMoveSchema,
} as const;

/** Purpose suffix scoping this tool to Tic-Tac-Toe agent turns. */
export const TIC_TAC_TOE_AGENT_PURPOSE_SUFFIX = '.tic-tac-toe.agent-turn';
