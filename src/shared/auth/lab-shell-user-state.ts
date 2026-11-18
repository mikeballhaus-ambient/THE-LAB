import { shallowRef } from 'vue';
import type { User } from '@/shared/types/user';

/** Reactive mirror of `lab_auth_user` (updated in `setAuthUser` / `removeAuthUser`). */
export const labShellUserRef = shallowRef<User | null>(null);

export function setLabShellUserSnapshot(user: User | null): void {
  labShellUserRef.value = user;
}
