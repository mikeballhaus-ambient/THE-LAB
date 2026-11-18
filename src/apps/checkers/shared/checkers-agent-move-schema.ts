import { z } from 'zod';

/** Structural tool id for Checkers vs-AI turns. */
export const CHECKERS_SUBMIT_MOVE_TOOL_ID = 'checkers_submit_move';

export const CheckersAgentMoveSchema = z.object({
  pieceId: z
    .string()
    .min(1)
    .max(16)
    .describe(
      'The id of the piece you are moving, copied EXACTLY from one of the "Legal moves" entries in the prompt ' +
        '(format "pieceId:toRow,toCol"). Do not invent an id — only ids listed for you are movable.',
    ),
  toRow: z
    .number()
    .int()
    .min(0)
    .max(7)
    .describe('Destination row, 0 = top edge, 7 = bottom edge.'),
  toCol: z
    .number()
    .int()
    .min(0)
    .max(7)
    .describe('Destination column, 0 = left edge, 7 = right edge.'),
});

export type CheckersAgentMove = z.infer<typeof CheckersAgentMoveSchema>;
