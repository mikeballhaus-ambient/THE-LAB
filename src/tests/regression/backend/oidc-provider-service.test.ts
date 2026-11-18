import { describe, test, expect, beforeAll, beforeEach, afterEach } from '@jest/globals';
import { databaseManager } from '@/backend/db/DatabaseManager';
import { oidcProviderService } from '@/backend/db/OidcProviders/oidc-provider-service';
import { oidcProvidersRepository } from '@/backend/db/OidcProviders/oidc-providers-repository';
import { seedOidcProvidersFromEnv } from '@/backend/db/OidcProviders/seed-oidc-providers-from-env';
import { listOidcProviderCatalog } from '@/shared/config/lab-oidc-provider-catalog';

describe('OidcProviderService', () => {
  const env = process.env;

  beforeAll(async () => {
    await databaseManager.initialize();
  });

  beforeEach(() => {
    oidcProviderService.refreshCache();
  });

  afterEach(() => {
    process.env = { ...env };
    delete process.env.LAB_GOOGLE_OIDC_CLIENT_ID;
    delete process.env.LAB_GOOGLE_OIDC_CLIENT_SECRET;
    for (const id of ['google', 'github', 'microsoft-entra'] as const) {
      oidcProvidersRepository.upsert({
        providerId: id,
        enabled: false,
        clientId: null,
        clientSecret: '',
        redirectUri: null,
        extrasJson: null,
      });
    }
    oidcProviderService.refreshCache();
  });

  test('lists all catalog providers (Google, GitHub, Microsoft Entra)', () => {
    const payload = oidcProviderService.getAdminPayload();
    expect(payload.providers).toHaveLength(listOidcProviderCatalog().length);
    const ids = payload.providers.map((p) => p.providerId);
    expect(ids).toEqual(['google', 'github', 'microsoft-entra']);
  });

  test('google runtime uses database when enabled in settings', () => {
    const save = oidcProviderService.updateProviderSettings('google', {
      enabled: true,
      clientId: 'db-client',
      clientSecret: 'db-secret',
      redirectUri: 'http://localhost:3000/auth/oidc/google/callback',
    });
    expect(save.success).toBe(true);

    const cfg = oidcProviderService.getGoogleRuntimeConfig();
    expect(cfg?.clientId).toBe('db-client');
    expect(cfg?.source).toBe('database');
  });

  test('google runtime uses SQLite only until env seed runs', () => {
    oidcProvidersRepository.upsert({
      providerId: 'google',
      enabled: false,
      clientId: null,
      clientSecret: null,
      redirectUri: null,
      extrasJson: null,
    });
    oidcProviderService.refreshCache();
    process.env.LAB_GOOGLE_OIDC_CLIENT_ID = 'env-client';
    process.env.LAB_GOOGLE_OIDC_CLIENT_SECRET = 'env-secret';
    expect(oidcProviderService.getGoogleRuntimeConfig()).toBeNull();
    seedOidcProvidersFromEnv();
    oidcProviderService.refreshCache();
    expect(oidcProviderService.getGoogleRuntimeConfig()?.clientId).toBe('env-client');
    expect(oidcProviderService.isGoogleConfigured()).toBe(true);
  });

  test('env seed does not overwrite existing database credentials', () => {
    oidcProvidersRepository.upsert({
      providerId: 'google',
      enabled: true,
      clientId: 'db-client',
      clientSecret: 'db-secret',
      redirectUri: 'http://localhost:3000/auth/oidc/google/callback',
      extrasJson: null,
    });
    process.env.LAB_GOOGLE_OIDC_CLIENT_ID = 'env-client';
    process.env.LAB_GOOGLE_OIDC_CLIENT_SECRET = 'env-secret';
    seedOidcProvidersFromEnv();
    oidcProviderService.refreshCache();
    expect(oidcProviderService.getGoogleRuntimeConfig()?.clientId).toBe('db-client');
  });

  test('github enabled in DB appears as login-ready', () => {
    oidcProviderService.updateProviderSettings('github', {
      enabled: true,
      clientId: 'gh-id',
      clientSecret: 'gh-secret',
    });
    expect(oidcProviderService.isProviderRuntimeConfigured('github')).toBe(true);
    expect(oidcProviderService.getEnabledProviderIds()).toContain('github');
  });

  test('microsoft entra stores tenant in extras', () => {
    const save = oidcProviderService.updateProviderSettings('microsoft-entra', {
      enabled: true,
      clientId: 'ms-id',
      clientSecret: 'ms-secret',
      tenantId: 'organizations',
    });
    expect(save.success).toBe(true);
    if (save.success) {
      expect(save.settings.tenantId).toBe('organizations');
    }
    const cfg = oidcProviderService.getProviderRuntimeConfig('microsoft-entra');
    expect(cfg?.tenantId).toBe('organizations');
  });

  test('listPublicSettings never exposes client secret', () => {
    oidcProviderService.updateProviderSettings('google', {
      enabled: true,
      clientId: 'db-client',
      clientSecret: 'db-secret',
    });
    const row = oidcProviderService.listPublicSettings().find((p) => p.providerId === 'google');
    expect(row?.hasClientSecret).toBe(true);
    expect(JSON.stringify(row)).not.toContain('db-secret');
    expect(row?.clientSecretLength).toBeGreaterThan(0);
  });
});
