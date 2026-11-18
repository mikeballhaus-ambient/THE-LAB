/**
 * Hangman rules — pure word handling and turn state for a two-seat match.
 *
 * One seat is the setter (picks the word), the other is the guesser. Roles are
 * assigned at match creation and never swap mid-game.
 */

export type HangmanSeat = 1 | 2;
export type HangmanResult = 'guesser-won' | 'setter-won' | null;

/** Random creative constraint — **AI setter only** (vs human matches). */
export type HangmanSetterChallenge =
  | { kind: 'starts-with'; letter: string; minLength: number; maxLength: number }
  | { kind: 'exact-length'; letter: string; length: number }
  | { kind: 'contains'; letter: string; minLength: number; maxLength: number }
  | { kind: 'ends-with'; letter: string; minLength: number; maxLength: number };

export interface HangmanState {
  setterSeat: HangmanSeat;
  guesserSeat: HangmanSeat;
  /** Empty until the setter submits — never leak it before then. */
  word: string;
  wordSet: boolean;
  guessedLetters: string[];
  strikes: number;
  result: HangmanResult;
  /** Per-match entropy in AI setter prompts (breaks identical LM completions). */
  varietyNonce: string;
  /** Present only when seat 2 (AI) is the word setter in a vs-AI match. */
  setterChallenge?: HangmanSetterChallenge;
}

export const HANGMAN_MIN_LENGTH = 3;
export const HANGMAN_MAX_LENGTH = 12;
export const HANGMAN_MAX_STRIKES = 6;

function toSeat(value: number): HangmanSeat {
  return value === 2 ? 2 : 1;
}

/** Coin flip between seat 1 and seat 2. */
export function pickSetterSeat(random: () => number = Math.random): HangmanSeat {
  return toSeat(random() < 0.5 ? 1 : 2);
}

/** Short id mixed into setter LLM prompts so back-to-back matches are not identical. */
export function createVarietyNonce(random: () => number = Math.random): string {
  const a = Math.floor(random() * 1_000_000_000).toString(36);
  const b = Math.floor(random() * 1_000_000_000).toString(36);
  return `${a}${b}`.slice(0, 12);
}

function pickLetter(random: () => number): string {
  return alphabetForWord()[Math.floor(random() * 26)] ?? 'A';
}

function pickLengthRange(random: () => number): { minLength: number; maxLength: number } {
  const minLength =
    HANGMAN_MIN_LENGTH + Math.floor(random() * (HANGMAN_MAX_LENGTH - HANGMAN_MIN_LENGTH - 1));
  const span = 1 + Math.floor(random() * 4);
  const maxLength = Math.min(HANGMAN_MAX_LENGTH, minLength + span);
  return { minLength, maxLength };
}

/** One random brief the setter (and AI prompt) must satisfy. */
export function createSetterChallenge(random: () => number = Math.random): HangmanSetterChallenge {
  const roll = random();
  const letter = pickLetter(random);
  if (roll < 0.28) {
    const length =
      HANGMAN_MIN_LENGTH +
      Math.floor(random() * (HANGMAN_MAX_LENGTH - HANGMAN_MIN_LENGTH + 1));
    return { kind: 'exact-length', letter, length };
  }
  if (roll < 0.52) {
    const { minLength, maxLength } = pickLengthRange(random);
    return { kind: 'starts-with', letter, minLength, maxLength };
  }
  if (roll < 0.76) {
    const { minLength, maxLength } = pickLengthRange(random);
    let contains = pickLetter(random);
    while (contains === letter && random() > 0.05) {
      contains = pickLetter(random);
    }
    return { kind: 'contains', letter: contains, minLength, maxLength };
  }
  const { minLength, maxLength } = pickLengthRange(random);
  return { kind: 'ends-with', letter, minLength, maxLength };
}

/** Human-readable constraint for UI. */
export function describeSetterChallenge(challenge: HangmanSetterChallenge): string {
  switch (challenge.kind) {
    case 'exact-length':
      return `Pick a word that starts with ${challenge.letter} and is exactly ${challenge.length} letters.`;
    case 'starts-with':
      return `Pick a word starting with ${challenge.letter}, ${challenge.minLength}–${challenge.maxLength} letters.`;
    case 'contains':
      return `Pick a word that includes ${challenge.letter}, ${challenge.minLength}–${challenge.maxLength} letters.`;
    case 'ends-with':
      return `Pick a word ending in ${challenge.letter}, ${challenge.minLength}–${challenge.maxLength} letters.`;
    default:
      return 'Pick a secret word (3–12 letters, A–Z).';
  }
}

/** Model-facing creative brief (same rules, more imperative). */
export function describeSetterChallengeForAgent(challenge: HangmanSetterChallenge): string {
  switch (challenge.kind) {
    case 'exact-length':
      return `Derive a common English word that STARTS with "${challenge.letter}" and has EXACTLY ${challenge.length} letters (A–Z only). Do not reuse a word from a prior match.`;
    case 'starts-with':
      return `Derive a common English word that STARTS with "${challenge.letter}" and has between ${challenge.minLength} and ${challenge.maxLength} letters inclusive.`;
    case 'contains':
      return `Derive a common English word that CONTAINS the letter "${challenge.letter}" (any position), ${challenge.minLength}–${challenge.maxLength} letters long.`;
    case 'ends-with':
      return `Derive a common English word that ENDS with "${challenge.letter}", ${challenge.minLength}–${challenge.maxLength} letters long.`;
    default:
      return 'Derive a common English hangman word, 3–12 letters.';
  }
}

/** Returns an error message when the word fails the match challenge. */
export function validateWordAgainstSetterChallenge(
  rawWord: string,
  challenge: HangmanSetterChallenge,
): string | null {
  const word = normalizeWordInput(rawWord);
  if (!isValidWord(word)) {
    return `"${word}" must be ${HANGMAN_MIN_LENGTH}-${HANGMAN_MAX_LENGTH} letters A–Z.`;
  }
  switch (challenge.kind) {
    case 'exact-length':
      if (word[0] !== challenge.letter) {
        return `Word must start with ${challenge.letter}, not ${word[0] ?? '?'}.`;
      }
      if (word.length !== challenge.length) {
        return `Word must be exactly ${challenge.length} letters (got ${word.length}).`;
      }
      break;
    case 'starts-with':
      if (word[0] !== challenge.letter) {
        return `Word must start with ${challenge.letter}.`;
      }
      if (word.length < challenge.minLength || word.length > challenge.maxLength) {
        return `Word must be ${challenge.minLength}-${challenge.maxLength} letters (got ${word.length}).`;
      }
      break;
    case 'contains':
      if (!word.includes(challenge.letter)) {
        return `Word must contain the letter ${challenge.letter}.`;
      }
      if (word.length < challenge.minLength || word.length > challenge.maxLength) {
        return `Word must be ${challenge.minLength}-${challenge.maxLength} letters (got ${word.length}).`;
      }
      break;
    case 'ends-with':
      if (!word.endsWith(challenge.letter)) {
        return `Word must end with ${challenge.letter}.`;
      }
      if (word.length < challenge.minLength || word.length > challenge.maxLength) {
        return `Word must be ${challenge.minLength}-${challenge.maxLength} letters (got ${word.length}).`;
      }
      break;
    default:
      break;
  }
  return null;
}

export function isAiSetterWordTurn(state: HangmanState, playerSeat: number): boolean {
  return (
    state.setterSeat === (playerSeat as HangmanSeat) &&
    !state.wordSet &&
    Boolean(state.setterChallenge)
  );
}

/** Seat used for the AI opponent in vs-AI matches (platform convention). */
export const HANGMAN_AI_SEAT: HangmanSeat = 2;

/** Fresh match: roles assigned, word withheld until the setter submits. */
export function createHangmanState(options?: {
  random?: () => number;
  startingSeat?: number | null;
  varietyNonce?: string;
  /** Attach a creative brief for the AI setter LLM only. */
  aiSetterChallenge?: boolean;
}): HangmanState {
  const random = options?.random ?? Math.random;
  const setterSeat =
    options?.startingSeat != null
      ? toSeat(options.startingSeat)
      : pickSetterSeat(random);

  return {
    setterSeat,
    guesserSeat: setterSeat === 1 ? 2 : 1,
    word: '',
    wordSet: false,
    guessedLetters: [],
    strikes: 0,
    result: null,
    varietyNonce: options?.varietyNonce ?? createVarietyNonce(random),
    ...(options?.aiSetterChallenge ? { setterChallenge: createSetterChallenge(random) } : {}),
  };
}

/** Uppercases and strips everything outside A–Z (spaces and punctuation included). */
export function normalizeWordInput(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z]/g, '');
}

/** A playable word is 3–12 letters long after normalisation. */
export function isValidWord(raw: string): boolean {
  const word = normalizeWordInput(raw);
  return word.length >= HANGMAN_MIN_LENGTH && word.length <= HANGMAN_MAX_LENGTH;
}

/** The 26-letter alphabet the guesser picks from. */
export function alphabetForWord(): string[] {
  return 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
}

/** `_ _ _ _ _ _` form, revealing only already-guessed letters. */
export function displayPattern(word: string, guessedLetters: readonly string[]): string {
  const guessed = new Set(guessedLetters.map((l) => l.toUpperCase()));
  return word
    .toUpperCase()
    .split('')
    .map((ch) => (guessed.has(ch) ? ch : '_'))
    .join(' ');
}

/** True once every distinct letter of the word has been guessed. */
export function isWon(word: string, guessedLetters: readonly string[]): boolean {
  const guessed = new Set(guessedLetters.map((l) => l.toUpperCase()));
  const letters = new Set(word.toUpperCase().split(''));
  if (letters.size === 0) return false;
  return [...letters].every((ch) => guessed.has(ch));
}
