import { describe, expect, test } from '@jest/globals';
import {
  alphabetForWord,
  createHangmanState,
  displayPattern,
  isWon,
  isValidWord,
  normalizeWordInput,
  pickSetterSeat,
  validateWordAgainstSetterChallenge,
} from '@/apps/hangman/back-end/rules';

describe('hangman rules', () => {
  test('setter seat is random (both roles occur across many draws)', () => {
    const seen = new Set<number>();
    for (let i = 0; i < 200; i++) {
      seen.add(pickSetterSeat());
    }
    expect(seen.has(1)).toBe(true);
    expect(seen.has(2)).toBe(true);
  });

  test('createHangmanState randomizes roles and leaves the word unset', () => {
    for (const seed of [0, 0.25, 0.5, 0.75, 0.99]) {
      const state = createHangmanState({ random: () => seed });
      expect(state.guesserSeat).toBe(state.setterSeat === 1 ? 2 : 1);
      expect(state.word).toBe('');
      expect(state.wordSet).toBe(false);
      expect(state.strikes).toBe(0);
      expect(state.result).toBeNull();
      expect(state.varietyNonce.length).toBeGreaterThan(0);
    }
  });

  test('a provided startingSeat is honored (setter = that seat)', () => {
    expect(createHangmanState({ startingSeat: 2 }).setterSeat).toBe(2);
    expect(createHangmanState({ startingSeat: 1 }).setterSeat).toBe(1);
  });

  test('normalizeWordInput + isValidWord enforce 3â€“12 letters Aâ€“Z', () => {
    expect(normalizeWordInput(' react! ')).toBe('REACT');
    expect(isValidWord('REACT')).toBe(true);
    expect(isValidWord('AB')).toBe(false);
    expect(isValidWord('ABCDEFGHIJKLM')).toBe(false);
    expect(normalizeWordInput('hello world')).toBe('HELLOWORLD');
  });

  test('alphabet covers all 26 letters regardless of the word', () => {
    expect(new Set(alphabetForWord()).size).toBe(26);
  });

  test('the word stays hidden until its letters are guessed, then win is detected', () => {
    const word = 'SOCKET';
    expect(displayPattern(word, [])).toBe('_ _ _ _ _ _');
    expect(isWon(word, [])).toBe(false);
    expect(isWon(word, ['S', 'O', 'C', 'K', 'E', 'T'])).toBe(true);
    expect(displayPattern(word, ['O'])).toBe('_ O _ _ _ _');
  });

  test('validateWordAgainstSetterChallenge enforces creative brief', () => {
    const challenge = {
      kind: 'starts-with' as const,
      letter: 'M',
      minLength: 5,
      maxLength: 8,
    };
    expect(validateWordAgainstSetterChallenge('MANGO', challenge)).toBeNull();
    expect(validateWordAgainstSetterChallenge('BANANA', challenge)).toMatch(/start with M/i);
    expect(validateWordAgainstSetterChallenge('MAP', challenge)).toMatch(/5-8 letters/i);
  });

  test('createHangmanState includes varietyNonce; challenge only when aiSetterChallenge', () => {
    const plain = createHangmanState({ random: () => 0.42 });
    expect(plain.varietyNonce.length).toBeGreaterThan(0);
    expect(plain.setterChallenge).toBeUndefined();

    const ai = createHangmanState({ random: () => 0.42, aiSetterChallenge: true });
    expect(ai.setterChallenge?.kind).toBeTruthy();
  });
});
