import type { User } from '@/shared/types/user';

const DEFAULT_TEST_USER_TIMESTAMPS = {
  lastSeen: '2020-01-01T00:00:00.000Z',
  createdAt: '2020-01-01T00:00:00.000Z',
};

/** Minimal valid `User` for backend integration tests. */
export function makeTestUser(partial: Partial<User> & Pick<User, 'userId' | 'role'>): User {
  return {
    status: 'active',
    ...DEFAULT_TEST_USER_TIMESTAMPS,
    ...partial,
  };
}
