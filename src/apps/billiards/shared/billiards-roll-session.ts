export type BilliardsRollSessionToken = number;

export interface BilliardsRollSessionState {
  currentToken: BilliardsRollSessionToken;
  activeTokens: Set<BilliardsRollSessionToken>;
}

export function createBilliardsRollSessionState(): BilliardsRollSessionState {
  return { currentToken: 0, activeTokens: new Set() };
}

export function beginBilliardsRollSession(state: BilliardsRollSessionState): BilliardsRollSessionToken {
  const token = state.currentToken + 1;
  state.currentToken = token;
  state.activeTokens.add(token);
  return token;
}

export function isBilliardsRollSessionCurrent(
  state: BilliardsRollSessionState,
  token: BilliardsRollSessionToken,
): boolean {
  return state.activeTokens.has(token) && token === state.currentToken;
}

export function endBilliardsRollSession(
  state: BilliardsRollSessionState,
  token: BilliardsRollSessionToken,
): void {
  if (!state.activeTokens.has(token)) {
    return;
  }
  state.activeTokens.delete(token);
}

export function billiardsRollSessionIsActive(state: BilliardsRollSessionState): boolean {
  return state.activeTokens.size > 0;
}
