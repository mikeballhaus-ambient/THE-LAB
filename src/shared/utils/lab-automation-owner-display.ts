import type { User } from '@/shared/types/user';

export function formatPlatformUserDisplayName(user: Pick<User, 'userId' | 'name' | 'email'>): string {
  const name = user.name?.trim();
  if (name) {
    return name;
  }
  const email = user.email?.trim();
  if (email) {
    return email;
  }
  return `User ${user.userId}`;
}

export function buildPlatformUserNameMap(users: readonly User[]): Map<number, string> {
  return new Map(users.map((user) => [user.userId, formatPlatformUserDisplayName(user)]));
}

export function labAutomationOwnerColumnLabel(
  scope: 'global' | 'user',
  ownerUserId: number | null | undefined,
  userNameById: ReadonlyMap<number, string>,
): string {
  if (scope !== 'user' || ownerUserId == null) {
    return '—';
  }
  return userNameById.get(ownerUserId) ?? `User ${ownerUserId}`;
}
