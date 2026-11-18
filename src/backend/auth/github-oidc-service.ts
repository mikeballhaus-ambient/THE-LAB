import { oidcProviderService } from '@/backend/db/OidcProviders/oidc-provider-service';
import { consumeOAuthState, createOAuthState } from './lab-oauth-state';
import { humanizeLabUserDisplayName } from '@/shared/utils/lab-user-display';
import { resolveSsoUserId } from './lab-oidc-sso';
import type { OidcCallbackResult } from './google-oidc-service';

export const GITHUB_OIDC_PROVIDER = 'github';

const GITHUB_AUTH_URL = 'https://github.com/login/oauth/authorize';
const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token';
const GITHUB_USER_URL = 'https://api.github.com/user';
const GITHUB_EMAILS_URL = 'https://api.github.com/user/emails';

function requireGithubConfig() {
  oidcProviderService.refreshCache();
  const cfg = oidcProviderService.getProviderRuntimeConfig(GITHUB_OIDC_PROVIDER);
  if (!cfg) {
    throw new Error('GitHub OAuth is not configured');
  }
  return cfg;
}

export function isGithubOidcLoginConfigured(): boolean {
  return oidcProviderService.isProviderRuntimeConfigured(GITHUB_OIDC_PROVIDER);
}

export function createGithubLoginRedirectUrl(): string {
  const cfg = requireGithubConfig();
  const state = createOAuthState(GITHUB_OIDC_PROVIDER);
  const params = new URLSearchParams({
    client_id: cfg.clientId,
    redirect_uri: cfg.redirectUri,
    scope: 'read:user user:email',
    state,
  });
  return `${GITHUB_AUTH_URL}?${params.toString()}`;
}

async function exchangeCodeForAccessToken(code: string): Promise<string> {
  const cfg = requireGithubConfig();
  const body = new URLSearchParams({
    code,
    client_id: cfg.clientId,
    client_secret: cfg.clientSecret,
    redirect_uri: cfg.redirectUri,
  });
  const res = await fetch(GITHUB_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: body.toString(),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub token exchange failed: ${res.status} ${text}`);
  }
  const json = (await res.json()) as { access_token?: string; error?: string };
  if (json.error || !json.access_token) {
    throw new Error(json.error ?? 'GitHub token response missing access_token');
  }
  return json.access_token;
}

async function fetchGithubUser(accessToken: string): Promise<{ id: number; name?: string; login?: string }> {
  const res = await fetch(GITHUB_USER_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'THE-LAB',
    },
  });
  if (!res.ok) {
    throw new Error('Failed to load GitHub user profile');
  }
  return (await res.json()) as { id: number; name?: string; login?: string };
}

async function fetchPrimaryVerifiedEmail(accessToken: string): Promise<string> {
  const res = await fetch(GITHUB_EMAILS_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'THE-LAB',
    },
  });
  if (!res.ok) {
    throw new Error('Failed to load GitHub account emails');
  }
  const emails = (await res.json()) as Array<{
    email?: string;
    primary?: boolean;
    verified?: boolean;
  }>;
  const primary = emails.find((e) => e.primary && e.verified && e.email);
  if (primary?.email) {
    return primary.email.trim().toLowerCase();
  }
  const verified = emails.find((e) => e.verified && e.email);
  if (verified?.email) {
    return verified.email.trim().toLowerCase();
  }
  throw new Error('GitHub account has no verified email');
}

export async function handleGithubOidcCallback(
  code: string | undefined,
  state: string | undefined,
): Promise<OidcCallbackResult> {
  if (!isGithubOidcLoginConfigured()) {
    throw new Error('GitHub OAuth is not configured');
  }
  if (!code?.trim()) {
    throw new Error('Missing authorization code');
  }
  if (!consumeOAuthState(GITHUB_OIDC_PROVIDER, state)) {
    throw new Error('Invalid or expired OAuth state');
  }

  const accessToken = await exchangeCodeForAccessToken(code.trim());
  const user = await fetchGithubUser(accessToken);
  const email = await fetchPrimaryVerifiedEmail(accessToken);
  const loginLabel = user.login?.trim();
  const displayName =
    user.name?.trim() ||
    (loginLabel ? humanizeLabUserDisplayName(loginLabel) : '') ||
    email.split('@')[0] ||
    'GitHub User';

  const userId = await resolveSsoUserId({
    provider: GITHUB_OIDC_PROVIDER,
    providerSubject: String(user.id),
    email,
    displayName,
    idpEmailVerified: true,
  });

  return { userId };
}
