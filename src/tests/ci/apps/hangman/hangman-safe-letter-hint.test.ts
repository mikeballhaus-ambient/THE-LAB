import { pickHangmanSafeLetter } from '@/apps/hangman/back-end/hangman-safe-letter-hint';

describe('pickHangmanSafeLetter', () => {
  test('returns first unrevealed letter alphabetically', () => {
    expect(pickHangmanSafeLetter('CHESS', ['C', 'H'])).toBe('E');
  });

  test('returns null when all letters guessed', () => {
    expect(pickHangmanSafeLetter('A', ['A'])).toBeNull();
  });
});
