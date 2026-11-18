import { describe, test, expect } from '@jest/globals';
import {
  isValidEntraTenantId,
  parseMicrosoftEntraExtras,
  serializeMicrosoftEntraExtras,
} from '@/shared/config/lab-microsoft-entra-oidc-extras';

describe('lab-microsoft-entra-oidc-extras', () => {
  test('defaults tenant to common', () => {
    expect(parseMicrosoftEntraExtras(null).tenantId).toBe('common');
  });

  test('round-trips tenant id in json', () => {
    const json = serializeMicrosoftEntraExtras('organizations');
    expect(parseMicrosoftEntraExtras(json).tenantId).toBe('organizations');
  });

  test('validates tenant identifiers', () => {
    expect(isValidEntraTenantId('common')).toBe(true);
    expect(isValidEntraTenantId('00000000-0000-0000-0000-000000000000')).toBe(true);
    expect(isValidEntraTenantId('')).toBe(false);
  });
});
