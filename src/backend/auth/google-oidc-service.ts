import {
  getGoogleOidcClientId,
  getGoogleOidcClientSecret,
  getGoogleOidcRedirectUri,
  isGoogleOidcConfigured,
} from '@/shared/config/lab-google-oidc.node';
import { GOOGLE_OIDC_PROVIDER } from '@/shared/config/lab-google-oidc-env.node';
import { consumeOAuthState, createOAuthState } from './lab-oauth-state';
import { resolveSsoUserId } from './lab-oidc-sso';

export { GOOGLE_OIDC_PROVIDER };

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_TOKENINFO_URL = 'https://oauth2.googleapis.com/tokeninfo';

export interface GoogleIdTokenClaims {
  sub: string;
  email?: string;
  email_verified?: string | boolean;
  name?: string;
  aud?: string;
}

export function isGoogleOidcLoginConfigured(): boolean {
  return isGoogleOidcConfigured();
}

export function createGoogleLoginRedirectUrl(): string {
  if (!isGoogleOidcConfigured()) {
    throw new Error('Google OIDC is not configured');
  }
  const state = createOAuthState(GOOGLE_OIDC_PROVIDER);
  const params = new URLSearchParams({
    client_id: getGoogleOidcClientId(),
    redirect_uri: getGoogleOidcRedirectUri(),
    response_type: 'code',
    scope: 'openid email profile',
    state,
    access_type: 'online',
    prompt: 'select_account',
  });
  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

async function exchangeCodeForTokens(code: string): Promise<{ id_token: string }> {
  const body = new URLSearchParams({
    code,
    client_id: getGoogleOidcClientId(),
    client_secret: getGoogleOidcClientSecret(),
    redirect_uri: getGoogleOidcRedirectUri(),
    grant_type: 'authorization_code',
  });
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google token exchange failed: ${res.status} ${text}`);
  }
  const json = (await res.json()) as { id_token?: string };
  if (!json.id_token) {
    throw new Error('Google token response missing id_token');
  }
  return { id_token: json.id_token };
}

async function verifyGoogleIdToken(idToken: string): Promise<GoogleIdTokenClaims> {
  const res = await fetch(`${GOOGLE_TOKENINFO_URL}?id_token=${encodeURIComponent(idToken)}`);
  if (!res.ok) {
    throw new Error('Invalid Google id_token');
  }
  const claims = (await res.json()) as GoogleIdTokenClaims & { error?: string };
  if (claims.error || !claims.sub) {
    throw new Error('Google id_token validation failed');
  }
  const expectedAud = getGoogleOidcClientId();
  if (claims.aud !== expectedAud) {
    throw new Error('Google id_token audience mismatch');
  }
  return claims;
}

function isGoogleEmailVerified(claims: GoogleIdTokenClaims): boolean {
  if (claims.email_verified === true || claims.email_verified === 'true') {
    return true;
  }
  return false;
}

export interface OidcCallbackResult {
  userId: number;
}

export async function handleGoogleOidcCallback(
  code: string | undefined,
  state: string | undefined,
): Promise<OidcCallbackResult> {
  if (!isGoogleOidcConfigured()) {
    throw new Error('Google OIDC is not configured');
  }
  if (!code?.trim()) {
    throw new Error('Missing authorization code');
  }
  if (!consumeOAuthState(GOOGLE_OIDC_PROVIDER, state)) {
    throw new Error('Invalid or expired OAuth state');
  }

  const { id_token } = await exchangeCodeForTokens(code.trim());
  const claims = await verifyGoogleIdToken(id_token);
  const email = claims.email?.trim().toLowerCase() ?? '';
  const idpEmailVerified = isGoogleEmailVerified(claims);

  const userId = await resolveSsoUserId({
    provider: GOOGLE_OIDC_PROVIDER,
    providerSubject: claims.sub,
    email,
    displayName: claims.name?.trim() || email.split('@')[0] || 'Google User',
    idpEmailVerified,
  });

  return { userId };
}

export {
  __registerOAuthStateForTests as __registerOidcStateForTests,
  __resetOAuthStateForTests as __resetOidcStateForTests,
} from './lab-oauth-state';
