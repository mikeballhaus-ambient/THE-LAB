import {
  getOidcProviderCatalogEntry,
  isKnownOidcProviderId,
  isOidcLoginImplemented,
} from '@/shared/config/lab-oidc-provider-catalog';
import { oidcProviderService } from '@/backend/db/OidcProviders/oidc-provider-service';
import {
  createGithubLoginRedirectUrl,
  handleGithubOidcCallback,
  isGithubOidcLoginConfigured,
} from './github-oidc-service';
import {
  createGoogleLoginRedirectUrl,
  handleGoogleOidcCallback,
  isGoogleOidcLoginConfigured,
} from './google-oidc-service';
import {
  createMicrosoftEntraLoginRedirectUrl,
  handleMicrosoftEntraOidcCallback,
  isMicrosoftEntraOidcLoginConfigured,
} from './microsoft-entra-oidc-service';
import type { OidcCallbackResult } from './google-oidc-service';

export function isOidcProviderLoginReady(providerId: string): boolean {
  const id = providerId.trim().toLowerCase();
  if (!isKnownOidcProviderId(id) || !isOidcLoginImplemented(id)) {
    return false;
  }
  return oidcProviderService.isProviderRuntimeConfigured(id);
}

export function createOidcLoginRedirectUrl(providerId: string): string {
  const id = providerId.trim().toLowerCase();
  switch (id) {
    case 'google':
      return createGoogleLoginRedirectUrl();
    case 'github':
      return createGithubLoginRedirectUrl();
    case 'microsoft-entra':
      return createMicrosoftEntraLoginRedirectUrl();
    default:
      throw new Error(`OIDC provider "${providerId}" is not supported`);
  }
}

export async function handleOidcProviderCallback(
  providerId: string,
  code: string | undefined,
  state: string | undefined,
): Promise<OidcCallbackResult> {
  const id = providerId.trim().toLowerCase();
  switch (id) {
    case 'google':
      return handleGoogleOidcCallback(code, state);
    case 'github':
      return handleGithubOidcCallback(code, state);
    case 'microsoft-entra':
      return handleMicrosoftEntraOidcCallback(code, state);
    default:
      throw new Error(`OIDC provider "${providerId}" is not supported`);
  }
}

export function isOidcProviderConfigured(providerId: string): boolean {
  const id = providerId.trim().toLowerCase();
  switch (id) {
    case 'google':
      return isGoogleOidcLoginConfigured();
    case 'github':
      return isGithubOidcLoginConfigured();
    case 'microsoft-entra':
      return isMicrosoftEntraOidcLoginConfigured();
    default:
      return false;
  }
}

export function oidcProviderNotConfiguredMessage(providerId: string): string {
  const label =
    getOidcProviderCatalogEntry(providerId.trim().toLowerCase())?.label ?? providerId;
  return `${label} sign-in is not configured`;
}
