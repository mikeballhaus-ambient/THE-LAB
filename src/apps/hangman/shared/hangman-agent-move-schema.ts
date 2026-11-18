import { z } from 'zod';

/** Structural tool id for Hangman vs-AI turns. */
export const HANGMAN_SUBMIT_MOVE_TOOL_ID = 'hangman_submit_move';

/**
 * Hangman has two roles and the payload differs by role:
 *
 * - **Setter** supplies the secret word (`word`).
 * - **Guesser** supplies one letter (`letter`).
 *
 * Both fields are optional in the schema; the adapter's grader enforces which one
 * is required, based on the seat's role, and explains the mismatch if wrong.
 */
export const HangmanAgentMoveSchema = z
  .object({
    word: z
      .string()
      .regex(/^[A-Za-z]{3,12}$/, 'word must be 3-12 letters A-Z')
      .optional()
      .describe(
        'SETTER only: the secret word, 3-12 letters, no spaces or punctuation. ' +
          'Omit this field entirely when you are the guesser.',
      ),
    letter: z
      .string()
      .regex(/^[A-Za-z]$/, 'letter must be exactly one character A-Z')
      .optional()
      .describe(
        'GUESSER only: a single letter not yet guessed. Omit this field entirely when you are the setter.',
      ),
  })
  .superRefine((val, ctx) => {
    const hasWord = typeof val.word === 'string';
    const hasLetter = typeof val.letter === 'string';
    if (!hasWord && !hasLetter) {
      ctx.addIssue({
        code: 'custom',
        message: 'Provide "word" when you are the setter, or "letter" when you are the guesser.',
        path: ['letter'],
      });
    }
    if (hasWord && hasLetter) {
      ctx.addIssue({
        code: 'custom',
        message: 'Provide only one of "word" (setter) or "letter" (guesser), not both.',
        path: ['word'],
      });
    }
  });

export type HangmanAgentMove = z.infer<typeof HangmanAgentMoveSchema>;
