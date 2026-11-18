import { lobbyMatchPracticeFromQuarksOptIn } from '@/shared/constants/lab-game-quarks-practice';

describe('lobby Quarks opt-in', () => {
  test('practice match when real-play checkbox is off', () => {
    expect(lobbyMatchPracticeFromQuarksOptIn(false)).toBe(true);
  });

  test('real ledger when real-play checkbox is on', () => {
    expect(lobbyMatchPracticeFromQuarksOptIn(true)).toBe(false);
  });
});
