import {
  beginBilliardsRollSession,
  billiardsRollSessionIsActive,
  createBilliardsRollSessionState,
  endBilliardsRollSession,
  isBilliardsRollSessionCurrent,
} from '@/apps/billiards/shared/billiards-roll-session';

describe('billiards-roll-session', () => {
  test('superseded session is not current', () => {
    const state = createBilliardsRollSessionState();
    const first = beginBilliardsRollSession(state);
    const second = beginBilliardsRollSession(state);
    expect(isBilliardsRollSessionCurrent(state, first)).toBe(false);
    expect(isBilliardsRollSessionCurrent(state, second)).toBe(true);
  });

  test('out-of-order end is a no-op for unknown token', () => {
    const state = createBilliardsRollSessionState();
    const token = beginBilliardsRollSession(state);
    endBilliardsRollSession(state, token + 99);
    expect(billiardsRollSessionIsActive(state)).toBe(true);
    endBilliardsRollSession(state, token);
    expect(billiardsRollSessionIsActive(state)).toBe(false);
  });

  test('superseded session end does not clear active when newer session lives', () => {
    const state = createBilliardsRollSessionState();
    const first = beginBilliardsRollSession(state);
    beginBilliardsRollSession(state);
    endBilliardsRollSession(state, first);
    expect(billiardsRollSessionIsActive(state)).toBe(true);
  });
});
