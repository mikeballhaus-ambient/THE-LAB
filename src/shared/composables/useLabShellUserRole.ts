import { computed, type ComputedRef } from 'vue';
import { labShellUserRef } from '@/shared/auth/lab-shell-user-state';
import { getAuthUser } from '@/shared/types/auth';
import type { UserRole } from '@/shared/types/user';
import {
  getDashboardLabWorkspaceContext,
  useLabWorkspaceContext,
} from '@/shared/composables/useLabWorkspaceContext';

/** Same role resolution as Settings (`props.user`) for mounted catalog apps. */
export function resolveLabShellUserRole(): UserRole | null {
  const workspace = getDashboardLabWorkspaceContext();
  const fromDashboard = workspace?.userRole?.value ?? null;
  const fromRef = labShellUserRef.value?.role ?? null;
  const fromStorage = fromRef ?? getAuthUser()?.role ?? null;
  return fromDashboard ?? fromStorage;
}

/**
 * Reactive platform role for mounted apps and shared settings panels without a `user` prop.
 * Uses dashboard workspace user first (live socket session), then `lab_auth_user`.
 */
export function useLabShellUserRole(): ComputedRef<UserRole | null> {
  const injectedWorkspace = useLabWorkspaceContext();
  if (labShellUserRef.value === null && typeof window !== 'undefined') {
    labShellUserRef.value = getAuthUser();
  }
  return computed(() => {
    const fromInject = injectedWorkspace?.userRole?.value ?? null;
    const fromDashboard = getDashboardLabWorkspaceContext()?.userRole?.value ?? null;
    const fromRef = labShellUserRef.value?.role ?? null;
    const fromStorage = fromRef ?? getAuthUser()?.role ?? null;
    return fromInject ?? fromDashboard ?? fromStorage;
  });
}
