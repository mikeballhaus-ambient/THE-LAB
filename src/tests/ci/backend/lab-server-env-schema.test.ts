import { describe, expect, test } from '@jest/globals';
import { validateLabServerEnv } from '@/shared/config/lab-server-env-schema';

describe('lab-server-env-schema (5.7)', () => {
  test('warns when production profile missing allowlist', () => {
    const result = validateLabServerEnv({
      ...process.env,
      LAB_PRODUCTION_PROFILE: '1',
      LAB_ALLOWED_ORIGINS: '',
    });
    expect(result.ok).toBe(false);
    expect(result.warnings.some((w) => w.includes('LAB_ALLOWED_ORIGINS'))).toBe(true);
  });

  test('ok for minimal dev env snapshot', () => {
    const result = validateLabServerEnv({
      NODE_ENV: 'development',
      LAB_PRODUCTION_PROFILE: '',
    });
    expect(result.warnings.length).toBe(0);
  });
});
