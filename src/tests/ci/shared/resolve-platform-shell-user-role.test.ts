import { describe, expect, test, beforeEach, afterEach } from '@jest/globals';
import { labShellUserRef } from '@/shared/auth/lab-shell-user-state';
import { setAuthUser, removeAuthUser } from '@/shared/types/auth';
import { resolvePlatformShellUserRole } from '@/shared/utils/resolve-platform-shell-user-role';
import type { User } from '@/shared/types/user';

describe('resolvePlatformShellUserRole', () => {
  const adminUser: User = {
    userId: 1,
    role: 'admin',
    status: 'active',
    lastSeen: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };

  beforeEach(() => {
    const store = new Map<string, string>();
    Object.defineProperty(globalThis, 'window', {
      value: globalThis,
      configurable: true,
    });
    Object.defineProperty(globalThis, 'localStorage', {
      value: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => store.set(key, value),
        removeItem: (key: string) => store.delete(key),
        clear: () => store.clear(),
      },
      configurable: true,
    });
    removeAuthUser();
    labShellUserRef.value = null;
  });

  afterEach(() => {
    removeAuthUser();
    labShellUserRef.value = null;
  });

  test('prefers injected role over localStorage', () => {
    setAuthUser({ ...adminUser, role: 'member' });
    expect(resolvePlatformShellUserRole('owner')).toBe('owner');
  });

  test('falls back to localStorage auth user', () => {
    setAuthUser(adminUser);
    expect(resolvePlatformShellUserRole(null)).toBe('admin');
  });
});
