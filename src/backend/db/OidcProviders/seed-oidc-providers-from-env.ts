import { listOidcProvidersFromEnv } from '@/shared/config/lab-oidc-provider-env.node';
import { oidcProvidersRepository } from './oidc-providers-repository';

/**
 * Copy `.env` OIDC credentials into SQLite when a catalog provider row has no stored client id/secret.
 * Settings → Auth Providers remains authoritative once credentials exist in the database.
 */
export function seedOidcProvidersFromEnv(): void {
  for (const seed of listOidcProvidersFromEnv()) {
    const existing = oidcProvidersRepository.getByProviderId(seed.providerId);
    if (!existing) {
      continue;
    }
    const hasDbCredentials =
      Boolean(existing.clientId?.trim()) && Boolean(existing.clientSecret?.trim());
    if (hasDbCredentials) {
      continue;
    }
    oidcProvidersRepository.upsert({
      providerId: seed.providerId,
      enabled: true,
      clientId: seed.clientId,
      clientSecret: seed.clientSecret,
      redirectUri: seed.redirectUri,
      extrasJson: seed.extrasJson,
    });
  }
}
