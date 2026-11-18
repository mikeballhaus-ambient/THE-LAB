import { describe, test, expect } from '@jest/globals';
import {
  emailFromIdTokenPayload,
  emailFromMicrosoftEntraIdTokenPayload,
  isMicrosoftEntraIdTokenEmailVerified,
  parseIdTokenPayload,
  validateIdTokenAudience,
  validateIdTokenExpiry,
} from '@/backend/auth/lab-oidc-jwt';

function fakeJwt(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: 'none' }), 'utf8').toString('base64url');
  const body = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  return `${header}.${body}.sig`;
}

describe('lab-oidc-jwt', () => {
  test('parseIdTokenPayload reads claims', () => {
    const token = fakeJwt({
      sub: 'user-1',
      email: 'a@example.com',
      aud: 'client-id',
      exp: Math.floor(Date.now() / 1000) + 3600,
    });
    const payload = parseIdTokenPayload(token);
    expect(payload.sub).toBe('user-1');
    expect(emailFromIdTokenPayload(payload)).toBe('a@example.com');
  });

  test('validateIdTokenAudience rejects wrong client', () => {
    const payload = parseIdTokenPayload(
      fakeJwt({ aud: 'other', exp: Math.floor(Date.now() / 1000) + 60 }),
    );
    expect(() => validateIdTokenAudience(payload, 'expected')).toThrow(/audience/);
  });

  test('validateIdTokenExpiry rejects expired tokens', () => {
    const payload = parseIdTokenPayload(
      fakeJwt({ aud: 'c', exp: Math.floor(Date.now() / 1000) - 10 }),
    );
    expect(() => validateIdTokenExpiry(payload)).toThrow(/expired/);
  });

  test('Entra treats email + sub as verified when email_verified claim is absent', () => {
    const payload = parseIdTokenPayload(
      fakeJwt({
        sub: 'entra-sub',
        preferred_username: 'user@contoso.com',
        aud: 'client',
        exp: Math.floor(Date.now() / 1000) + 3600,
      }),
    );
    expect(isMicrosoftEntraIdTokenEmailVerified(payload)).toBe(true);
  });

  test('Entra email resolves from upn when email claim missing', () => {
    const payload = parseIdTokenPayload(
      fakeJwt({
        sub: 'entra-sub',
        upn: 'user@contoso.com',
        aud: 'client',
        exp: Math.floor(Date.now() / 1000) + 3600,
      }),
    );
    expect(emailFromMicrosoftEntraIdTokenPayload(payload)).toBe('user@contoso.com');
  });
});
