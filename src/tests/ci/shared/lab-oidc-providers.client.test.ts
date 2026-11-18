import { describe, test, expect } from '@jest/globals';
import {
  LAB_OIDC_PROVIDER_CATALOG,
  resolveEnabledOidcProviders,
} from '@/shared/config/lab-oidc-providers.client';

describe('lab-oidc-providers.client', () => {
  test('resolveEnabledOidcProviders filters catalog by server ids', () => {
    const enabled = resolveEnabledOidcProviders(['google', 'unknown']);
    expect(enabled.map((p) => p.id)).toEqual(['google']);
    expect(enabled[0].loginPath).toBe('/auth/oidc/google/login');
  });

  test('catalog includes google metadata', () => {
    expect(LAB_OIDC_PROVIDER_CATALOG.some((p) => p.id === 'google')).toBe(true);
  });
});
