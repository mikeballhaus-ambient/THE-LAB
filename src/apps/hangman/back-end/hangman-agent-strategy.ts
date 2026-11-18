import type { GameAgentDifficultyMechanics } from '@/shared/game-platform/difficulty-policy';
import type { GameDifficulty } from '@/shared/game-platform/types';

export const HANGMAN_STRATEGY_CORE = `HANGMAN FUNDAMENTALS (all tiers):
- Two roles: SETTER picks one secret word once; GUESSER reveals letters until the word is complete or strikes reach the limit.
- Setter word must satisfy length and alphabet rules in the tool contract; creative brief (when present) is mandatory.
- Guesser submits one letter per turn from the remaining alphabet list — never repeat a guessed letter.
- Wrong guesses cost strikes; conserve strikes on harder tiers by guessing high-probability letters first.`;

export const HANGMAN_GUESSER_STRATEGY_BY_TIER: GameAgentDifficultyMechanics = {
  easy: `GUESSER PLAY (easy):
- Start with common letters: E, A, R, I, O, T, N, S.
- Ignore advanced frequency tables — pick a common letter not yet guessed.
- Missing an optimal letter is acceptable.`,

  medium: `GUESSER PLAY (medium):
- Use pattern length: short words favor vowels; longer words mix vowels and common consonants (R, S, T, L, N).
- After vowels appear, guess consonants that fit common English digraphs (TH, ER, ON).
- Avoid rare letters (Q, X, Z) until few cells remain.`,

  hard: `GUESSER PLAY (hard):
- Rank remaining letters by how often they appear in English words of this length with the revealed pattern.
- Prefer letters that appear in multiple blank positions if the pattern allows.
- With few strikes left, guess letters that complete the most likely word family for the pattern.`,

  boss: `GUESSER PLAY (boss):
- Treat each guess as maximizing expected letters revealed given pattern + length + already guessed set.
- Use position constraints from the pattern (e.g. _ING, _TION, TH_).
- When two letters are close, pick the one that splits remaining possibilities more evenly (avoid wasting strikes).`,
};

export const HANGMAN_SETTER_STRATEGY_BY_TIER: GameAgentDifficultyMechanics = {
  easy: `SETTER PLAY (easy):
- Pick a common, familiar word that fits the brief — everyday vocabulary.
- Avoid obscure words; the human should often guess it with basic letters.`,

  medium: `SETTER PLAY (medium):
- Choose a word that fits the creative brief but uses less obvious letter combinations.
- Avoid words that are mostly vowels or single-syllable cvc patterns if the brief allows richer choices.`,

  hard: `SETTER PLAY (hard):
- Satisfy the brief with a word that uses less frequent letters while staying valid dictionary English.
- Prefer words without the most common opening letters (S, C, P) when variety token suggests freshness.`,

  boss: `SETTER PLAY (boss):
- Maximize difficulty within the brief: less common consonant clusters, longer words when allowed.
- Still must be a fair dictionary word — never invent or use proper nouns unless the brief asks for them.
- Match every constraint in the creative brief exactly before optimizing difficulty.`,
};

export const HANGMAN_GUESSER_USER_TURN_CHECKLIST: Partial<Record<'hard' | 'boss', string>> = {
  hard: `Turn checklist: list remaining letters → pick the most common English letter that fits the pattern and length.`,
  boss: `Turn checklist: rank remaining letters by pattern fit and frequency; submit the single best letter.`,
};

/** Short user-prompt tips (guesser). */
export const HANGMAN_GUESSER_TIER_TIPS: Record<GameDifficulty, string> = {
  easy: 'Guess common letters first (E, A, R, I, O, T).',
  medium: 'Guess letters that are likely given the revealed pattern.',
  hard: 'Guess the most probable letter given the pattern and word length.',
  boss: 'Guess the letter that maximises the chance of completing this word.',
};

/** Short user-prompt tips (setter). */
export const HANGMAN_SETTER_TIER_TIPS: Record<GameDifficulty, string> = {
  easy: 'Pick a common, fair word that fits the brief.',
  medium: 'Pick a word that fits the brief without being obscure.',
  hard: 'Pick a challenging but valid word that satisfies every brief constraint.',
  boss: 'Pick the hardest fair dictionary word that still matches the creative brief exactly.',
};
