import type { PlatformLlmToolFeedbackTurn } from '@/shared/types/platform-llm-completion';
import type { GameDifficulty } from '@/shared/game-platform/types';
import { agentDifficultyLine, buildAgentSystemPrompt } from '@/shared/game-platform/difficulty-policy';
import {
  HANGMAN_SUBMIT_MOVE_TOOL_ID,
  HangmanAgentMoveSchema,
} from '../shared/hangman-agent-move-schema';
import {
  HANGMAN_MAX_LENGTH,
  HANGMAN_MAX_STRIKES,
  HANGMAN_MIN_LENGTH,
  alphabetForWord,
  describeSetterChallengeForAgent,
  displayPattern,
  isValidWord,
  type HangmanSeat,
  type HangmanState,
  validateWordAgainstSetterChallenge,
} from './rules';
import {
  HANGMAN_GUESSER_STRATEGY_BY_TIER,
  HANGMAN_GUESSER_TIER_TIPS,
  HANGMAN_GUESSER_USER_TURN_CHECKLIST,
  HANGMAN_SETTER_STRATEGY_BY_TIER,
  HANGMAN_SETTER_TIER_TIPS,
  HANGMAN_STRATEGY_CORE,
} from './hangman-agent-strategy';

/**
 * Hangman's agent surface.
 *
 * Roles are per-match: one seat sets the word, the other guesses letters. The
 * payload therefore differs by role — `{word}` for the setter, `{letter}` for the
 * guesser — and both the prompt and the grader branch on it.
 */


const AGENT_ROLE = 'You are a Hangman opponent.';

/** Higher than guesser tiers so setter word choice varies match to match. */
export const HANGMAN_SETTER_WORD_TEMPERATURE: Record<GameDifficulty, number> = {
  easy: 0.82,
  medium: 0.72,
  hard: 0.62,
  boss: 0.55,
};

export type HangmanRole = 'setter' | 'guesser';

export type HangmanAgentResult =
  | { type: 'set'; word: string }
  | { type: 'guess'; letter: string };

export function roleFor(state: HangmanState, seat: number): HangmanRole {
  return state.setterSeat === (seat as HangmanSeat) ? 'setter' : 'guesser';
}

const COMMON_CONTRACT = `OUTPUT CONTRACT (required every turn):
- Call the tool \`${HANGMAN_SUBMIT_MOVE_TOOL_ID}\` exactly once. Put the payload ONLY in the
  tool arguments — never in assistant text.
- If a previous attempt was rejected, the reason is given below — do not repeat it.`;

function contractFor(role: HangmanRole): string {
  if (role === 'setter') {
    return `${COMMON_CONTRACT}
- You are the SETTER: submit {"word": "<your secret word>"}.
- The word must be ${HANGMAN_MIN_LENGTH}-${HANGMAN_MAX_LENGTH} letters, A-Z only, no spaces.
- It is submitted once, at the start of the match — never leak it in text.`;
  }
  return `${COMMON_CONTRACT}
- You are the GUESSER: submit {"letter": "<A-Z>"}.
- The letter must not already appear in the pattern and must not have been guessed.
- A wrong guess costs a strike; ${HANGMAN_MAX_STRIKES} strikes loses the match.`;
}

export function buildUserPrompt(
  state: HangmanState,
  seat: number,
  difficulty: GameDifficulty,
  options?: { lastRejection?: string },
): string {
  const role = roleFor(state, seat);
  const tierTips = role === 'setter' ? HANGMAN_SETTER_TIER_TIPS : HANGMAN_GUESSER_TIER_TIPS;
  const lines = [
    agentDifficultyLine(difficulty, tierTips),
    '',
    `You are seat ${seat} and you are the ${role.toUpperCase()}.`,
  ];

  if (role === 'setter') {
    lines.push(
      '',
      state.wordSet
        ? 'You have already submitted the secret word for this match.'
        : 'The match needs a secret word from you before guessing can begin.',
    );
    if (state.setterChallenge) {
      lines.push(
        '',
        'CREATIVE BRIEF (required — your word must satisfy all of this):',
        describeSetterChallengeForAgent(state.setterChallenge),
        `Match variety token: ${state.varietyNonce} — treat it as a seed to pick a fresh word you have not used before.`,
        'Think of a real dictionary word that fits; do not explain your reasoning in text.',
      );
    } else {
      lines.push(
        '',
        `Submit any common English word (${HANGMAN_MIN_LENGTH}-${HANGMAN_MAX_LENGTH} letters, A–Z only).`,
      );
    }
  } else {
    const pattern = state.word ? displayPattern(state.word, state.guessedLetters) : '(not set yet)';
    const remaining = alphabetForWord().filter(
      (l) => !state.guessedLetters.includes(l),
    );
    lines.push(
      '',
      `Word so far: ${pattern}`,
      `Word length: ${state.word ? state.word.length : 'not yet set'}.`,
      `Letters already guessed: ${state.guessedLetters.length ? state.guessedLetters.join(' ') : '(none)'}`,
      `Strikes: ${state.strikes} of ${HANGMAN_MAX_STRIKES}.`,
      `Remaining letters you may guess: ${remaining.length ? remaining.join(' ') : '(none)'}`,
    );
  }

  if (options?.lastRejection) {
    lines.push('', `Your previous attempt was REJECTED: ${options.lastRejection}`);
  }

  if (
    role === 'guesser' &&
    (difficulty === 'hard' || difficulty === 'boss') &&
    HANGMAN_GUESSER_USER_TURN_CHECKLIST[difficulty]
  ) {
    lines.push('', HANGMAN_GUESSER_USER_TURN_CHECKLIST[difficulty]!);
  }

  lines.push('', contractFor(role));
  return lines.join('\n');
}

/** Assembled system prompt for a tier and role. */
export function buildSystemPrompt(
  difficulty: GameDifficulty,
  role: HangmanRole = 'guesser',
): string {
  return buildAgentSystemPrompt({
    baseRules: `${AGENT_ROLE} You are the ${role.toUpperCase()} this match.\n\n${contractFor(role)}\n\n${HANGMAN_STRATEGY_CORE}`,
    difficulty,
    gameMechanicsByTier:
      role === 'setter' ? HANGMAN_SETTER_STRATEGY_BY_TIER : HANGMAN_GUESSER_STRATEGY_BY_TIER,
  });
}

/** Grade a payload; throws with a model-facing reason when it is wrong. */
export function gradeAgentMove(raw: unknown, state: HangmanState, seat: number): HangmanAgentResult {
  const parsed = HangmanAgentMoveSchema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new Error(`Invalid arguments: ${issue?.message ?? 'provide "word" or "letter".'}`);
  }
  const role = roleFor(state, seat);
  const { word, letter } = parsed.data;

  if (state.result !== null) {
    throw new Error('The round is already over — no further moves are needed.');
  }

  if (role === 'setter') {
    if (state.wordSet) {
      throw new Error('The word has already been set for this match.');
    }
    if (!word) {
      return throwRoleMismatch('setter');
    }
    const normalized = word.toUpperCase();
    if (!isValidWord(normalized)) {
      return throwInvalidWord(normalized);
    }
    if (state.setterChallenge) {
      const challengeError = validateWordAgainstSetterChallenge(normalized, state.setterChallenge);
      if (challengeError) {
        throw new Error(challengeError);
      }
    }
    return { type: 'set', word: normalized };
  }

  if (!state.wordSet) {
    throw new Error('The setter has not chosen a word yet — you cannot guess.');
  }
  if (!letter) {
    return throwRoleMismatch('guesser');
  }
  const upper = letter.toUpperCase();
  if (state.guessedLetters.includes(upper)) {
    const remaining = alphabetForWord().filter(
      (l) => !state.guessedLetters.includes(l),
    );
    throw new Error(
      `"${upper}" has already been guessed. Remaining letters: ${remaining.join(' ')}.`,
    );
  }
  return { type: 'guess', letter: upper };
}

function throwRoleMismatch(role: HangmanRole): never {
  throw new Error(
    role === 'setter'
      ? 'You are the SETTER this match — submit {"word": "<secret word>"}, not a letter.'
      : 'You are the GUESSER this match — submit {"letter": "<A-Z>"}, not a word.',
  );
}

function throwInvalidWord(word: string): never {
  throw new Error(
    `"${word}" is not a valid secret word: use ${HANGMAN_MIN_LENGTH}-${HANGMAN_MAX_LENGTH} letters A-Z with no spaces or punctuation.`,
  );
}

/** Model-facing hint appended to a rejected tool result. */
export function toolResultHint(error: string): string | undefined {
  if (error.includes('already been guessed')) {
    return 'Pick a letter from the "Remaining letters" list in the first user message.';
  }
  if (error.includes('SETTER')) {
    return 'Your payload this match is {"word": "..."} — a single secret word.';
  }
  if (error.includes('GUESSER')) {
    return 'Your payload this match is {"letter": "..."} — one letter.';
  }
  if (error.includes('already been set')) {
    return 'The word is submitted once per match; guessing now follows.';
  }
  return 'Submit the payload for your role; board and turn are unchanged.';
}

/** Extra nudge on retry. */
export function retryUserHint(context: {
  lastRejection: string;
  priorTurns: readonly PlatformLlmToolFeedbackTurn[];
}): string {
  return (
    `Attempt ${context.priorTurns.length + 1} rejected: ${context.lastRejection} ` +
    'Correct the payload for your role and submit again.'
  );
}

/** Player-facing note while the AI is thinking. */
export function attemptNote(_toolArguments: string, error: string): string {
  return `Tried an illegal move — ${error}`;
}
