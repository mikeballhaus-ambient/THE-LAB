import { z } from 'zod';

/** Structural tool id for Poker (Texas Hold'em) vs-AI turns. */
export const POKER_SUBMIT_MOVE_TOOL_ID = 'poker_submit_move';

export const PokerAgentMoveSchema = z
  .object({
    action: z.enum(['fold', 'check', 'call', 'bet', 'raise']),
    amount: z.number().int().positive().optional(),
  })
  .superRefine((value, ctx) => {
    if ((value.action === 'bet' || value.action === 'raise') && value.amount == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'amount is required for bet and raise',
        path: ['amount'],
      });
    }
  });

export type PokerAgentMove = z.infer<typeof PokerAgentMoveSchema>;
