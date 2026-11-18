/**
 * Dev-only bypass for Quarks hint purchase (rm-68.5).
 * Production builds hide mock UI unless `VITE_LAB_GAME_HINT_DEV_MOCK=1` (staging QA).
 */

export const VITE_LAB_GAME_HINT_DEV_MOCK = 'VITE_LAB_GAME_HINT_DEV_MOCK';

export function resolveLabGameHintDevMockEnabled(flags: {
  isDev: boolean;
  isProd: boolean;
  envFlag: string | undefined;
}): boolean {
  if (flags.envFlag === '0') {
    return false;
  }
  if (flags.isProd && flags.envFlag !== '1') {
    return false;
  }
  return flags.isDev || flags.envFlag === '1';
}

/** Browser: on in Vite dev; off in production unless explicitly enabled. */
export function isLabGameHintDevMockEnabled(): boolean {
  return resolveLabGameHintDevMockEnabled({
    isDev: import.meta.env.DEV,
    isProd: import.meta.env.PROD,
    envFlag: import.meta.env.VITE_LAB_GAME_HINT_DEV_MOCK as string | undefined,
  });
}

/** App server: mock purchase route only when explicitly enabled (never default-on). */
export function isLabGameHintServerDevMockEnabled(): boolean {
  if (process.env.LAB_PRODUCTION_PROFILE === '1') {
    return false;
  }
  return process.env.LAB_GAME_HINT_DEV_MOCK === '1';
}
