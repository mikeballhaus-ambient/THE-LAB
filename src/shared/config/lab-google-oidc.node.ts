import { oidcProviderService } from '@/backend/db/OidcProviders/oidc-provider-service';
import {
  getDefaultGoogleOidcRedirectUri,
  GOOGLE_OIDC_PROVIDER,
} from './lab-google-oidc-env.node';

export { GOOGLE_OIDC_PROVIDER };

export function isGoogleOidcConfigured(): boolean {
  return oidcProviderService.isGoogleConfigured();
}

export function getGoogleOidcClientId(): string {
  const cfg = oidcProviderService.getGoogleRuntimeConfig();
  if (!cfg) {
    throw new Error('Google OIDC is not configured');
  }
  return cfg.clientId;
}

export function getGoogleOidcClientSecret(): string {
  const cfg = oidcProviderService.getGoogleRuntimeConfig();
  if (!cfg) {
    throw new Error('Google OIDC is not configured');
  }
  return cfg.clientSecret;
}

export function getGoogleOidcRedirectUri(): string {
  const cfg = oidcProviderService.getGoogleRuntimeConfig();
  if (!cfg) {
    return getDefaultGoogleOidcRedirectUri();
  }
  return cfg.redirectUri;
}
