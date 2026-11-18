import { createTurnBasedAdapter } from '@/shared/game-platform/create-adapter';
import { withCatalogMatchWager } from '@/shared/game-platform/catalog-match-wager';
import { DEFAULT_AGENT_LLM_SAMPLING, agentTemperature } from '@/shared/game-platform/difficulty-policy';
import type { GameServerAdapter } from '@/shared/game-platform/types';
import { HANGMAN_SUBMIT_MOVE_TOOL_ID } from '../shared/hangman-agent-move-schema';
import {
  attemptNote,
  buildSystemPrompt,
  buildUserPrompt,
  gradeAgentMove,
  HANGMAN_SETTER_WORD_TEMPERATURE,
  retryUserHint,
  toolResultHint,
} from './agent';
import { HANGMAN_GAME_IDS } from './catalog';
import {
  HANGMAN_MAX_STRIKES,
  alphabetForWord,
  createHangmanState,
  HANGMAN_AI_SEAT,
  isAiSetterWordTurn,
  isWon,
  isValidWord,
  normalizeWordInput,
  validateWordAgainstSetterChallenge,
  type HangmanState,
} from './rules';

const PURPOSE = 'hangman.hangman.agent-turn';

const SYSTEM_PROMPT = `You are playing Hangman as the guesser.

Reply with ONLY one letter, A-Z. Do not explain, do not repeat a letter you
already guessed.`;

export interface HangmanMove {
  type: 'guess' | 'set';
  letter?: string;
  word?: string;
}

export function parseHangmanMove(move: unknown): HangmanMove | null {
  if (!move || typeof move !== 'object') return null;
  const m = move as { type?: unknown; letter?: unknown; word?: unknown };

  const hasWord = typeof m.word === 'string' && m.word.length > 0;
  const hasLetter = typeof m.letter === 'string' && m.letter.length > 0;

  if (m.type === 'set' || (hasWord && !hasLetter && m.type !== 'guess')) {
    if (typeof m.word !== 'string') return null;
    const word = normalizeWordInput(m.word);
    return isValidWord(word) ? { type: 'set', word } : null;
  }
  if (m.type === 'guess' || (hasLetter && !hasWord && m.type !== 'set')) {
    if (typeof m.letter !== 'string') return null;
    const letter = m.letter.toUpperCase();
    return /^[A-Z]$/.test(letter) ? { type: 'guess', letter } : null;
  }
  return null;
}


/** First unused A-Z letter in the reply. */
function parseLetterReply(content: string, state: HangmanState): HangmanMove | null {
  const available = new Set(
    alphabetForWord().filter((l) => !state.guessedLetters.includes(l)),
  );
  for (const match of content.toUpperCase().matchAll(/[A-Z]/g)) {
    if (available.has(match[0])) return { type: 'guess', letter: match[0] };
  }
  return null;
}

const hangmanTurnBased = createTurnBasedAdapter<HangmanState, HangmanMove>({
  gameId: HANGMAN_GAME_IDS.HANGMAN,
  rules: {
    createInitialState: (config) => {
      const startingSeat = config.startingSeat;
      const aiSetterChallenge =
        config.opponentKind === 'ai' &&
        startingSeat != null &&
        startingSeat === HANGMAN_AI_SEAT;
      return createHangmanState({
        ...(startingSeat != null ? { startingSeat } : {}),
        aiSetterChallenge,
      });
    },
    parseMove: (move) => parseHangmanMove(move),
    validate: (state, move, seat) => {
      if (state.result !== null) return { ok: false, error: 'Match is already finished' };
      if (move.type === 'set') {
        if (seat !== state.setterSeat) return { ok: false, error: 'Only the setter chooses the word' };
        if (state.wordSet) return { ok: false, error: 'Word already set' };
        const word = move.word ?? '';
        if (state.setterChallenge && seat === HANGMAN_AI_SEAT) {
          const challengeError = validateWordAgainstSetterChallenge(word, state.setterChallenge);
          if (challengeError) return { ok: false, error: challengeError };
        }
        return { ok: true };
      }
      if (seat !== state.guesserSeat) return { ok: false, error: 'Only the guesser guesses' };
      if (!state.wordSet) return { ok: false, error: 'Word has not been set yet' };
      if (!move.letter) return { ok: false, error: 'Missing letter' };
      if (state.guessedLetters.includes(move.letter)) {
        return { ok: false, error: `Letter ${move.letter} was already guessed` };
      }
      return { ok: true };
    },
    apply: (state, move) => {
      if (move.type === 'set') {
        return { ...state, word: move.word ?? '', wordSet: true };
      }
      const letter = move.letter as string;
      const guessed = [...state.guessedLetters, letter];
      const hit = state.word.includes(letter);
      const strikes = hit ? state.strikes : state.strikes + 1;
      let result = state.result;
      if (isWon(state.word, guessed)) result = 'guesser-won';
      else if (strikes >= HANGMAN_MAX_STRIKES) result = 'setter-won';
      return { ...state, guessedLetters: guessed, strikes, result };
    },
    scores: (state) => ({ [state.guesserSeat]: state.guessedLetters.length, [state.setterSeat]: state.strikes }),
    isFinished: (state) => state.result !== null,
    winnerSeat: (state) =>
      state.result === 'guesser-won'
        ? state.guesserSeat
        : state.result === 'setter-won'
          ? state.setterSeat
          : null,
    onTimeout: (state) => state,
    summarizeMove: (move) =>
      move.type === 'set' ? `Set a ${move.word?.length ?? 0}-letter word` : `Guessed ${move.letter}`,
  },
  agent: {
    purpose: PURPOSE,
    systemPrompt: SYSTEM_PROMPT,
    // Role-aware prompt: setter and guesser see different contracts.
    systemPromptFor: (difficulty) => buildSystemPrompt(difficulty, 'guesser'),
    buildUserPrompt: (state, seat, difficulty, retry) =>
      buildUserPrompt(state, seat, difficulty, { lastRejection: retry?.lastRejection }),
    parseAgentReply: (content, state) => parseLetterReply(content, state),
    temperatureFor: agentTemperature,
    resolveTemperature: (state, playerSeat, difficulty) => {
      if (isAiSetterWordTurn(state, playerSeat)) {
        return HANGMAN_SETTER_WORD_TEMPERATURE[difficulty];
      }
      return undefined;
    },
    resolveSystemPrompt: (state, playerSeat, difficulty) => {
      if (isAiSetterWordTurn(state, playerSeat)) {
        return buildSystemPrompt(difficulty, 'setter');
      }
      return undefined;
    },

    structuralTool: {
      id: HANGMAN_SUBMIT_MOVE_TOOL_ID,
      sampling: DEFAULT_AGENT_LLM_SAMPLING,
      grade: (raw, state, seat) => gradeAgentMove(raw, state, seat),
      toolResultHint,
      retryUserHint,
      attemptNote,
      limits: { maxApiRounds: 8, maxStructuralRounds: 3, feedbackWindow: 4 },
    },
  },
});

/** Opening seat is the setter; guesser keeps the turn after each letter guess. */
const hangmanAdapterCore: GameServerAdapter = {
  ...hangmanTurnBased,
  initialSeat(state) {
    return (state as HangmanState).setterSeat;
  },
  nextSeatAfterMove(_state, _move, _moverSeat, appliedState) {
    const s = appliedState as HangmanState;
    if (s.result !== null) {
      return null;
    }
    if (!s.wordSet) {
      return s.setterSeat;
    }
    return s.guesserSeat;
  },
};

export const hangmanAdapter: GameServerAdapter = withCatalogMatchWager(hangmanAdapterCore, {
  gameLabel: 'Hangman',
});
