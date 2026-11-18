import { describe, expect, test } from '@jest/globals';
import type { User } from '@/shared/types/user';
import {
  evaluateAppScopedMcpToolAccess,
  resolveTargetAppIdsFromToolParams,
  userCanUpdateApp,
} from '@/shared/services/mcp-app-authorization';

const memberUser: User = {
  id: 2,
  userId: 2,
  email: 'member@test',
  name: 'Member',
  role: 'member',
  status: 'active',
  lastSeen: '2020-01-01T00:00:00.000Z',
  createdAt: '2020-01-01T00:00:00.000Z',
  permissions: {
    global: {},
    app: [{ appId: 'app-lab-crm', canUpdate: true }],
  },
};

describe('mcp-app-authorization', () => {
  test('resolveTargetAppIdsFromToolParams from path', () => {
    expect(
      resolveTargetAppIdsFromToolParams('update_file_update_file', {
        filePath: 'src/apps/app-lab-crm/back-end/x.ts',
      }),
    ).toEqual(['app-lab-crm']);
  });

  test('userCanUpdateApp respects app permissions', () => {
    expect(userCanUpdateApp(memberUser, 'app-lab-crm')).toBe(true);
    expect(userCanUpdateApp(memberUser, 'other')).toBe(false);
  });

  test('evaluateAppScopedMcpToolAccess denies unknown app', () => {
    const result = evaluateAppScopedMcpToolAccess(memberUser, 'create_file', {
      path: 'src/apps/app-lab-helpdesk/x.ts',
    });
    expect(result.allowed).toBe(false);
  });

  test('evaluateAppScopedMcpToolAccess allows permitted app', () => {
    const result = evaluateAppScopedMcpToolAccess(memberUser, 'create_file', {
      path: 'src/apps/app-lab-crm/x.ts',
    });
    expect(result.allowed).toBe(true);
  });
});
