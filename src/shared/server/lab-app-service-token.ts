import { randomBytes } from 'crypto';

let devGeneratedToken: string | undefined;

/** Shared secret for app servers calling platform APIs (D-02 B). */
export function resolveLabAppServiceToken(): string {
  const fromEnv = process.env.LAB_APP_SERVICE_TOKEN?.trim();
  if (fromEnv) {
    return fromEnv;
  }
  if (process.env.LAB_PRODUCTION_PROFILE === '1') {
    throw new Error('LAB_APP_SERVICE_TOKEN is required when LAB_PRODUCTION_PROFILE=1');
  }
  if (!devGeneratedToken) {
    devGeneratedToken = randomBytes(32).toString('hex');
    process.env.LAB_APP_SERVICE_TOKEN = devGeneratedToken;
  }
  return devGeneratedToken;
}
