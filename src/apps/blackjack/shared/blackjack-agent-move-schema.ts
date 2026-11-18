import { z } from 'zod';

export const BLACKJACK_SUBMIT_MOVE_TOOL_ID = 'blackjack_submit_move';

export const BlackjackAgentMoveSchema = z.object({
  action: z
    .enum(['hit', 'stand', 'double', 'split'])
    .describe('Your action this turn — must be one of the legal actions listed in the prompt.'),
});

export type BlackjackAgentMovePayload = z.infer<typeof BlackjackAgentMoveSchema>;
