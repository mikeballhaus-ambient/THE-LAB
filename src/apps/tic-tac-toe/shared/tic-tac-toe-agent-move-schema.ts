import { z } from 'zod';

/** Structural tool id for Tic-Tac-Toe vs-AI turns. */
export const TIC_TAC_TOE_SUBMIT_MOVE_TOOL_ID = 'tic_tac_toe_submit_move';

/**
 * Board layout the agent is given (index = cell):
 * ```
 *  0 | 1 | 2
 *  3 | 4 | 5
 *  6 | 7 | 8
 * ```
 */
export const TicTacToeAgentMoveSchema = z.object({
  index: z
    .number()
    .int()
    .min(0)
    .max(8)
    .describe(
      'Cell index 0-8, numbered left-to-right then top-to-bottom: 0|1|2 / 3|4|5 / 6|7|8. ' +
        'Pick an EMPTY cell from the "Empty cells" list in the prompt. 0 is top-left, 8 is bottom-right.',
    ),
});

export type TicTacToeAgentMove = z.infer<typeof TicTacToeAgentMoveSchema>;
