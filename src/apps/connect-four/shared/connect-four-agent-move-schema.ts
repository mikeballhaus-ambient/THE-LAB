import { z } from 'zod';

/** Structural tool id for Connect Four vs-AI turns. */
export const CONNECT_FOUR_SUBMIT_MOVE_TOOL_ID = 'connect_four_submit_move';

export const ConnectFourAgentMoveSchema = z.object({
  col: z
    .number()
    .int()
    .min(0)
    .max(6)
    .describe(
      'Column 0-6 to drop your disc into (0 = leftmost). The disc falls to the lowest empty row, ' +
        'so you cannot choose the row. Only pick a column listed as open in the prompt.',
    ),
});

export type ConnectFourAgentMove = z.infer<typeof ConnectFourAgentMoveSchema>;
