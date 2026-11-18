import { describe, expect, test } from '@jest/globals';
import { hangmanAdapter, parseHangmanMove } from '@/apps/hangman/back-end/adapter';
import type { MatchCreateConfig } from '@/shared/game-platform/types';

describe('hangman adapter parseHangmanMove', () => {
  test('accepts typed and shorthand wire payloads', () => {
    expect(parseHangmanMove({ type: 'set', word: 'LAB' })).toEqual({ type: 'set', word: 'LAB' });
    expect(parseHangmanMove({ word: 'socket' })).toEqual({ type: 'set', word: 'SOCKET' });
    expect(parseHangmanMove({ type: 'guess', letter: 'z' })).toEqual({ type: 'guess', letter: 'Z' });
    expect(parseHangmanMove({ letter: 'm' })).toEqual({ type: 'guess', letter: 'M' });
  });

  test('rejects invalid words and letters', () => {
    expect(parseHangmanMove({ word: 'AB' })).toBeNull();
    expect(parseHangmanMove({ letter: 'AB' })).toBeNull();
    expect(parseHangmanMove({ word: 'LAB', letter: 'L' })).toBeNull();
  });
});

describe('hangman adapter match seats', () => {
  const baseConfig: MatchCreateConfig = {
    gameId: 'hangman',
    opponentKind: 'ai',
    difficulty: 'medium',
    player1Id: 1,
    player2Id: 0,
  };

  test('initialSeat is the setter so the AI can open when it chooses the word', () => {
    const draft = hangmanAdapter.createInitialState(baseConfig) as {
      setterSeat: number;
      guesserSeat: number;
    };
    expect(hangmanAdapter.initialSeat?.(draft)).toBe(draft.setterSeat);

    const settled = hangmanAdapter.createInitialState({
      ...baseConfig,
      startingSeat: draft.setterSeat,
    }) as { setterSeat: number; guesserSeat: number; wordSet: boolean };
    expect(settled.setterSeat).toBe(draft.setterSeat);
    expect(settled.guesserSeat).toBe(draft.guesserSeat);

    const afterSet = hangmanAdapter.applyMove(
      settled,
      { type: 'set', word: 'LAB' },
      settled.setterSeat,
    ) as { wordSet: boolean; guesserSeat: number };
    expect(
      hangmanAdapter.nextSeatAfterMove?.(
        settled,
        { type: 'set', word: 'LAB' },
        settled.setterSeat,
        afterSet,
      ),
    ).toBe(afterSet.guesserSeat);
  });

  test('nextSeatAfterMove keeps the guesser on letter guesses', () => {
    let state = hangmanAdapter.createInitialState({
      ...baseConfig,
      startingSeat: 1,
    }) as {
      setterSeat: number;
      guesserSeat: number;
      wordSet: boolean;
      result: string | null;
      guessedLetters: string[];
      strikes: number;
      word: string;
    };
    state = hangmanAdapter.applyMove(state, { type: 'set', word: 'LAB' }, 1) as typeof state;
    const afterGuess = hangmanAdapter.applyMove(state, { type: 'guess', letter: 'A' }, 2) as typeof state;
    expect(
      hangmanAdapter.nextSeatAfterMove?.(
        state,
        { type: 'guess', letter: 'A' },
        2,
        afterGuess,
      ),
    ).toBe(2);
  });
});
