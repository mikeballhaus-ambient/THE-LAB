/** Hex colors for Three.js ball materials (matches billiard-ball-visual solids). */
export const BILLIARDS_BALL_HEX: Readonly<Record<number, string>> = {
  0: '#f2f2f2',
  1: '#E8C400',
  2: '#1B6FB8',
  3: '#C41E1E',
  4: '#5E2D8C',
  5: '#E85C00',
  6: '#0B6B3A',
  7: '#7B1313',
  8: '#1a1a1a',
  9: '#E8C400',
  10: '#1B6FB8',
  11: '#C41E1E',
  12: '#5E2D8C',
  13: '#E85C00',
  14: '#0B6B3A',
  15: '#7B1313',
};

export function billiardsBallHex(number: number): string {
  return BILLIARDS_BALL_HEX[number] ?? '#888888';
}

export function isStripeBall(number: number): boolean {
  return number >= 9 && number <= 15;
}
