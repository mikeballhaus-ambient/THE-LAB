import { afterEach, describe, expect, test } from '@jest/globals';
import { isAdminPasswordResetRequired } from '@/shared/config/lab-admin-password-reset';

describe('isAdminPasswordResetRequired', () => {
  const env = process.env;

  afterEach(() => {
    process.env = { ...env };
  });

  test('enabled when REQUIRE_ADMIN_PASSWORD_RESET=1', () => {
    delete process.env.LAB_PRODUCTION_PROFILE;
    process.env.REQUIRE_ADMIN_PASSWORD_RESET = '1';
    expect(isAdminPasswordResetRequired()).toBe(true);
  });

  test('enabled when LAB_PRODUCTION_PROFILE=1', () => {
    delete process.env.REQUIRE_ADMIN_PASSWORD_RESET;
    process.env.LAB_PRODUCTION_PROFILE = '1';
    expect(isAdminPasswordResetRequired()).toBe(true);
  });

  test('disabled in default dev profile', () => {
    delete process.env.REQUIRE_ADMIN_PASSWORD_RESET;
    delete process.env.LAB_PRODUCTION_PROFILE;
    expect(isAdminPasswordResetRequired()).toBe(false);
  });
});
