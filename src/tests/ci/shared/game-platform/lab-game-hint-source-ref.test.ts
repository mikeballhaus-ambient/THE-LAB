import { describe, expect, test } from '@jest/globals';
import {
  buildBilliardsShotPathHintSourceRef,
  buildLabGameHintSourceRef,
} from '@/shared/game-platform/lab-game-hint-source-ref';

describe('buildLabGameHintSourceRef', () => {
  test('encodes host sku match and turn', () => {
    expect(
      buildLabGameHintSourceRef({
        hostAppId: 'app-chess',
        skuId: 'win-block',
        matchId: 'm-9',
        turnKey: '3:1',
      }),
    ).toBe('hint:app-chess:win-block:match:m-9:turn:3:1');
  });
});

describe('buildBilliardsShotPathHintSourceRef', () => {
  test('encodes match seat and shot attempt', () => {
    expect(
      buildBilliardsShotPathHintSourceRef({
        matchId: 'm-1',
        seat: 2,
        shotAttempt: 3,
      }),
    ).toBe('hint:app-billiards:shot-path:match:m-1:turn:2:shot:3');
  });
});
