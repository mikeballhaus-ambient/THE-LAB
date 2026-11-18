export interface ParsedIdTokenPayload {
  sub?: string;
  aud?: string | string[];
  exp?: number;
  iss?: string;
  email?: string;
  preferred_username?: string;
  upn?: string;
  unique_name?: string;
  name?: string;
  email_verified?: boolean;
}

export function parseIdTokenPayload(idToken: string): ParsedIdTokenPayload {
  const parts = idToken.split('.');
  if (parts.length < 2) {
    throw new Error('Invalid id_token format');
  }
  const payloadJson = Buffer.from(parts[1], 'base64url').toString('utf8');
  return JSON.parse(payloadJson) as ParsedIdTokenPayload;
}

export function validateIdTokenAudience(
  payload: ParsedIdTokenPayload,
  expectedClientId: string,
): void {
  const aud = payload.aud;
  const matches =
    aud === expectedClientId ||
    (Array.isArray(aud) && aud.includes(expectedClientId));
  if (!matches) {
    throw new Error('id_token audience mismatch');
  }
}

export function validateIdTokenExpiry(payload: ParsedIdTokenPayload): void {
  if (typeof payload.exp !== 'number') {
    throw new Error('id_token missing exp');
  }
  const nowSec = Math.floor(Date.now() / 1000);
  if (payload.exp <= nowSec) {
    throw new Error('id_token expired');
  }
}

export function validateMicrosoftIdTokenIssuer(
  payload: ParsedIdTokenPayload,
  tenantId: string,
): void {
  const iss = payload.iss ?? '';
  const normalizedTenant = tenantId.trim().toLowerCase();
  if (normalizedTenant === 'common' || normalizedTenant === 'organizations') {
    if (!iss.startsWith('https://login.microsoftonline.com/')) {
      throw new Error('id_token issuer mismatch');
    }
    return;
  }
  if (!iss.startsWith(`https://login.microsoftonline.com/${tenantId}/`)) {
    throw new Error('id_token issuer mismatch');
  }
}

export function emailFromIdTokenPayload(payload: ParsedIdTokenPayload): string {
  const raw = payload.email ?? payload.preferred_username ?? '';
  return raw.trim().toLowerCase();
}

/** Entra id_tokens may expose `upn` / `unique_name` instead of `email`. */
export function emailFromMicrosoftEntraIdTokenPayload(payload: ParsedIdTokenPayload): string {
  const raw =
    payload.email ??
    payload.preferred_username ??
    payload.upn ??
    payload.unique_name ??
    '';
  return raw.trim().toLowerCase();
}

export function isIdTokenEmailVerified(payload: ParsedIdTokenPayload): boolean {
  if (payload.email_verified === true) {
    return true;
  }
  return false;
}

/**
 * Microsoft Entra id_tokens often omit `email_verified`. After a successful code exchange,
 * a stable `sub` plus email/preferred_username is treated as verified for JIT member role.
 */
export function isMicrosoftEntraIdTokenEmailVerified(payload: ParsedIdTokenPayload): boolean {
  if (isIdTokenEmailVerified(payload)) {
    return true;
  }
  return Boolean(payload.sub && emailFromMicrosoftEntraIdTokenPayload(payload));
}
