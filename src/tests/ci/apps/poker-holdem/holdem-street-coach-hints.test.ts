import { describe, expect, test } from '@jest/globals';
import { holdemStreetCoachHints } from '@/apps/poker-holdem/front-end/utils/holdem-street-coach-hints';

describe('holdemStreetCoachHints', () => {
  test('returns pot odds and hand strength cards', () => {
    const hints = holdemStreetCoachHints({
      holeCards: [
        { rank: 'A', suit: 's' },
        { rank: 'K', suit: 'h' },
      ],
      boardCards: [
        { rank: 'Q', suit: 'd' },
        { rank: 'J', suit: 'c' },
        { rank: '2', suit: 's' },
      ],
      toCall: 50,
      pot: 150,
    });
    expect(hints).toHaveLength(2);
    expect(hints[0]?.id).toBe('street-coach-odds');
    expect(hints[1]?.id).toBe('street-coach-strength');
    expect(hints[0]?.title).toContain('Pot odds');
  });
});
