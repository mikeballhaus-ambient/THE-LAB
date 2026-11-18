import { describe, expect, test } from '@jest/globals';
import type { User } from '@/shared/types/user';
import {
  filterPlatformUsers,
  searchPlatformUserLookup,
  toPlatformUserPublic,
  userHasAppAccess,
} from '@/backend/db/Auth/platform-user-query';
import { LAB_PLATFORM_SYSTEM_USER_ID } from '@/shared/config/lab-platform-system-user';
import { parsePlatformUserShowSystemUserFlag } from '@/shared/types/platform-users';

function mockUser(overrides: Partial<User> & { userId: number }): User {
  return {
    userId: overrides.userId,
    name: overrides.name ?? `User ${overrides.userId}`,
    email: overrides.email ?? `u${overrides.userId}@test.local`,
    role: overrides.role ?? 'member',
    status: overrides.status ?? 'active',
    lastSeen: '2026-01-01T00:00:00.000Z',
    createdAt: '2026-01-01T00:00:00.000Z',
    permissions: overrides.permissions,
  };
}

describe('platform-user-query', () => {
  test('toPlatformUserPublic omits password', () => {
    const dto = toPlatformUserPublic(
      mockUser({ userId: 2, name: 'Ada', passwordHash: 'secret' } as User),
    );
    expect(dto.id).toBe(2);
    expect(dto.name).toBe('Ada');
    expect((dto as { passwordHash?: string }).passwordHash).toBeUndefined();
  });

  test('filterPlatformUsers defaults to active only', () => {
    const users = [
      mockUser({ userId: 1, status: 'active' }),
      mockUser({ userId: 2, status: 'inactive' }),
    ];
    const result = filterPlatformUsers(users, {});
    expect(result.total).toBe(1);
    expect(result.users[0].id).toBe(1);
  });

  test('filterPlatformUsers by appId uses user_app_permissions', () => {
    const users = [
      mockUser({
        userId: 1,
        permissions: { app: [{ appId: 'app-lab-crm', canLaunch: true }] },
      }),
      mockUser({
        userId: 2,
        role: 'viewer',
        permissions: {
          global: {
            canLaunchApps: false,
            canTeardownApps: false,
            canUpdateApps: false,
            canDeleteApps: false,
            canManageUsers: false,
            canViewLogs: false,
            canManageApps: false,
            canCreateApps: false,
          },
          app: [],
        },
      }),
    ];
    expect(userHasAppAccess(users[0], 'app-lab-crm')).toBe(true);
    const result = filterPlatformUsers(users, { appId: 'app-lab-crm' });
    expect(result.users.map((u) => u.id)).toEqual([1]);
  });

  test('app-scoped lookup includes members with global launch but no app row (OIDC JIT)', () => {
    const oidcMember = mockUser({
      userId: 42,
      name: 'SSO User',
      permissions: {
        global: {
          canLaunchApps: true,
          canTeardownApps: true,
          canUpdateApps: false,
          canDeleteApps: false,
          canManageUsers: false,
          canViewLogs: false,
          canManageApps: false,
          canCreateApps: false,
        },
        app: [],
      },
    });
    expect(userHasAppAccess(oidcMember, 'app-lab-tasklist')).toBe(true);
    const hits = searchPlatformUserLookup([oidcMember], '', { appId: 'app-lab-tasklist' });
    expect(hits.map((h) => h.value)).toEqual([42]);
  });

  test('viewer without app row is excluded from app-scoped lookup', () => {
    const viewer = mockUser({
      userId: 3,
      role: 'viewer',
      permissions: {
        global: {
          canLaunchApps: false,
          canTeardownApps: false,
          canUpdateApps: false,
          canDeleteApps: false,
          canManageUsers: false,
          canViewLogs: false,
          canManageApps: false,
          canCreateApps: false,
        },
        app: [],
      },
    });
    expect(userHasAppAccess(viewer, 'app-lab-tasklist')).toBe(false);
  });

  test('parsePlatformUserShowSystemUserFlag', () => {
    expect(parsePlatformUserShowSystemUserFlag(undefined)).toBe(false);
    expect(parsePlatformUserShowSystemUserFlag('true')).toBe(true);
    expect(parsePlatformUserShowSystemUserFlag('1')).toBe(true);
    expect(parsePlatformUserShowSystemUserFlag('false')).toBe(false);
  });

  test('filterPlatformUsers hides system user unless showSystemUser', () => {
    const users = [
      mockUser({ userId: 1 }),
      mockUser({ userId: LAB_PLATFORM_SYSTEM_USER_ID, name: 'THE-LAB' }),
    ];
    expect(filterPlatformUsers(users, {}).users.map((u) => u.id)).toEqual([1]);
    expect(
      filterPlatformUsers(users, { showSystemUser: true }).users.map((u) => u.id),
    ).toEqual([LAB_PLATFORM_SYSTEM_USER_ID, 1]);
  });

  test('searchPlatformUserLookup matches name and email', () => {
    // 2 is the reserved automation account, which lookups correctly refuse to offer.
    const users = [
      mockUser({ userId: 1, name: 'Alice', email: 'alice@co.test' }),
      mockUser({ userId: 3, name: 'Bob', email: 'bob@co.test' }),
    ];
    const hits = searchPlatformUserLookup(users, 'bob');
    expect(hits).toHaveLength(1);
    expect(hits[0].value).toBe(3);
    expect(hits[0].label).toContain('Bob');
  });
});
