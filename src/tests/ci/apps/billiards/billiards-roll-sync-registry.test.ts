import {
  emitBilliardsRollFrame,
  registerBilliardsRollFrameSyncConsumer,
} from '@/apps/billiards/shared/billiards-roll-sync';
import type { BilliardsBall } from '@/apps/billiards/shared/billiards-types';

describe('billiards-roll-sync registry', () => {
  test('unregistering one consumer does not clear another', () => {
    const callsA: number[] = [];
    const callsB: number[] = [];
    const ball: BilliardsBall = { id: 'cue', number: 0, x: 1, y: 1, pocketed: false };
    const unregisterA = registerBilliardsRollFrameSyncConsumer((balls) => {
      callsA.push(balls.length);
    });
    const unregisterB = registerBilliardsRollFrameSyncConsumer((balls) => {
      callsB.push(balls.length);
    });
    emitBilliardsRollFrame([ball], []);
    unregisterA();
    emitBilliardsRollFrame([ball], []);
    unregisterB();
    expect(callsA).toEqual([1]);
    expect(callsB).toEqual([1, 1]);
  });
});
