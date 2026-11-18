import { describe, expect, test } from '@jest/globals';
import { computeBattleshipHuntLineHint } from '@/apps/battleship/shared/battleship-hunt-line-hint';
import type { BsShotMap } from '@/apps/battleship/back-end/rules';

describe('computeBattleshipHuntLineHint', () => {
  test('opening suggests a parity search cell', () => {
    const shots: BsShotMap = {};
    const hint = computeBattleshipHuntLineHint(shots);
    expect(hint).not.toBeNull();
    expect(hint!.kind).toBe('search');
    expect(hint!.row).toBe(0);
    expect(hint!.col).toBe(0);
  });

  test('returns an unshot hunt cell when hits exist', () => {
    const shots: BsShotMap = { '4,3': 'hit', '4,4': 'hit' };
    const hint = computeBattleshipHuntLineHint(shots);
    expect(hint?.kind).toBe('hunt');
    expect(`${hint!.row},${hint!.col}` in shots).toBe(false);
  });
});
