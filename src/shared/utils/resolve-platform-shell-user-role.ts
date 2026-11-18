import { labShellUserRef } from '@/shared/auth/lab-shell-user-state';
import { getAuthUser } from '@/shared/types/auth';
import type { UserRole } from '@/shared/types/user';

/**
 * @deprecated Prefer `useLabShellUserRole()` in Vue setup for reactivity.
 */
export function resolvePlatformShellUserRole(
  injectedRole?: UserRole | null,
): UserRole | undefined {
  if (injectedRole) {
    return injectedRole;
  }
  const fromRef = labShellUserRef.value?.role ?? getAuthUser()?.role;
  return fromRef ?? undefined;
}
