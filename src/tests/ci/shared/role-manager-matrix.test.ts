import { describe, expect, test } from '@jest/globals';
import type { UserRole } from '@/shared/types/user';
import { DEFAULT_ROLES, RoleManager, roleManager } from '@/shared/services/RoleManager';

function userForRole(role: UserRole) {
  return {
    userId: 1,
    id: 1,
    email: `${role}@test`,
    name: role,
    role,
    status: 'active' as const,
    lastSeen: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    permissions: DEFAULT_ROLES[role],
  };
}

describe('DEFAULT_ROLES global matrix (IMPLEMENTATION-PLAN / RoleManager table)', () => {
  test.each([
    ['owner', { launch: true, teardown: true, update: true, delete: true, manageUsers: true }],
    ['admin', { launch: true, teardown: true, update: true, delete: false, manageUsers: true }],
    ['member', { launch: true, teardown: true, update: false, delete: false, manageUsers: false }],
    ['viewer', { launch: false, teardown: false, update: false, delete: false, manageUsers: false }],
  ] as const)('role %s global flags', (role, expected) => {
    const g = DEFAULT_ROLES[role].global!;
    expect(g.canLaunchApps).toBe(expected.launch);
    expect(g.canTeardownApps).toBe(expected.teardown);
    expect(g.canUpdateApps).toBe(expected.update);
    expect(g.canDeleteApps).toBe(expected.delete);
    expect(g.canManageUsers).toBe(expected.manageUsers);
  });
});

describe('RoleManager.canPerformAction (role gate used by some server paths)', () => {
  test.each([
    ['owner', { launch: true, teardown: true, update: true, delete: true }],
    ['admin', { launch: true, teardown: true, update: true, delete: false }],
    ['member', { launch: true, teardown: false, update: false, delete: false }],
    ['viewer', { launch: false, teardown: false, update: false, delete: false }],
  ] as const)('role %s', (role, expected) => {
    const user = userForRole(role);
    expect(roleManager.canPerformAction(user, 'launch')).toBe(expected.launch);
    expect(roleManager.canPerformAction(user, 'teardown')).toBe(expected.teardown);
    expect(roleManager.canPerformAction(user, 'update')).toBe(expected.update);
    expect(roleManager.canPerformAction(user, 'delete')).toBe(expected.delete);
  });
});

describe('RoleManager.getRolePriority', () => {
  test('orders owner above viewer', () => {
    expect(RoleManager.getRolePriority('owner')).toBeGreaterThan(RoleManager.getRolePriority('viewer'));
  });
});
