import { describe, expect, jest, test } from '@jest/globals';
import {
  bumpSlowTurnBanterIdleTimer,
  registerSlowTurnBanterIdleBump,
} from '@/shared/game-platform/lab-assistant-banter/slow-turn-banter-idle-registry';

describe('slow-turn-banter-idle-registry', () => {
  test('bump invokes registered callback for match', () => {
    const bump = jest.fn();
    const unregister = registerSlowTurnBanterIdleBump('match-1', bump);
    bumpSlowTurnBanterIdleTimer('match-1');
    expect(bump).toHaveBeenCalledTimes(1);
    bumpSlowTurnBanterIdleTimer('other');
    expect(bump).toHaveBeenCalledTimes(1);
    unregister();
    bumpSlowTurnBanterIdleTimer('match-1');
    expect(bump).toHaveBeenCalledTimes(1);
  });
});
