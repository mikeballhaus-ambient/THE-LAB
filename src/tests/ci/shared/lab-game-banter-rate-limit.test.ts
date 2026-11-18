import { shouldEmitBanter, clearBanterRateLimit } from '@/shared/game-platform/lab-assistant-banter/banter-rate-limit';

describe('lab-game-banter-rate-limit', () => {
  afterEach(() => {
    clearBanterRateLimit('m1');
  });

  test('allows back-to-back capture banter', () => {
    expect(shouldEmitBanter('m1', 'capture')).toBe(true);
    expect(shouldEmitBanter('m1', 'capture')).toBe(true);
  });

  test('throttles repeated slow_turn nudges', () => {
    expect(shouldEmitBanter('m1', 'slow_turn')).toBe(true);
    expect(shouldEmitBanter('m1', 'slow_turn')).toBe(false);
  });
});
