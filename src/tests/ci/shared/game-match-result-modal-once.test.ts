import { describe, expect, test } from '@jest/globals';
import { useGameMatchResultModalOnce } from '@/shared/game-platform/composables/useGameMatchResultModalOnce';

describe('useGameMatchResultModalOnce', () => {
  test('beginShow allows once per match id', () => {
    const guard = useGameMatchResultModalOnce();
    expect(guard.beginShow('m1')).toBe(true);
    expect(guard.beginShow('m1')).toBe(false);
    expect(guard.beginShow('m2')).toBe(true);
  });

  test('onMatchIdChange resets when match changes', () => {
    const guard = useGameMatchResultModalOnce();
    expect(guard.beginShow('m1')).toBe(true);
    guard.onMatchIdChange('m2', 'm1');
    expect(guard.beginShow('m1')).toBe(true);
  });
});
