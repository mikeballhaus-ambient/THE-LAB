import type { User } from '@/shared/types/user';

export function toPublicUser(user: User): User {
  const { passwordHash, ...rest } = user;
  void passwordHash;
  return rest as User;
}
