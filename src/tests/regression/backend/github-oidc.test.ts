import { describe, test, expect, beforeAll, beforeEach, afterEach } from '@jest/globals';
import { databaseManager } from '@/backend/db/DatabaseManager';
import { oidcProviderService } from '@/backend/db/OidcProviders/oidc-provider-service';
import { oidcProvidersRepository } from '@/backend/db/OidcProviders/oidc-providers-repository';
import {
  createGithubLoginRedirectUrl,
  GITHUB_OIDC_PROVIDER,
  isGithubOidcLoginConfigured,
} from '@/backend/auth/github-oidc-service';

describe('GitHub OIDC / OAuth', () => {
  const env = process.env;

  beforeAll(async () => {
    await databaseManager.initialize();
  });

  beforeEach(() => {
    oidcProviderService.refreshCache();
  });

  afterEach(() => {
    process.env = { ...env };
    oidcProvidersRepository.upsert({
      providerId: GITHUB_OIDC_PROVIDER,
      enabled: false,
      clientId: null,
      clientSecret: '',
      redirectUri: null,
      extrasJson: null,
    });
    oidcProviderService.refreshCache();
  });

  test('isGithubOidcLoginConfigured is false when disabled in DB', () => {
    expect(isGithubOidcLoginConfigured()).toBe(false);
  });

  test('createGithubLoginRedirectUrl includes client_id, redirect_uri, scope, and state', () => {
    process.env.BACKEND_URL = 'http://localhost:3000';
    oidcProviderService.updateProviderSettings('github', {
      enabled: true,
      clientId: 'gh-test-client',
      clientSecret: 'gh-test-secret',
      redirectUri: 'http://localhost:3000/auth/oidc/github/callback',
    });
    expect(isGithubOidcLoginConfigured()).toBe(true);

    const url = new URL(createGithubLoginRedirectUrl());
    expect(url.origin + url.pathname).toBe('https://github.com/login/oauth/authorize');
    expect(url.searchParams.get('client_id')).toBe('gh-test-client');
    expect(url.searchParams.get('redirect_uri')).toBe(
      'http://localhost:3000/auth/oidc/github/callback',
    );
    expect(url.searchParams.get('scope')).toBe('read:user user:email');
    expect(url.searchParams.get('state')?.length).toBeGreaterThan(10);
  });
});
