/** One unrevealed letter in the secret word (server-side only). */

export function pickHangmanSafeLetter(word: string, guessedLetters: readonly string[]): string | null {
  const guessed = new Set(guessedLetters.map((l) => l.toUpperCase()));
  const letters = [...new Set(word.toUpperCase().split(''))].filter(
    (ch) => /^[A-Z]$/.test(ch) && !guessed.has(ch),
  );
  letters.sort();
  return letters[0] ?? null;
}
