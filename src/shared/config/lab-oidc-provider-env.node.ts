import { getSuggestedOidcRedirectUri } from './lab-oidc-provider-catalog';
import { GOOGLE_OIDC_PROVIDER, readGoogleOidcFromEnv } from './lab-google-oidc-env.node';
import {
  MICROSOFT_ENTRA_OIDC_PROVIDER_ID,
  serializeMicrosoftEntraExtras,
} from './lab-microsoft-entra-oidc-extras';

export interface OidcProviderEnvSeed {
  providerId: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  extrasJson: string | null;
}

function readOidcProviderFromEnvKeys(options: {
  envPrefix: string;
  providerId: string;
  tenantEnvKey?: string;
}): OidcProviderEnvSeed | null {
  const clientId = process.env[`${options.envPrefix}_CLIENT_ID`]?.trim();
  const clientSecret = process.env[`${options.envPrefix}_CLIENT_SECRET`]?.trim();
  if (!clientId || !clientSecret) {
    return null;
  }
  const explicitRedirect = process.env[`${options.envPrefix}_REDIRECT_URI`]?.trim();
  const redirectUri = explicitRedirect || getSuggestedOidcRedirectUri(options.providerId);
  let extrasJson: string | null = null;
  if (options.tenantEnvKey) {
    const tenant = process.env[options.tenantEnvKey]?.trim() || 'common';
    extrasJson = serializeMicrosoftEntraExtras(tenant);
  }
  return {
    providerId: options.providerId,
    clientId,
    clientSecret,
    redirectUri,
    extrasJson,
  };
}

/** OIDC providers with client id + secret present in `process.env` (from `.env` via `dotenv/config`). */
export function listOidcProvidersFromEnv(): OidcProviderEnvSeed[] {
  const seeds: OidcProviderEnvSeed[] = [];
  const google = readGoogleOidcFromEnv();
  if (google) {
    seeds.push({
      providerId: GOOGLE_OIDC_PROVIDER,
      clientId: google.clientId,
      clientSecret: google.clientSecret,
      redirectUri: google.redirectUri,
      extrasJson: null,
    });
  }
  const github = readOidcProviderFromEnvKeys({
    envPrefix: 'LAB_GITHUB_OIDC',
    providerId: 'github',
  });
  if (github) {
    seeds.push(github);
  }
  const entra = readOidcProviderFromEnvKeys({
    envPrefix: 'LAB_MICROSOFT_ENTRA_OIDC',
    providerId: MICROSOFT_ENTRA_OIDC_PROVIDER_ID,
    tenantEnvKey: 'LAB_MICROSOFT_ENTRA_OIDC_TENANT_ID',
  });
  if (entra) {
    seeds.push(entra);
  }
  return seeds;
}
