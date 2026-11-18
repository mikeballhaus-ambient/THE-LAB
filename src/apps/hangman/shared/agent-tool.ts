import {
  HANGMAN_SUBMIT_MOVE_TOOL_ID,
  HangmanAgentMoveSchema,
} from './hangman-agent-move-schema';

/**
 * Hangman's structural tool descriptor. Core registers it with
 * `registerStructuralToolFromApp()`; the schema stays app-owned.
 */
export const HANGMAN_AGENT_TOOL = {
  id: HANGMAN_SUBMIT_MOVE_TOOL_ID,
  description:
    'Submit your Hangman move: exactly one letter. As guesser, choose a letter not yet guessed; ' +
    'as setter, submit a letter of the secret word you chose.',
  params: HangmanAgentMoveSchema,
} as const;

/** Purpose suffix scoping this tool to Hangman agent turns. */
export const HANGMAN_AGENT_PURPOSE_SUFFIX = '.hangman.agent-turn';
