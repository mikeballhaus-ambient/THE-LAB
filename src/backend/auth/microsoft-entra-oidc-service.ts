import { oidcProviderService } from '@/backend/db/OidcProviders/oidc-provider-service';
import {
  emailFromMicrosoftEntraIdTokenPayload,
  isMicrosoftEntraIdTokenEmailVerified,
  parseIdTokenPayload,
  validateIdTokenAudience,
  validateIdTokenExpiry,
  validateMicrosoftIdTokenIssuer,
} from './lab-oidc-jwt';
import { consumeOAuthState, createOAuthState } from './lab-oauth-state';
import { resolveSsoUserId } from './lab-oidc-sso';
import type { OidcCallbackResult } from './google-oidc-service';

export const MICROSOFT_ENTRA_OIDC_PROVIDER = 'microsoft-entra';

function entraEndpoints(tenantId: string) {
  const tenant = tenantId.trim() || 'common';
  const base = `https://login.microsoftonline.com/${encodeURIComponent(tenant)}/oauth2/v2.0`;
  return {
    authorize: `${base}/authorize`,
    token: `${base}/token`,
  };
}

function requireEntraConfig() {
  oidcProviderService.refreshCache();
  const cfg = oidcProviderService.getProviderRuntimeConfig(MICROSOFT_ENTRA_OIDC_PROVIDER);
  if (!cfg) {
    throw new Error('Microsoft Entra OIDC is not configured');
  }
  return cfg;
}

export function isMicrosoftEntraOidcLoginConfigured(): boolean {
  return oidcProviderService.isProviderRuntimeConfigured(MICROSOFT_ENTRA_OIDC_PROVIDER);
}

export function createMicrosoftEntraLoginRedirectUrl(): string {
  const cfg = requireEntraConfig();
  const tenantId = cfg.tenantId ?? 'common';
  const { authorize } = entraEndpoints(tenantId);
  const state = createOAuthState(MICROSOFT_ENTRA_OIDC_PROVIDER);
  const params = new URLSearchParams({
    client_id: cfg.clientId,
    redirect_uri: cfg.redirectUri,
    response_type: 'code',
    scope: 'openid profile email offline_access',
    state,
    response_mode: 'query',
  });
  return `${authorize}?${params.toString()}`;
}

async function exchangeCodeForIdToken(code: string): Promise<string> {
  const cfg = requireEntraConfig();
  const tenantId = cfg.tenantId ?? 'common';
  const { token } = entraEndpoints(tenantId);
  const body = new URLSearchParams({
    code,
    client_id: cfg.clientId,
    client_secret: cfg.clientSecret,
    redirect_uri: cfg.redirectUri,
    grant_type: 'authorization_code',
  });
  const res = await fetch(token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Microsoft token exchange failed: ${res.status} ${text}`);
  }
  const json = (await res.json()) as { id_token?: string; error?: string };
  if (json.error || !json.id_token) {
    throw new Error(json.error ?? 'Microsoft token response missing id_token');
  }
  return json.id_token;
}

function validateEntraIdToken(idToken: string, clientId: string, tenantId: string): void {
  const payload = parseIdTokenPayload(idToken);
  if (!payload.sub) {
    throw new Error('Microsoft id_token validation failed');
  }
  validateIdTokenAudience(payload, clientId);
  validateIdTokenExpiry(payload);
  validateMicrosoftIdTokenIssuer(payload, tenantId);
}

export async function handleMicrosoftEntraOidcCallback(
  code: string | undefined,
  state: string | undefined,
): Promise<OidcCallbackResult> {
  if (!isMicrosoftEntraOidcLoginConfigured()) {
    throw new Error('Microsoft Entra OIDC is not configured');
  }
  if (!code?.trim()) {
    throw new Error('Missing authorization code');
  }
  if (!consumeOAuthState(MICROSOFT_ENTRA_OIDC_PROVIDER, state)) {
    throw new Error('Invalid or expired OAuth state');
  }

  const cfg = requireEntraConfig();
  const tenantId = cfg.tenantId ?? 'common';
  const idToken = await exchangeCodeForIdToken(code.trim());
  validateEntraIdToken(idToken, cfg.clientId, tenantId);
  const payload = parseIdTokenPayload(idToken);
  const email = emailFromMicrosoftEntraIdTokenPayload(payload);
  if (!email) {
    throw new Error(
      'Microsoft Entra did not return an email (configure optional claims or use openid profile email scopes)',
    );
  }
  const idpEmailVerified = isMicrosoftEntraIdTokenEmailVerified(payload);
  const displayName = payload.name?.trim() || email.split('@')[0] || 'Microsoft User';

  const userId = await resolveSsoUserId({
    provider: MICROSOFT_ENTRA_OIDC_PROVIDER,
    providerSubject: payload.sub!,
    email,
    displayName,
    idpEmailVerified,
  });

  return { userId };
}
