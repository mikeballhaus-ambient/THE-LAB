import { getSuggestedOidcRedirectUri } from './lab-oidc-provider-catalog';

export const GOOGLE_OIDC_PROVIDER = 'google';

export function readGoogleOidcFromEnv(): {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
} | null {
  const clientId = process.env.LAB_GOOGLE_OIDC_CLIENT_ID?.trim();
  const clientSecret = process.env.LAB_GOOGLE_OIDC_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    return null;
  }
  const explicit = process.env.LAB_GOOGLE_OIDC_REDIRECT_URI?.trim();
  const redirectUri = explicit || getSuggestedOidcRedirectUri(GOOGLE_OIDC_PROVIDER);
  return { clientId, clientSecret, redirectUri };
}

export function isGoogleOidcConfiguredInEnv(): boolean {
  return readGoogleOidcFromEnv() !== null;
}

export function getDefaultGoogleOidcRedirectUri(): string {
  const explicit = process.env.LAB_GOOGLE_OIDC_REDIRECT_URI?.trim();
  if (explicit) {
    return explicit;
  }
  return getSuggestedOidcRedirectUri(GOOGLE_OIDC_PROVIDER);
}
