import { describe, test, expect, afterEach } from '@jest/globals';
import { listOidcProvidersFromEnv } from '@/shared/config/lab-oidc-provider-env.node';

describe('listOidcProvidersFromEnv', () => {
  const env = process.env;

  afterEach(() => {
    process.env = { ...env };
    delete process.env.LAB_GOOGLE_OIDC_CLIENT_ID;
    delete process.env.LAB_GOOGLE_OIDC_CLIENT_SECRET;
    delete process.env.LAB_GITHUB_OIDC_CLIENT_ID;
    delete process.env.LAB_GITHUB_OIDC_CLIENT_SECRET;
    delete process.env.LAB_MICROSOFT_ENTRA_OIDC_CLIENT_ID;
    delete process.env.LAB_MICROSOFT_ENTRA_OIDC_CLIENT_SECRET;
    delete process.env.LAB_MICROSOFT_ENTRA_OIDC_TENANT_ID;
  });

  test('returns empty list when no OIDC env vars are set', () => {
    expect(listOidcProvidersFromEnv()).toEqual([]);
  });

  test('includes each provider when client id and secret are set', () => {
    process.env.LAB_GOOGLE_OIDC_CLIENT_ID = 'g-id';
    process.env.LAB_GOOGLE_OIDC_CLIENT_SECRET = 'g-secret';
    process.env.LAB_GITHUB_OIDC_CLIENT_ID = 'gh-id';
    process.env.LAB_GITHUB_OIDC_CLIENT_SECRET = 'gh-secret';
    process.env.LAB_MICROSOFT_ENTRA_OIDC_CLIENT_ID = 'ms-id';
    process.env.LAB_MICROSOFT_ENTRA_OIDC_CLIENT_SECRET = 'ms-secret';
    process.env.LAB_MICROSOFT_ENTRA_OIDC_TENANT_ID = 'organizations';
    process.env.BACKEND_URL = 'http://localhost:3000';

    const seeds = listOidcProvidersFromEnv();
    expect(seeds.map((s) => s.providerId).sort()).toEqual(['github', 'google', 'microsoft-entra']);
    const entra = seeds.find((s) => s.providerId === 'microsoft-entra');
    expect(entra?.extrasJson).toBe(JSON.stringify({ tenantId: 'organizations' }));
  });
});
