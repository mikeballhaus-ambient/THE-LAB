import { randomBytes } from 'crypto';

const STATE_TTL_MS = 10 * 60 * 1000;

const pendingOauthStates = new Map<
  string,
  { providerId: string; createdAt: number }
>();

function purgeExpiredStates(): void {
  const now = Date.now();
  for (const [state, entry] of pendingOauthStates) {
    if (now - entry.createdAt > STATE_TTL_MS) {
      pendingOauthStates.delete(state);
    }
  }
}

export function createOAuthState(providerId: string): string {
  purgeExpiredStates();
  const state = randomBytes(24).toString('hex');
  pendingOauthStates.set(state, { providerId, createdAt: Date.now() });
  return state;
}

export function consumeOAuthState(
  providerId: string,
  state: string | undefined,
): boolean {
  if (!state?.trim()) {
    return false;
  }
  purgeExpiredStates();
  const entry = pendingOauthStates.get(state);
  if (!entry || entry.providerId !== providerId) {
    return false;
  }
  pendingOauthStates.delete(state);
  return Date.now() - entry.createdAt <= STATE_TTL_MS;
}

/** Test helper */
export function __resetOAuthStateForTests(): void {
  pendingOauthStates.clear();
}

/** Test helper */
export function __registerOAuthStateForTests(
  providerId: string,
  state: string,
): void {
  pendingOauthStates.set(state, { providerId, createdAt: Date.now() });
}
