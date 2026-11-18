import { describe, expect, test } from '@jest/globals';
import type { User, UserRole } from '@/shared/types/user';
import { DEFAULT_ROLES } from '@/shared/services/RoleManager';
import { checkPermission as checkAppActionPermission } from '@/backend/middleware/auth';
import { checkPermission as checkSocketAdminPermission } from '@/backend/routes/utils/auth-routes-utils';
import type { AuthSocket } from '@/shared/types';

function buildUser(role: UserRole): User {
  return {
    userId: 10,
    id: 10,
    email: `${role}@lab.test`,
    name: role,
    role,
    status: 'active',
    lastSeen: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    permissions: DEFAULT_ROLES[role],
  };
}

function socketWithUser(user: User): AuthSocket {
  return { user } as AuthSocket;
}

describe('socket app action permissions (auth.ts checkPermission)', () => {
  test.each([
    ['owner', { launch: true, teardown: true, update: true }],
    ['admin', { launch: true, teardown: true, update: true }],
    ['member', { launch: true, teardown: true, update: false }],
    ['viewer', { launch: false, teardown: false, update: false }],
  ] as const)('role %s vs DEFAULT_ROLES', (role, expected) => {
    const user = buildUser(role);
    expect(checkAppActionPermission(user, 'launch', 'app-lab-crm').allowed).toBe(expected.launch);
    expect(checkAppActionPermission(user, 'teardown', 'app-lab-crm').allowed).toBe(expected.teardown);
    expect(checkAppActionPermission(user, 'update', 'app-lab-crm').allowed).toBe(expected.update);
  });
});

describe('socket admin permissions (auth-routes-utils checkPermission)', () => {
  test.each([
    ['owner', { manageUsers: true, launch: true }],
    ['admin', { manageUsers: true, launch: true }],
    ['member', { manageUsers: false, launch: true }],
    ['viewer', { manageUsers: false, launch: false }],
  ] as const)('role %s', (role, expected) => {
    const socket = socketWithUser(buildUser(role));
    expect(checkSocketAdminPermission(socket, 'manageUsers')).toBe(expected.manageUsers);
    expect(checkSocketAdminPermission(socket, 'launch')).toBe(expected.launch);
  });

  test('unauthenticated socket denies manageUsers', () => {
    expect(checkSocketAdminPermission({} as AuthSocket, 'manageUsers')).toBe(false);
  });
});
