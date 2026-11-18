import { isLabProductionProfile } from '@/shared/config/lab-production-profile';

/** When set (or production profile), default admin must change password before full access. */
export function isAdminPasswordResetRequired(): boolean {
  if (process.env.REQUIRE_ADMIN_PASSWORD_RESET === '1') {
    return true;
  }
  return isLabProductionProfile();
}
