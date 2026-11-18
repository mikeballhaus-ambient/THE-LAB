import {
  BILLIARDS_ACK_WATCHDOG_MS,
  serverShotsTakenAdvanced,
  shotAckClearsAfterStateAdvance,
} from '@/apps/billiards/shared/billiards-shot-ack';

describe('billiards-shot-ack', () => {
  test('watchdog interval is defined for slow server sim', () => {
    expect(BILLIARDS_ACK_WATCHDOG_MS).toBeGreaterThanOrEqual(8_000);
  });

  test('serverShotsTakenAdvanced when counter moves', () => {
    expect(serverShotsTakenAdvanced(3, 4)).toBe(true);
    expect(serverShotsTakenAdvanced(3, 3)).toBe(false);
  });

  test('shotAckClearsAfterStateAdvance when shotsTaken advances', () => {
    expect(shotAckClearsAfterStateAdvance(true, 3, 4)).toBe(true);
    expect(shotAckClearsAfterStateAdvance(true, 3, 3)).toBe(false);
    expect(shotAckClearsAfterStateAdvance(false, 3, 4)).toBe(false);
  });
});
